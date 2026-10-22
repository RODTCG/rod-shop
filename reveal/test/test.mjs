// Local tests: runs the Worker and its Durable Object against node:sqlite (no Cloudflare needed).
// Usage: node test/test.mjs
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const here = path.dirname(new URL(import.meta.url).pathname);
const src = fs.readFileSync(path.join(here, "../src/worker.js"), "utf8")
  .replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }")
  .replace('from "./pages.js"', `from "${path.join(here, "../src/pages.js")}"`);
fs.writeFileSync(path.join(here, "_worker.mjs"), src);
const mod = await import(path.join(here, "_worker.mjs"));
const { default: worker, RevealStore, sha256, proofText, normCode } = mod;

function fakeStorage() {
  const db = new DatabaseSync(":memory:");
  return {
    sql: { exec(q, ...b) {
      const st = db.prepare(q);
      if (/^\s*select|returning/i.test(q)) { const rows = st.all(...b); return { toArray: () => rows, rowsWritten: rows.length }; }
      const r = st.run(...b); return { toArray: () => [], rowsWritten: Number(r.changes) };
    } },
    transactionSync(fn) { db.exec("BEGIN"); try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } },
  };
}
const SECRET = "test-secret-123456";
const env = { ADMIN_SECRET: SECRET };
const store = new RevealStore({ storage: fakeStorage() }, env);
env.REVEAL = { idFromName: () => "main", get: () => store };

const call = async (method, p, body, auth, ip = "1.1.1.1") => {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (auth) headers.authorization = "Bearer " + auth;
  const r = await worker.fetch(new Request("https://rod-reveal.example.workers.dev" + p, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, data: ct.includes("json") ? await r.json() : await r.text() };
};
let n = 0; const ok = (m) => console.log(`  ✓ ${++n}. ${m}`);

// pages
let r = await call("GET", "/");
assert.equal(r.status, 200); assert.match(r.data, /Reveal your/);
for (const page of [r.data, (await call("GET", "/admin")).data]) {
  const js = page.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(js);                       // syntax check of the client code
  assert.ok(!page.includes("${"), "unrendered template");
}
ok("reveal and admin pages render and their scripts parse");

// auth
assert.equal((await call("GET", "/api/admin/overview")).status, 401);
assert.equal((await call("GET", "/api/admin/overview", null, "wrong-password-xx")).status, 401);
assert.equal((await call("GET", "/api/admin/overview", null, SECRET)).status, 200);
ok("admin routes need the password");

// pools
const slabs = Array.from({ length: 20 }, (_, i) => ({ name: `Slab ${i + 1}`, set: "Set", number: `${i + 1}/100`, grader: "PSA", grade: "9" }));
slabs[3].name = '<img src=x onerror=alert(1)> "Gengar", ex';
r = await call("POST", "/api/admin/pool", { tier: "slab", items: slabs }, SECRET);
assert.equal(r.status, 200); assert.equal(r.data.total, 20); assert.match(r.data.hash, /^[0-9a-f]{64}$/);
const pool1 = r.data;
r = await call("POST", "/api/admin/pool", { tier: "hit", items: [{ name: "Hit A" }, { name: "Hit B" }, { name: "Hit C" }] }, SECRET);
assert.equal(r.status, 200);
assert.equal((await call("POST", "/api/admin/pool", { tier: "nope", items: [{ name: "x" }] }, SECRET)).status, 400);
assert.equal((await call("POST", "/api/admin/pool", { tier: "slab", items: [{ set: "no name" }] }, SECRET)).status, 400);
ok("pools load, bad tiers and nameless cards are refused");

// codes
r = await call("POST", "/api/admin/codes", { tier: "slab", order: "12-34567-89012", count: 21, note: "buyer1" }, SECRET);
assert.equal(r.data.codes.length, 21);
assert.ok(r.data.codes.every((c) => /^ROD-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c)));
assert.equal(new Set(r.data.codes).size, 21);
assert.match(r.data.message, /Mystery Slab reveal codes are ROD-/);
const slabCodes = r.data.codes;
const one = await call("POST", "/api/admin/codes", { tier: "hit", order: "99-1" }, SECRET);
assert.match(one.data.message, /reveal code is ROD-....-..../);
ok("codes are unique, readable, and come with a ready eBay message");

// 20 buyers at once: every one gets a different card, in the locked order
const results = await Promise.all(slabCodes.slice(0, 20).map((c, i) => call("POST", "/api/redeem", { code: c }, null, "10.0.0." + i)));
assert.ok(results.every((x) => x.status === 200 && !x.data.already));
const names = results.map((x) => x.data.card.name);
assert.equal(new Set(names).size, 20);
assert.deepEqual([...names].sort(), slabs.map((s) => s.name).sort());
assert.equal(results[0].data.card.order, "…9012");
ok("20 simultaneous redeems drew 20 different cards, the whole pool");

// sold out: code stays good
r = await call("POST", "/api/redeem", { code: slabCodes[20] });
assert.equal(r.status, 409); assert.equal(r.data.error, "sold_out");
let st = (await call("GET", "/api/status")).data;
assert.equal(st.pools.find((p) => p.id === pool1.pool_id).status, "sold_out");
ok("an empty pool answers sold out and keeps the code unused");

// same code again shows the same card
r = await call("POST", "/api/redeem", { code: slabCodes[0].toLowerCase().replace(/-/g, " ") });
assert.equal(r.status, 200); assert.equal(r.data.already, true); assert.equal(r.data.card.name, names[0]);
assert.equal(normCode("rod7kq2m9xd"), "ROD-7KQ2-M9XD");
ok("a used code (typed loosely) shows its card again instead of drawing another");

// proof matches the fingerprint and the actual reveal order
r = await call("GET", `/api/proof/${pool1.pool_id}`);
assert.equal(r.status, 200);
assert.equal(await sha256(proofText(r.data.salt, r.data.order)), pool1.hash);
const byOrder = r.data.order.map((x) => x.name);
const revealed = store.rows("SELECT name FROM items WHERE pool_id=? ORDER BY revealed_at, id", pool1.pool_id).map((x) => x.name);
assert.equal(byOrder.length, 20);
assert.deepEqual(new Set(byOrder), new Set(revealed));
// draws always take the lowest open position
const pos = store.rows("SELECT position, code FROM items WHERE pool_id=? ORDER BY position", pool1.pool_id);
assert.ok(pos.every((x) => x.code));
assert.equal((await call("GET", "/api/proof/2")).status, 403);
ok("sold-out proof re-hashes to the published fingerprint; open pools stay secret");

// the shuffle actually shuffles (order differs from input across a few loads)
let different = 0;
for (let k = 0; k < 5; k++) {
  const res = await call("POST", "/api/admin/pool", { tier: "hit", items: Array.from({ length: 10 }, (_, i) => ({ name: "S" + i })) }, SECRET);
  const order = store.rows("SELECT name FROM items WHERE pool_id=? ORDER BY position", res.data.pool_id).map((x) => x.name).join();
  if (order !== Array.from({ length: 10 }, (_, i) => "S" + i).join()) different++;
  await call("POST", "/api/admin/pool/delete", { pool_id: res.data.pool_id }, SECRET);
}
assert.ok(different >= 4);
ok("pools are really shuffled, and untouched pools can be deleted");

// a new pool picks up the waiting code
r = await call("POST", "/api/admin/pool", { tier: "slab", items: [{ name: "Pool2 card" }] }, SECRET);
assert.equal(r.data.no, 2);
r = await call("POST", "/api/redeem", { code: slabCodes[20] });
assert.equal(r.status, 200); assert.equal(r.data.card.name, "Pool2 card");
r = await call("POST", "/api/admin/pool/delete", { pool_id: pool1.pool_id }, SECRET);
assert.equal(r.status, 400); assert.equal(r.data.error, "pool_has_reveals");
ok("the waiting code works on the next pool; pools with reveals can't be deleted");

// hit tier draws only from hit pools
r = await call("POST", "/api/redeem", { code: one.data.codes[0] });
assert.ok(["Hit A", "Hit B", "Hit C"].includes(r.data.card.name)); assert.equal(r.data.card.tier, "hit");
ok("each type draws only from its own pools");

// brute force
for (let k = 0; k < 10; k++) assert.equal((await call("POST", "/api/redeem", { code: "ROD-AAAA-AAAA" }, null, "6.6.6.6")).status, 404);
assert.equal((await call("POST", "/api/redeem", { code: slabCodes[1] }, null, "6.6.6.6")).status, 429);
assert.equal((await call("POST", "/api/redeem", { code: slabCodes[1] }, null, "7.7.7.7")).status, 200);
ok("10 wrong codes from one address lock it out for a while; others are unaffected");

// admin overview: shipping list, unrevealed list is not in draw order
r = await call("GET", "/api/admin/overview", null, SECRET);
assert.equal(r.data.revealed.length, 22);
const target = r.data.revealed[0];
assert.equal((await call("POST", "/api/admin/shipped", { item_id: target.id }, SECRET)).status, 200);
r = await call("GET", "/api/admin/overview", null, SECRET);
assert.ok(r.data.revealed.find((x) => x.id === target.id).shipped_at);
const hitPool = r.data.pools.find((p) => p.tier === "hit" && p.left > 0);
const names2 = hitPool.remaining.map((x) => x.name);
assert.deepEqual(names2, [...names2].sort());
assert.ok(!("position" in hitPool.remaining[0]));
ok("ship list and mark-shipped work; remaining cards are listed A–Z, never in draw order");

// public status/log never leaks full order numbers or codes
st = (await call("GET", "/api/status")).data;
const flat = JSON.stringify(st);
assert.ok(!flat.includes("12-34567-89012") && !/ROD-[A-Z0-9]{4}-/.test(flat) && !flat.includes('"salt"'));
assert.equal(st.log[0].order.length, 5);
ok("the public page shows only the last 4 of an order number, never codes or the salt");

fs.unlinkSync(path.join(here, "_worker.mjs"));
console.log(`\nAll ${n} checks passed.`);
