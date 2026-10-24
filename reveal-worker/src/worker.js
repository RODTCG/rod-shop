// ROD TCG mystery reveal: one-time codes, a provably fair shuffled pool, a public reveal log.
// Cloudflare Worker + one SQLite-backed Durable Object (free plan). The Durable Object handles every
// request one at a time with synchronous SQL, so two buyers can never draw the same card.
//
// The public reveal page itself is a static page on the shop site (reveal/index.html in the repo root,
// served at REVEAL_URL); it calls the public API below across origins, allowed by ALLOWED_ORIGINS.
// Public:  GET /            redirects to REVEAL_URL (keeps ?code=)
//          GET /api/status  open pools (cards left, fingerprint) + recent reveals
//          POST /api/redeem {code}  -> the next card in the pool (a used code shows its card again)
//          GET /api/proof/:id  salt + full order of a sold-out pool, to check against its fingerprint
// Admin (Authorization: Bearer <ADMIN_SECRET>):
//          GET /admin       admin page (make codes, load pools, see what to ship)
//          POST /api/admin/pool    {tier, items:[{name,set,number,grader,grade,photo}]}
//          POST /api/admin/codes   {tier, order, count, note}
//          GET  /api/admin/overview
//          POST /api/admin/shipped {item_id}
//          POST /api/admin/pool/delete {pool_id}   (only before anything from it is revealed)
//          POST /api/admin/test/clear     deletes every test pool, test card and test code
// Test mode: pools and codes made with {test:true} form a separate world. Test codes draw only from test pools,
// real codes never do, test pools have their own numbering, and nothing test appears on the public page.

import { DurableObject } from "cloudflare:workers";
import { ADMIN_HTML } from "./pages.js";

export const TIERS = {
  slab: { name: "Mystery Slab", price: 50 },
  hit: { name: "Mystery Hit", price: 15 },
};
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const MAX_FAILS = 10, FAIL_WINDOW_MS = 10 * 60 * 1000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const html = (body) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
    "x-frame-options": "SAMEORIGIN", "referrer-policy": "no-referrer" } });

function randInt(n) {            // uniform 0..n-1 from crypto, no modulo bias
  const lim = Math.floor(0x100000000 / n) * n;
  const b = new Uint32Array(1);
  do crypto.getRandomValues(b); while (b[0] >= lim);
  return b[0] % n;
}
export function makeCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randInt(CODE_ALPHABET.length)];
  return `ROD-${s.slice(0, 4)}-${s.slice(4)}`;
}
export function normCode(c) {
  const s = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^ROD/, "");
  return s.length === 8 ? `ROD-${s.slice(0, 4)}-${s.slice(4)}` : null;
}
function hex(bytes) { return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
export async function sha256(text) { return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))); }
// The fingerprint covers the salt and the full shuffled order; the salt stays secret until the pool sells out.
export function proofText(salt, list) { return salt + "|" + JSON.stringify(list); }
function clean(v, max = 200) { return v == null ? null : String(v).trim().slice(0, max) || null; }
function safeEq(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export class RevealStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.fails = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS pools (id INTEGER PRIMARY KEY, tier TEXT NOT NULL, no INTEGER NOT NULL,
        status TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, total INTEGER NOT NULL, created_at TEXT NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, pool_id INTEGER NOT NULL, position INTEGER NOT NULL,
        name TEXT, set_name TEXT, number TEXT, grader TEXT, grade TEXT, photo TEXT,
        code TEXT, order_ref TEXT, revealed_at TEXT, shipped_at TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS codes (code TEXT PRIMARY KEY, tier TEXT NOT NULL, order_ref TEXT, note TEXT,
        created_at TEXT NOT NULL, used_at TEXT, item_id INTEGER)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS items_draw ON items (pool_id, code, position)`);
    // Upgrade databases made before test mode existed: existing pools and codes are real (test = 0).
    for (const t of ["pools", "codes"]) {
      try { this.sql.exec(`ALTER TABLE ${t} ADD COLUMN test INTEGER NOT NULL DEFAULT 0`); }
      catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; }
    }
  }
  rows(q, ...b) { return this.sql.exec(q, ...b).toArray(); }
  now() { return new Date().toISOString(); }
  left(poolId) { return this.rows("SELECT COUNT(*) AS n FROM items WHERE pool_id=? AND code IS NULL", poolId)[0].n; }
  card(it, tier, test) {
    return { name: it.name, set: it.set_name, number: it.number, grader: it.grader, grade: it.grade, photo: it.photo,
             tier, tierName: TIERS[tier]?.name || tier, order: it.order_ref ? "…" + String(it.order_ref).slice(-4) : null,
             revealedAt: it.revealed_at, test: !!test };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname, m = request.method;
    const body = m === "POST" ? await request.json().catch(() => ({})) : {};
    try {
      if (p === "/api/status" && m === "GET") return json(this.status());
      if (p === "/api/redeem" && m === "POST") return this.redeem(body.code, request.headers.get("cf-connecting-ip") || "?");
      if (p.startsWith("/api/proof/") && m === "GET") return this.proof(Number(p.split("/").pop()));
      if (p === "/api/admin/pool" && m === "POST") return json(await this.addPool(body));
      if (p === "/api/admin/codes" && m === "POST") return json(this.addCodes(body, url.origin));
      if (p === "/api/admin/overview" && m === "GET") return json(this.overview());
      if (p === "/api/admin/shipped" && m === "POST") return json(this.shipped(body.item_id, body.undo));
      if (p === "/api/admin/pool/delete" && m === "POST") return json(this.deletePool(body.pool_id));
      if (p === "/api/admin/test/clear" && m === "POST") return json(this.clearTest());
      return json({ error: "not_found" }, 404);
    } catch (e) {
      if (e instanceof UserError) return json({ error: e.message }, 400);
      throw e;
    }
  }

  status() {
    const pools = this.rows("SELECT * FROM pools WHERE test=0 ORDER BY tier, no").map((x) => ({
      id: x.id, tier: x.tier, tierName: TIERS[x.tier]?.name || x.tier, price: TIERS[x.tier]?.price ?? null, no: x.no,
      status: x.status, total: x.total, left: this.left(x.id), hash: x.hash }));
    const log = this.rows(`SELECT i.*, p.tier FROM items i JOIN pools p ON p.id=i.pool_id WHERE i.code IS NOT NULL AND p.test=0
        ORDER BY i.revealed_at DESC LIMIT 30`).map((it) => this.card(it, it.tier));
    return { tiers: TIERS, pools, log };
  }

  redeem(raw, ip) {
    const t = Date.now();
    const f = (this.fails.get(ip) || []).filter((x) => t - x < FAIL_WINDOW_MS);
    if (f.length >= MAX_FAILS) return json({ error: "too_many_tries" }, 429);
    const code = normCode(raw);
    const c = code && this.rows("SELECT * FROM codes WHERE code=?", code)[0];
    if (!c) { f.push(t); this.fails.set(ip, f); return json({ error: "invalid_code" }, 404); }
    if (c.item_id) {
      const it = this.rows("SELECT * FROM items WHERE id=?", c.item_id)[0];
      return json({ card: this.card(it, c.tier, c.test), already: true });
    }
    const it = this.rows(`SELECT i.* FROM items i JOIN pools p ON p.id=i.pool_id
        WHERE p.tier=? AND p.test=? AND p.status='open' AND i.code IS NULL ORDER BY p.no, i.position LIMIT 1`, c.tier, c.test ? 1 : 0)[0];
    if (!it) return json({ error: "sold_out" }, 409);   // the code stays unused; it works once a new pool is loaded
    const now = this.now();
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("UPDATE items SET code=?, order_ref=?, revealed_at=? WHERE id=?", code, c.order_ref, now, it.id);
      this.sql.exec("UPDATE codes SET used_at=?, item_id=? WHERE code=?", now, it.id, code);
      if (this.left(it.pool_id) === 0) this.sql.exec("UPDATE pools SET status='sold_out' WHERE id=?", it.pool_id);
    });
    return json({ card: this.card({ ...it, order_ref: c.order_ref, revealed_at: now }, c.tier, c.test), already: false });
  }

  proof(id) {
    const pool = this.rows("SELECT * FROM pools WHERE id=?", id)[0];
    if (!pool || pool.test) return json({ error: "not_found" }, 404);
    if (pool.status !== "sold_out") return json({ error: "not_sold_out", left: this.left(id) }, 403);
    const list = this.rows("SELECT * FROM items WHERE pool_id=? ORDER BY position", id).map(listEntry);
    return json({ pool: id, tier: pool.tier, no: pool.no, hash: pool.hash, salt: pool.salt, order: list,
      check: "sha256(salt + '|' + JSON.stringify(order)) must equal hash" });
  }

  async addPool(b) {
    const tier = String(b.tier || "");
    if (!TIERS[tier]) throw new UserError("unknown_tier");
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length || items.length > 1000) throw new UserError("need_1_to_1000_items");
    const cards = items.map((x) => ({ name: clean(x.name), set: clean(x.set), number: clean(x.number, 40),
      grader: clean(x.grader, 20), grade: clean(x.grade, 20), photo: clean(x.photo, 600) }));
    if (cards.some((c) => !c.name)) throw new UserError("every_item_needs_a_name");
    for (let i = cards.length - 1; i > 0; i--) { const j = randInt(i + 1); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    const salt = hex(crypto.getRandomValues(new Uint8Array(32)));
    const list = cards.map((c, i) => listEntry({ position: i + 1, name: c.name, set_name: c.set, number: c.number, grader: c.grader, grade: c.grade }));
    const hash = await sha256(proofText(salt, list));
    const test = b.test ? 1 : 0;
    const no = (this.rows("SELECT MAX(no) AS n FROM pools WHERE tier=? AND test=?", tier, test)[0].n || 0) + 1;
    let id;
    this.ctx.storage.transactionSync(() => {
      id = this.rows(`INSERT INTO pools (tier, no, status, salt, hash, total, created_at, test) VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
        tier, no, "open", salt, hash, cards.length, this.now(), test)[0].id;
      cards.forEach((c, i) => this.sql.exec(`INSERT INTO items (pool_id, position, name, set_name, number, grader, grade, photo)
          VALUES (?,?,?,?,?,?,?,?)`, id, i + 1, c.name, c.set, c.number, c.grader, c.grade, c.photo));
    });
    return { pool_id: id, tier, no, total: cards.length, hash, test: !!test };
  }

  addCodes(b, origin) {
    const tier = String(b.tier || "");
    if (!TIERS[tier]) throw new UserError("unknown_tier");
    const n = Math.min(Math.max(parseInt(b.count, 10) || 1, 1), 50);
    const order = clean(b.order, 60), note = clean(b.note, 200), now = this.now(), test = b.test ? 1 : 0;
    const out = [];
    while (out.length < n) {
      const code = makeCode();
      if (this.rows("SELECT 1 FROM codes WHERE code=?", code).length) continue;
      this.sql.exec("INSERT INTO codes (code, tier, order_ref, note, created_at, test) VALUES (?,?,?,?,?,?)", code, tier, order, note, now, test);
      out.push(code);
    }
    const where = (this.env.REVEAL_URL || origin).replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const name = TIERS[tier].name;
    const message = `Thanks for your order! Your ${name} reveal code${n > 1 ? "s are " : " is "}${out.join(", ")}. ` +
      `Enter ${n > 1 ? "each one" : "it"} at ${where} to see your card. It ships tracked the next business day after you reveal it.`;
    return { tier, order, codes: out, message, test: !!test };
  }

  overview() {
    const pools = this.rows("SELECT * FROM pools ORDER BY tier, no").map((x) => ({
      id: x.id, tier: x.tier, tierName: TIERS[x.tier]?.name, no: x.no, status: x.status, total: x.total, test: !!x.test,
      left: this.left(x.id), hash: x.hash,
      // unrevealed cards sorted by name, never by draw position, so the admin page doesn't show who gets what next
      remaining: this.rows("SELECT name, set_name, number, grader, grade FROM items WHERE pool_id=? AND code IS NULL ORDER BY name, number", x.id) }));
    const revealed = this.rows(`SELECT i.id, i.name, i.set_name, i.number, i.grader, i.grade, i.code, i.order_ref, i.revealed_at,
        i.shipped_at, p.tier, p.test FROM items i JOIN pools p ON p.id=i.pool_id WHERE i.code IS NOT NULL ORDER BY i.revealed_at DESC LIMIT 500`);
    const unused = this.rows("SELECT code, tier, order_ref, note, created_at, test FROM codes WHERE item_id IS NULL ORDER BY created_at DESC");
    const testCount = {
      pools: this.rows("SELECT COUNT(*) AS n FROM pools WHERE test=1")[0].n,
      codes: this.rows("SELECT COUNT(*) AS n FROM codes WHERE test=1")[0].n };
    return { pools, revealed, unused, testCount };
  }

  shipped(id, undo) {
    const r = this.sql.exec("UPDATE items SET shipped_at=? WHERE id=? AND code IS NOT NULL", undo ? null : this.now(), Number(id));
    if (!r.rowsWritten) throw new UserError("not_revealed_or_missing");
    return { ok: true };
  }

  clearTest() {
    const pools = this.rows("SELECT COUNT(*) AS n FROM pools WHERE test=1")[0].n;
    const codes = this.rows("SELECT COUNT(*) AS n FROM codes WHERE test=1")[0].n;
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM items WHERE pool_id IN (SELECT id FROM pools WHERE test=1)");
      this.sql.exec("DELETE FROM pools WHERE test=1");
      this.sql.exec("DELETE FROM codes WHERE test=1");
    });
    return { ok: true, pools, codes };
  }

  deletePool(id) {
    const pool = this.rows("SELECT * FROM pools WHERE id=?", Number(id))[0];
    if (!pool) throw new UserError("not_found");
    if (pool.total !== this.left(pool.id)) throw new UserError("pool_has_reveals");
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM items WHERE pool_id=?", pool.id);
      this.sql.exec("DELETE FROM pools WHERE id=?", pool.id);
    });
    return { ok: true };
  }
}

class UserError extends Error {}
function listEntry(it) {
  return { p: it.position, name: it.name, set: it.set_name ?? null, number: it.number ?? null, grader: it.grader ?? null, grade: it.grade ?? null };
}

// Public API routes the shop's reveal page may call from another origin. Admin routes are never cross-origin.
const PUBLIC_API = (p) => p === "/api/status" || p === "/api/redeem" || p.startsWith("/api/proof/");
function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST, OPTIONS",
           "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "Origin" };
}
function withHeaders(res, extra) {
  if (!extra) return res;
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (request.method === "GET" && (p === "/" || p === "/reveal")) {
      if (!env.REVEAL_URL) return new Response("Reveal page not configured", { status: 404 });
      const to = new URL(env.REVEAL_URL);
      const code = url.searchParams.get("code");
      if (code) to.searchParams.set("code", code);
      return Response.redirect(to.toString(), 302);
    }
    if (request.method === "GET" && p === "/admin") return html(ADMIN_HTML);
    if (!p.startsWith("/api/")) return new Response("Not found", { status: 404 });
    const cors = PUBLIC_API(p) ? corsHeaders(request, env) : null;
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (p.startsWith("/api/admin/")) {
      const auth = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (!env.ADMIN_SECRET || env.ADMIN_SECRET.length < 12 || !safeEq(auth, env.ADMIN_SECRET)) return json({ error: "unauthorized" }, 401);
    }
    const stub = env.REVEAL.get(env.REVEAL.idFromName("main"));
    return withHeaders(await stub.fetch(request), cors);
  },
};
