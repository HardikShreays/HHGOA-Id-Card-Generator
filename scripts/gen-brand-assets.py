#!/usr/bin/env python3
"""
Regenerates brand template PNGs. Geometry must stay in sync with lib/constants.ts.

  frame-pfp.png     1200x1200   photo circle cx=600 cy=508 r=318
  card-bg.png       1080x1350   photoSlot 270,186 540x548 r=24
  boarding-bg.png   1080x620    photo 48,148 196  / perforation x=820
  team-bg.png       1200x630
  og-default.png    1200x630

Run: python3 scripts/gen-brand-assets.py
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FOREST = (11, 61, 46, 255)
FOREST_DEEP = (6, 42, 32, 255)
FOREST_MID = (14, 78, 58, 255)
PARCHMENT = (246, 236, 217, 255)
GOLD = (232, 185, 35, 255)
CORAL = (232, 93, 117, 255)
INK = (18, 36, 28, 255)
PAPER = (255, 249, 238, 255)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets")


def first_font(*paths):
    for p in paths:
        if p and os.path.isfile(p):
            return p
    return None


FONT_BOLD = first_font(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
)
FONT_REG = first_font(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
)
FONT_MONO = first_font(
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
    "/System/Library/Fonts/Monaco.ttf",
)
FONT_DEVA = first_font(
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    FONT_BOLD,
)


def font(path, size):
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fill_vgrad(img, top, bottom):
    w, h = img.size
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))


def draw_sun(draw, cx, cy, r, fill=GOLD):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    for i in range(10):
        a = math.radians(i * 36)
        x1 = cx + math.cos(a) * (r + 6)
        y1 = cy + math.sin(a) * (r + 6)
        x2 = cx + math.cos(a) * (r + 18)
        y2 = cy + math.sin(a) * (r + 18)
        draw.line([(x1, y1), (x2, y2)], fill=fill, width=3)


def draw_palm(base, x, y, scale=1.0, fill=FOREST_MID, tilt=0.0):
    d = ImageDraw.Draw(base)
    trunk_h = 80 * scale
    trunk_w = 10 * scale
    lean = 18 * scale * tilt
    pts = [
        (x - trunk_w / 2, y),
        (x + trunk_w / 2, y),
        (x + trunk_w / 2 + lean * 0.4, y - trunk_h * 0.6),
        (x + lean, y - trunk_h),
    ]
    d.polygon(pts, fill=fill)
    top = (x + lean, y - trunk_h)
    frond_len = 62 * scale
    for a in (-150, -110, -70, -30, 15):
        rad = math.radians(a)
        tip = (top[0] + frond_len * math.cos(rad), top[1] + frond_len * math.sin(rad) * 0.6)
        ctrl = (
            top[0] + frond_len * 0.5 * math.cos(rad + 0.25),
            top[1] + frond_len * 0.5 * math.sin(rad + 0.25) * 0.6 - 10 * scale,
        )
        d.line([top, ctrl, tip], fill=fill, width=max(2, int(6 * scale)), joint="curve")


def draw_wave_band(base, y, height, color, amplitude=14, period=140, alpha=255):
    w, h = base.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts_top = []
    for px in range(0, w + 1, 4):
        offset = amplitude * math.sin((px / period) * 2 * math.pi)
        pts_top.append((px, y + offset))
    pts_bottom = []
    for px in range(w, -1, -4):
        offset = amplitude * math.sin((px / period) * 2 * math.pi)
        pts_bottom.append((px, y + offset + height))
    d.polygon(pts_top + pts_bottom, fill=(*color[:3], alpha))
    base.alpha_composite(layer)


def draw_postage_stamp(base, x, y, size=150, label="GOA · INDIA"):
    """Perforated-edge square — procedural postage-stamp motif."""
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pad = 10
    d.rectangle([x, y, x + size, y + size], fill=PARCHMENT, outline=GOLD, width=3)
    notch = 7
    # punch holes along each edge so it reads as a stamp
    for i in range(1, 9):
        t = i / 9
        d.ellipse([x + size * t - notch / 2, y - notch / 2, x + size * t + notch / 2, y + notch / 2], fill=FOREST_DEEP)
        d.ellipse([x + size * t - notch / 2, y + size - notch / 2, x + size * t + notch / 2, y + size + notch / 2], fill=FOREST_DEEP)
        d.ellipse([x - notch / 2, y + size * t - notch / 2, x + notch / 2, y + size * t + notch / 2], fill=FOREST_DEEP)
        d.ellipse([x + size - notch / 2, y + size * t - notch / 2, x + size + notch / 2, y + size * t + notch / 2], fill=FOREST_DEEP)
    inner = [x + pad, y + pad, x + size - pad, y + size - pad]
    d.rectangle(inner, outline=CORAL, width=2)
    f = font(FONT_MONO, 13)
    d.text((x + size / 2, y + size / 2 - 8), label, font=f, fill=INK, anchor="mm")
    d.text((x + size / 2, y + size / 2 + 12), "2026", font=font(FONT_BOLD, 16), fill=GOLD, anchor="mm")
    base.alpha_composite(layer)


def gen_frame_pfp():
    size = 1200
    img = Image.new("RGBA", (size, size), FOREST_DEEP)
    fill_vgrad(img, FOREST_DEEP, FOREST)
    d = ImageDraw.Draw(img)

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([size - 380, -160, size + 160, 380], fill=(*GOLD[:3], 40))
    gd.ellipse([-200, size - 360, 360, size + 160], fill=(*CORAL[:3], 28))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)))

    draw_sun(d, 1040, 150, 36)
    draw_palm(img, 90, 1180, scale=2.1, fill=(*FOREST_MID[:3], 220), tilt=0.8)
    draw_palm(img, 190, 1190, scale=1.5, fill=(*FOREST[:3], 200), tilt=-0.4)
    draw_palm(img, 1080, 1195, scale=1.7, fill=(*FOREST_MID[:3], 200), tilt=-0.9)
    draw_wave_band(img, 1048, 90, FOREST_DEEP, amplitude=12, period=200, alpha=90)

    draw_postage_stamp(img, 1008, 980, size=148)

    # photo well — slightly darker so a missing photo still reads as a slot
    cx, cy, r = 600, 508, 318
    d.ellipse([cx - r - 8, cy - r - 8, cx + r + 8, cy + r + 8], outline=GOLD, width=3)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(8, 36, 28, 255))

    img.save(f"{OUT_DIR}/frame-pfp.png")
    print("wrote", f"{OUT_DIR}/frame-pfp.png", img.size)


def gen_card_bg():
    w, h = 1080, 1350
    img = Image.new("RGBA", (w, h), FOREST_DEEP)
    fill_vgrad(img, FOREST_DEEP, FOREST)
    d = ImageDraw.Draw(img)

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w - 320, -180, w + 200, 300], fill=(*GOLD[:3], 50))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(6)))

    # header ribbon
    d.rectangle([0, 0, w, 168], fill=FOREST_DEEP)
    d.polygon([(0, 168), (w, 168), (w, 188), (0, 176)], fill=GOLD)
    d.text((w / 2, 52), "HH GOA 2026", font=font(FONT_BOLD, 42), fill=PAPER, anchor="mm")
    d.text((w / 2 + 210, 50), "गोवा", font=font(FONT_DEVA, 28), fill=GOLD, anchor="mm")
    d.text((w / 2, 100), "BUILDER PASS", font=font(FONT_MONO, 20), fill=GOLD, anchor="mm")
    d.text((w / 2, 136), "GOA, INDIA  ·  28–31 OCT 2026", font=font(FONT_MONO, 14), fill=(255, 249, 238, 170), anchor="mm")

    # photo well — MUST match BRAND.canvas.photoSlot
    slot = (270, 186, 270 + 540, 186 + 548)
    d.rounded_rectangle(slot, radius=24, fill=(8, 36, 28, 255), outline=GOLD, width=2)

    draw_palm(img, 70, 760, scale=1.1, fill=(*FOREST_MID[:3], 160), tilt=0.6)
    draw_palm(img, 1010, 770, scale=1.0, fill=(*FOREST_MID[:3], 140), tilt=-0.7)

    # footer coral ribbon
    d.rectangle([0, 1248, w, h], fill=CORAL)

    d.rounded_rectangle([18, 18, w - 18, h - 18], radius=32, outline=GOLD, width=3)

    img.save(f"{OUT_DIR}/card-bg.png")
    print("wrote", f"{OUT_DIR}/card-bg.png", img.size)


def gen_boarding_bg():
    w, h = 1080, 620
    img = Image.new("RGBA", (w, h), PARCHMENT)
    d = ImageDraw.Draw(img)

    # subtle paper grain via faint waves
    draw_wave_band(img, 0, 40, GOLD, amplitude=6, period=220, alpha=28)
    draw_wave_band(img, h - 36, 50, FOREST, amplitude=8, period=180, alpha=22)

    # header flight strip
    d.rectangle([0, 0, 820, 92], fill=FOREST)
    d.text((28, 46), "FLIGHT HH2026  ·  GOA (GOI)  ·  28–31 OCT", font=font(FONT_MONO, 18), fill=PAPER, anchor="lm")

    # stub panel
    d.rectangle([820, 0, w, h], fill=(238, 224, 196, 255))
    d.rectangle([820, 0, w, 92], fill=FOREST_DEEP)
    d.text((950, 46), "HH GOA", font=font(FONT_MONO, 16), fill=GOLD, anchor="mm")

    d.text((950, 150), "BOARDING", font=font(FONT_MONO, 12), fill=FOREST, anchor="mm")
    d.text((950, 178), "PASS", font=font(FONT_BOLD, 28), fill=INK, anchor="mm")
    d.text((950, 230), "GOA, INDIA", font=font(FONT_MONO, 12), fill=FOREST, anchor="mm")
    d.text((950, 258), "OCT 28–31", font=font(FONT_MONO, 12), fill=FOREST, anchor="mm")

    # photo well 48,148 196
    d.ellipse([48, 148, 48 + 196, 148 + 196], fill=(220, 206, 180, 255), outline=GOLD, width=2)

    d.rounded_rectangle([12, 12, w - 12, h - 12], radius=20, outline=FOREST, width=3)

    img.save(f"{OUT_DIR}/boarding-bg.png")
    print("wrote", f"{OUT_DIR}/boarding-bg.png", img.size)


def gen_team_bg():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), FOREST_DEEP)
    fill_vgrad(img, FOREST_DEEP, FOREST)
    d = ImageDraw.Draw(img)

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w - 280, -120, w + 120, 260], fill=(*GOLD[:3], 45))
    gd.ellipse([-160, h - 220, 280, h + 120], fill=(*CORAL[:3], 30))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(8)))

    draw_sun(d, 1120, 70, 28)
    draw_palm(img, 60, h - 8, scale=1.4, fill=(*FOREST_MID[:3], 180), tilt=0.7)
    draw_palm(img, 1140, h - 6, scale=1.2, fill=(*FOREST_MID[:3], 160), tilt=-0.8)
    draw_wave_band(img, h - 28, 40, FOREST_DEEP, amplitude=8, period=200, alpha=80)

    d.rounded_rectangle([16, 16, w - 16, h - 16], radius=28, outline=GOLD, width=3)

    img.save(f"{OUT_DIR}/team-bg.png")
    print("wrote", f"{OUT_DIR}/team-bg.png", img.size)


def gen_og_default():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), FOREST_DEEP)
    fill_vgrad(img, FOREST_DEEP, FOREST)
    d = ImageDraw.Draw(img)

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-160, -160, 280, 280], fill=(*GOLD[:3], 50))
    gd.ellipse([w - 280, h - 260, w + 160, h + 160], fill=(*CORAL[:3], 40))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(6)))

    draw_palm(img, 120, h - 20, scale=1.6, fill=(*FOREST_MID[:3], 180), tilt=0.9)
    draw_palm(img, w - 130, h - 16, scale=1.4, fill=(*FOREST_MID[:3], 160), tilt=-0.9)
    draw_sun(d, w - 120, 100, 40)
    draw_postage_stamp(img, 48, 48, size=130)

    d.text((w / 2, h / 2 - 50), "HH GOA 2026", font=font(FONT_BOLD, 72), fill=PAPER, anchor="mm")
    d.text((w / 2, h / 2 + 22), "FRAME YOURSELF IN", font=font(FONT_MONO, 22), fill=GOLD, anchor="mm")
    d.text((w / 2, h / 2 + 68), "गोवा", font=font(FONT_DEVA, 36), fill=GOLD, anchor="mm")
    d.text((w / 2, h / 2 + 130), "#FrameInGoa  ·  28–31 OCT 2026", font=font(FONT_MONO, 18), fill=(255, 249, 238, 180), anchor="mm")

    img.convert("RGB").save(f"{OUT_DIR}/og-default.png")
    print("wrote", f"{OUT_DIR}/og-default.png", img.size)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    gen_frame_pfp()
    gen_card_bg()
    gen_boarding_bg()
    gen_team_bg()
    gen_og_default()
