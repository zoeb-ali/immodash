"""Render the About-page hero background from a city's Zensus 100 m rent grid (web/public/data/grid/<ags>.json).

Writes a light-theme and a dark-theme WebP with a transparent background; dearer squares are stronger blue.
Usage: python scripts/render_hero_grid.py [ags]   (default 11000 = Berlin)
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "web" / "public"
ags = sys.argv[1] if len(sys.argv) > 1 else "11000"
g = json.loads((ROOT / "data" / "grid" / f"{ags}.json").read_text())
r, S = g["resolution_m"], 4  # 4 px per 100 m square, 1 px gap
pts = [(x, y, v) for x, y, v, low in zip(g["x"], g["y"], g["rent_eur_sqm"], g["low_reliability"]) if not low]
x0, y1 = min(p[0] for p in pts), max(p[1] for p in pts)
W = int((max(p[0] for p in pts) - x0) / r + 1) * S
H = int((y1 - min(p[1] for p in pts)) / r + 1) * S
vals = sorted(p[2] for p in pts)
lo, hi = vals[int(0.02 * len(vals))], vals[int(0.98 * len(vals))]


def render(c0, c1, a0, a1, name):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = im.load()
    for x, y, v in pts:
        t = max(0.0, min(1.0, (v - lo) / (hi - lo)))
        col = tuple(int(a + (b - a) * t) for a, b in zip(c0, c1)) + (int(a0 + (a1 - a0) * t),)
        cx, cy = int((x - x0) / r) * S, int((y1 - y) / r) * S
        for i in range(S - 1):
            for j in range(S - 1):
                px[cx + i, cy + j] = col
    im.save(ROOT / "img" / name, "WEBP", quality=82, method=6)


render((45, 100, 210), (150, 200, 255), 110, 255, "berlin-rent-grid-dark.webp")
render((150, 185, 240), (20, 70, 170), 120, 255, "berlin-rent-grid-light.webp")
print(f"{len(pts)} squares, {W}x{H} px")
