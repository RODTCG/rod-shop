# ROD TCG mystery reveal

The server behind **shop.rod-tcg.com/reveal**, the page buyers use after buying a **Mystery Hit ($15)** or
**Mystery Slab ($50)** on eBay: they enter a one-time code and get the next card from a pool that was shuffled and
locked in advance. The public page itself is `reveal/index.html` on the shop site; it calls this server's public API
(allowed by `ALLOWED_ORIGINS` in `wrangler.toml`). The admin page stays on this server.

It runs on Cloudflare Workers (free plan) with one SQLite-backed Durable Object, so every redeem is handled one at a
time and two buyers can never draw the same card. It is deployed by `.github/workflows/deploy-reveal.yml`
when a push to `main` changes `reveal-worker/` or `reveal/`. It does not touch `cards.json`.

## Pages

- `https://shop.rod-tcg.com/reveal/` — public reveal page (`reveal/index.html`): code entry, card flip, cards left
  in each pool, each pool's fingerprint, the reveal log. `?code=ROD-XXXX-XXXX` pre-fills a code.
- `https://rod-reveal.rodtcg.workers.dev/` — forwards to the shop page (keeping `?code=`).
- `https://rod-reveal.rodtcg.workers.dev/admin` — password-protected (the `REVEAL_ADMIN_PASSWORD` secret):
  1. **Make a code for a sale**: type + eBay order number + quantity → codes and a message to paste into eBay messages.
  2. **Ship these**: every revealed card with its order number, and a Mark shipped button.
  3. **Load a new pool**: paste one card per line (`name, set, number, grader, grade, photo URL`), shuffle and lock.
  Plus pools (with the cards still in them, listed A–Z so you can't see who gets what next) and unused codes.

## Test mode

Tick **Test pool** when loading a pool and **Test code** when making a code. Test codes draw only from test pools and
real codes never do; test pools have their own numbering; test reveals are labelled TEST on the reveal page and never
appear in the public status, log or proofs. **Clear test data** on the admin page deletes every test pool, test card
and test code, leaving real data untouched.

## How the fair draw works

When a pool is loaded it is shuffled with a cryptographic random generator, and
`sha256(salt + "|" + JSON of the full order)` is published on the public page before any sale. Each code reveals the
next card in that order. When the pool sells out, its salt and order become public (`/api/proof/<pool id>`) and the
page's **Verify this pool** button recomputes the hash in the buyer's browser.

## Rules worth knowing

- A code belongs to one type (hit or slab). A used code shows its same card again; it never draws twice.
- If a pool runs out, codes stay unused and work as soon as the next pool for that type is loaded.
- A new pool for a type starts after the earlier one sells out.
- A pool can be deleted only before anything from it is revealed.
- 10 wrong codes from one address in 10 minutes locks that address out for a while.
- The public page shows only the last 4 digits of an order number, never codes.

## Local use

```
npm ci
npm test            # 21 checks against node:sqlite, no Cloudflare needed
echo 'ADMIN_SECRET=some-long-password' > .dev.vars && npm run dev   # http://localhost:8787
```
