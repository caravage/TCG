#!/usr/bin/env python3
"""Precomputes a subject cut-out (alpha mask) for every portrait card.

Reads public/cards.json, downloads each portrait illustration, runs rembg (U²-Net) on it
and writes public/masks/<id>.png: a small PNG whose alpha is the subject. Cards with a
usable mask get "m": 1, which enables the masked variants (Holo de fond, Silhouette dorée).

Existing masks are kept, so reruns only process new cards.
Usage: pip install "rembg[cpu]" pillow && python scripts/build-masks.py
"""
import io
import json
import os
import sys
import time
import urllib.request

from PIL import Image, ImageStat
from rembg import new_session, remove

CARDS = "public/cards.json"
OUT = "public/masks"
WIDTH = 240
UA = "HistoriaTCG/0.1 (https://github.com/caravage/TCG; mask builder)"


def download(url: str) -> Image.Image:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** (attempt + 1))
    raise RuntimeError("unreachable")


def main() -> None:
    data = json.load(open(CARDS, encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    session = new_session("u2net")
    portraits = [c for c in data["cards"] if c.get("k") == "p"]
    made = skipped = failed = 0
    t0 = time.time()
    for i, c in enumerate(portraits, 1):
        path = f"{OUT}/{c['id']}.png"
        if not os.path.exists(path) and not os.path.exists(path + ".skip"):
            try:
                img = download(c["img"])
                mask = remove(img, session=session, only_mask=True, post_process_mask=True).convert("L")
                coverage = ImageStat.Stat(mask).mean[0] / 255
                if 0.04 < coverage < 0.9:
                    small = mask.resize((WIDTH, max(1, round(WIDTH * img.height / img.width))), Image.LANCZOS)
                    out = Image.new("LA", small.size, 0)
                    out.putalpha(small)
                    out.save(path, optimize=True)
                    made += 1
                else:
                    # No clear subject (landscape painting, map…): remember and move on.
                    open(path + ".skip", "w").close()
                    skipped += 1
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"  ! {c['t']}: {e}", file=sys.stderr)
        if i % 100 == 0:
            print(f"  … {i}/{len(portraits)} ({time.time() - t0:.0f}s)", flush=True)

    for c in data["cards"]:
        if c.get("k") == "p" and os.path.exists(f"{OUT}/{c['id']}.png"):
            c["m"] = 1
        else:
            c.pop("m", None)
    with open(CARDS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    total = sum(1 for c in data["cards"] if c.get("m"))
    print(f"masks: {made} new, {skipped} without clear subject, {failed} failed — {total} cards masked")


if __name__ == "__main__":
    main()
