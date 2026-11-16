"""Placeholder project imagery (raster, so the mirror can draw it).

    python3 scripts/make-placeholders.py

Abstract, art-directed fields in each project's colour: a horizon and sun for
Maritime, towers for Skyline, an arch for Origin. Torque and Altitude reuse
the frame-sequence render and the helmet poster. Replace with real work.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "placeholder"
OUT.mkdir(parents=True, exist_ok=True)


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def gradient(w, h, top, bottom, grain=4.0, seed=0):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    img = hex_rgb(top) * (1 - t) + hex_rgb(bottom) * t
    img = np.broadcast_to(img, (h, w, 3)).copy()
    rng = np.random.default_rng(seed)
    img += rng.normal(0, grain, img.shape).astype(np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def maritime(w, h):
    im = gradient(w, h, "#d8f3f2", "#7fcfcd", seed=1)
    d = ImageDraw.Draw(im, "RGBA")
    sun = (int(w * 0.64), int(h * 0.42))
    r = int(min(w, h) * 0.16)
    d.ellipse([sun[0] - r, sun[1] - r, sun[0] + r, sun[1] + r], fill=(245, 213, 171, 255))
    sea = gradient(w, h - int(h * 0.58), "#2f9c9b", "#006566", seed=2)
    im.paste(sea, (0, int(h * 0.58)))
    for i in range(14):
        y = int(h * 0.6) + i * int(h * 0.028)
        d.line([(int(w * 0.5) - 6 * i - 40, y), (int(w * 0.78) + 4 * i, y)], fill=(245, 213, 171, 90 - i * 5), width=2)
    return im


def skyline(w, h):
    im = gradient(w, h, "#fbe9d2", "#f0c48c", seed=3)
    d = ImageDraw.Draw(im, "RGBA")
    rng = np.random.default_rng(4)
    x = int(w * 0.06)
    while x < w * 0.94:
        bw = int(rng.uniform(0.04, 0.09) * w)
        bh = int(rng.uniform(0.25, 0.72) * h)
        tone = int(rng.uniform(70, 140))
        d.rectangle([x, h - bh, x + bw, h], fill=(117, 75, 0, tone))
        if rng.random() < 0.35:
            d.polygon([(x, h - bh), (x + bw // 2, h - bh - int(bw * 1.4)), (x + bw, h - bh)], fill=(117, 75, 0, tone))
        x += bw + int(rng.uniform(0.005, 0.02) * w)
    return im


def origin(w, h):
    im = gradient(w, h, "#ece6da", "#d9d2c5", seed=5)
    d = ImageDraw.Draw(im, "RGBA")
    aw, ah = int(w * 0.26), int(h * 0.62)
    x0, y0 = (w - aw) // 2, int(h * 0.24)
    d.rectangle([x0, y0 + aw // 2, x0 + aw, y0 + ah], fill=(132, 60, 56, 255))
    d.ellipse([x0, y0, x0 + aw, y0 + aw], fill=(132, 60, 56, 255))
    d.rectangle([0, int(h * 0.86), w, h], fill=(175, 170, 163, 255))
    return im


def framed(src, field, w, h, scale=0.86):
    im = gradient(w, h, field[0], field[1], seed=6)
    pic = Image.open(src).convert("RGBA")
    k = min(w * scale / pic.width, h * scale / pic.height)
    pic = pic.resize((int(pic.width * k), int(pic.height * k)), Image.LANCZOS)
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    cx, cy = w // 2, int(h * 0.52)
    sd.ellipse([cx - pic.width // 3, cy + pic.height // 2 - 30, cx + pic.width // 3, cy + pic.height // 2 + 10], fill=(20, 17, 14, 70))
    im.paste(shadow.filter(ImageFilter.GaussianBlur(24)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(24)))
    im.paste(pic, (cx - pic.width // 2, cy - pic.height // 2), pic)
    return im


def cover(src, w, h):
    pic = Image.open(src).convert("RGB")
    k = max(w / pic.width, h / pic.height)
    pic = pic.resize((int(pic.width * k) + 1, int(pic.height * k) + 1), Image.LANCZOS)
    x, y = (pic.width - w) // 2, (pic.height - h) // 2
    return pic.crop((x, y, x + w, y + h))


SIZES = {"wide": (1600, 1000), "tall": (900, 1200)}
for name, fn in {"maritime": maritime, "skyline": skyline, "origin": origin}.items():
    for kind, (w, h) in SIZES.items():
        fn(w, h).save(OUT / f"{name}-{kind}.webp", quality=82, method=6)

seq = ROOT / "public" / "seq" / "demo" / "land" / "030.webp"
helmet = ROOT / "public" / "models" / "helmet-poster.webp"
for kind, (w, h) in SIZES.items():
    cover(seq, w, h).save(OUT / f"torque-{kind}.webp", quality=82, method=6)
    framed(helmet, ("#ffe1dc", "#f6b9b1"), w, h).convert("RGB").save(OUT / f"altitude-{kind}.webp", quality=84, method=6)

print(sorted(p.name for p in OUT.iterdir()))
