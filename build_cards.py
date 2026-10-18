#!/usr/bin/env python3
"""Build cards.json (public shop data) from the tracker export.

Usage: python3 build_cards.py tracker_docs.json [cards.json]
  tracker_docs.json = list of {"id","version","data"} (or plain card objects) exactly as read from the Sales tracker.
Only cards with status "listed" are published, and only the public fields below (no costs, sales, photos blobs, notes).
"""
import json, sys
from datetime import datetime, timezone

KEEP = ["name", "number", "set", "rarity", "condition", "grader", "grade", "kind", "productType", "photos", "listPrice", "ebayUrl",
        "photoUrl", "backPhotoUrl", "listedAt", "listedDate", "ebayItemId"]

def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "cards.json"
    docs = json.load(open(src))
    cards = []
    for d in docs:
        c = d.get("data", d)
        if c.get("status") != "listed" or not c.get("ebayUrl"):
            continue
        cards.append({k: c[k] for k in KEEP if c.get(k) not in (None, "")})
    cards.sort(key=lambda c: c.get("listedAt") or "", reverse=True)
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "cards": cards}
    json.dump(out, open(dst, "w"), separators=(",", ":"))
    print(f"{len(cards)} listed card(s) written to {dst}")

if __name__ == "__main__":
    main()
