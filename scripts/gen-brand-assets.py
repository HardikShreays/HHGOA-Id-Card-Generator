#!/usr/bin/env python3
"""
Regenerates the 4 format template PNGs + the default OG image
(public/assets/frame-pfp.png, card-bg.png, boarding-bg.png, team-bg.png,
og-default.png) — Redesign v2 (plan §6.1/§6.3).

Everything here is geometric/repeatable (dotted rings, wave dividers,
perforation edges, ribbon shapes, postage-stamp corners) — drawn with PIL,
not hand-illustrated, so templates stay regenerable. The hand/AI-illustrated
motifs (palm trees, signpost, sunrise) called out in plan §6.2 are a
separate, later illustration pass and are intentionally NOT attempted here —
this script sticks to what's proceduralizable at a polish level that holds
up, per §6.1's guidance.

Canvas geometry (sizes, photoSlot rects) is kept EXACTLY in sync with
lib/constants.ts, since lib/canvasCompose.ts draws user photos + text into
those exact coordinates at runtime.

Run: python3 scripts/gen-brand-assets.py
"""

import math
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Brand tokens — MUST mirror lib/constants.ts BRAND.colors
# ---------------------------------------------------------------------------
FOREST = (11, 61, 46, 255)  # #0B3D2E
FOREST_DEEP = (6, 42, 32, 255)  # #062A20
PARCHMENT = (246, 236, 217, 255)  # #F6ECD9
GOLD = (232, 185, 35, 255)  # #E8B923
CORAL = (232, 93, 117, 255)  # #E85D75
INK = (18, 36, 28, 255)  # #12241C
PAPER = (255, 249, 238, 255)  # #FFF9EE
PAPER_DIM = (255, 249, 238, 190)  # PAPER at ~75% alpha, for secondary text
INK_DIM = (18, 36, 28, 110)  # INK at ~40% alpha, for hairlines

FONT_DIR = "public/fonts"
FRAUNCES = f"{FONT_DIR}/Fraunces-Variable.ttf"
NOTO_DEV_BOLD = f"{FONT_DIR}/NotoSansDevanagari-Bold.ttf"
POPPINS_BOLD = f"{FONT_DIR}/Poppins-Bold.ttf"
POPPINS_SEMIBOLD = f"{FONT_DIR}/Poppins-SemiBold.ttf"
POPPINS_MEDIUM = f"{FONT_DIR}/Poppins-Medium.ttf"

OUT_DIR = "public/assets"


def fraunces(size, instance="Black"):
    f = ImageFont.truetype(FRAUNCES, size)
    try:
        f.set_variation_by_name(instance)
    except Exception:
        pass
    return f


def font(path, size):
    return ImageFont.truetype(path, size)


# ---------------------------------------------------------------------------
# Shared procedural primitives (mirrors lib/canvasCompose.ts's dotted
# border / perforation / postage-stamp motifs, so static art and runtime
# canvas drawing read as the same visual language).
# ---------------------------------------------------------------------------


def dotted_rect_ring(draw, x, y, w, h, r, color=GOLD, spacing=16, dot_r=3):
    """Same perimeter-walk approach as canvasCompose.ts's dottedBorderPath,
    ported to PIL for the static template art."""
    radius = min(r, w / 2, h / 2)
    straight_top = w - radius * 2
    straight_side = h - radius * 2
    corner_arc = (math.pi / 2) * radius
    perimeter = 2 * straight_top + 2 * straight_side + 4 * corner_arc
    count = max(8, round(perimeter / spacing))

    segments = [
        (straight_top, lambda t: (x + radius + t * straight_top, y)),
        (corner_arc, lambda t: (x + w - radius + radius * math.cos(-math.pi / 2 + t * (math.pi / 2)), y + radius + radius * math.sin(-math.pi / 2 + t * (math.pi / 2)))),
        (straight_side, lambda t: (x + w, y + radius + t * straight_side)),
        (corner_arc, lambda t: (x + w - radius + radius * math.cos(t * (math.pi / 2)), y + h - radius + radius * math.sin(t * (math.pi / 2)))),
        (straight_top, lambda t: (x + w - radius - t * straight_top, y + h)),
        (corner_arc, lambda t: (x + radius + radius * math.cos(math.pi / 2 + t * (math.pi / 2)), y + h - radius + radius * math.sin(math.pi / 2 + t * (math.pi / 2)))),
        (straight_side, lambda t: (x, y + h - radius - t * straight_side)),
        (corner_arc, lambda t: (x + radius + radius * math.cos(math.pi + t * (math.pi / 2)), y + radius + radius * math.sin(math.pi + t * (math.pi / 2)))),
    ]

    for i in range(count):
        dist = (i / count) * perimeter
        for length, point in segments:
            if dist <= length:
                px, py = point(dist / length if length else 0)
                draw.ellipse([px - dot_r, py - dot_r, px + dot_r, py + dot_r], fill=color)
                break
            dist -= length


def postage_stamp_corner(base, x, y, size, fill, notch_r=7, gap=18):
    """Perforated-edge square (postage-stamp motif) — repeated semicircle
    notches along all 4 edges, fully proceduralizable per plan §6.1."""
    layer = Image.new("RGBA", (size + notch_r * 2, size + notch_r * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    off = notch_r
    d.rectangle([off, off, off + size, off + size], fill=fill)
    n = max(2, size // gap)
    for i in range(n + 1):
        t = i / n
        px = off + t * size
        d.ellipse([px - notch_r, off - notch_r, px + notch_r, off + notch_r], fill=(0, 0, 0, 0))
        d.ellipse([px - notch_r, off + size - notch_r, px + notch_r, off + size + notch_r], fill=(0, 0, 0, 0))
        py = off + t * size
        d.ellipse([off - notch_r, py - notch_r, off + notch_r, py + notch_r], fill=(0, 0, 0, 0))
        d.ellipse([off + size - notch_r, py - notch_r, off + size + notch_r, py + notch_r], fill=(0, 0, 0, 0))
    base.alpha_composite(layer, (int(x - notch_r), int(y - notch_r)))


def wave_band(base, y, height, color, amplitude=12, period=140, alpha=255):
    w, h = base.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts_top = []
    pts_bottom = []
    for px in range(0, w + 1, 4):
        offset = amplitude * math.sin((px / period) * 2 * math.pi)
        pts_top.append((px, y + offset))
    for px in range(w, -1, -4):
        offset = amplitude * math.sin((px / period) * 2 * math.pi)
        pts_bottom.append((px, y + offset + height))
    d.polygon(pts_top + pts_bottom, fill=(*color[:3], alpha))
    base.alpha_composite(layer)


def devanagari_badge(draw, cx, y, text="गोवा", size=34, fill=GOLD):
    f = font(NOTO_DEV_BOLD, size)
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw / 2, y), text, font=f, fill=fill)


def perforation_static(base, x, y1, y2, color, notch_r=14):
    d = ImageDraw.Draw(base)
    yy = y1 + notch_r
    while yy < y2 - notch_r:
        d.line([(x, yy), (x, min(yy + 8, y2 - notch_r))], fill=color, width=2)
        yy += 16
    # Punch transparent notch circles into the edge.
    mask = Image.new("L", base.size, 255)
    md = ImageDraw.Draw(mask)
    md.ellipse([x - notch_r, y1 - notch_r, x + notch_r, y1 + notch_r], fill=0)
    md.ellipse([x - notch_r, y2 - notch_r, x + notch_r, y2 + notch_r], fill=0)
    transparent = Image.new("RGBA", base.size, (0, 0, 0, 0))
    base.paste(transparent, (0, 0), Image.eval(mask, lambda p: 255 - p))


def right_aligned(draw, x_right, y, text, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x_right - (bbox[2] - bbox[0]), y), text, font=fnt, fill=fill)


def centered(draw, cx, y, text, fnt, fill):
    bbox = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (bbox[2] - bbox[0]) / 2, y), text, font=fnt, fill=fill)


# ---------------------------------------------------------------------------
# Format: Profile Frame — 1200x1200, circular punch-out center
# ---------------------------------------------------------------------------


def gen_frame_pfp():
    size = 1200
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = size / 2

    outer_r = size / 2 - 4
    inner_r = 430  # MUST match innerR in lib/canvasCompose.ts drawFrame()
    band_mid_r = (outer_r + inner_r) / 2

    d.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=FOREST)
    d.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=(0, 0, 0, 0))

    for r, ww in [(inner_r + 6, 4), (inner_r + 16, 2)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=ww)

    def circular_text(text, radius, center_deg, fnt, fill, letter_spacing_deg, flip=False):
        seq = text[::-1] if flip else text
        total = 0.0
        for ch in seq:
            bbox = fnt.getbbox(ch)
            char_w = (bbox[2] - bbox[0]) if bbox else 20
            total += letter_spacing_deg + char_w * 0.14
        deg = center_deg - total / 2
        for ch in seq:
            rad = math.radians(deg)
            px = cx + radius * math.sin(rad)
            py = cy - radius * math.cos(rad)
            glyph = Image.new("RGBA", (80, 80), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glyph)
            gd.text((40, 40), ch, font=fnt, fill=fill, anchor="mm")
            rotation = -deg + 180 if flip else -deg
            rotated = glyph.rotate(rotation, resample=Image.BICUBIC, center=(40, 40))
            img.alpha_composite(rotated, (int(px - 40), int(py - 40)))
            bbox = fnt.getbbox(ch)
            char_w = (bbox[2] - bbox[0]) if bbox else 20
            deg += letter_spacing_deg + char_w * 0.14

    f_title = fraunces(42, "Black")
    f_tag = font(POPPINS_SEMIBOLD, 24)

    for seam_deg in (87.5, -87.5):
        rad = math.radians(seam_deg)
        sx = cx + band_mid_r * math.sin(rad)
        sy = cy - band_mid_r * math.cos(rad)
        d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], fill=GOLD)

    circular_text("HH GOA 2026", band_mid_r, 0, f_title, PAPER, 9.2)
    circular_text("BUILD · SHIP · REPEAT", band_mid_r, 180, f_tag, GOLD, 4.8, flip=True)

    # Postage-stamp corner motif (static, non-per-user) bottom-right.
    postage_stamp_corner(img, size - 150, size - 150, 110, (*FOREST_DEEP[:3], 235))
    d2 = ImageDraw.Draw(img)
    centered(d2, size - 150 + 55, size - 150 + 36, "GOA", font(POPPINS_SEMIBOLD, 15), PAPER)
    centered(d2, size - 150 + 55, size - 150 + 58, "INDIA", font(POPPINS_MEDIUM, 11), GOLD)

    # गोवा badge, mirrored bottom-left corner (kept fully inside the ring
    # band, never over the punched-out photo center).
    devanagari_badge(d2, 96, size - 150 + 40, "गोवा", 34, GOLD)

    img.save(f"{OUT_DIR}/frame-pfp.png")


# ---------------------------------------------------------------------------
# Format: Builder ID / VIP Pass — 1080x1350
# ---------------------------------------------------------------------------


def gen_card_bg():
    w, h = 1080, 1350

    # Subtle vertical gradient forest -> forest-deep for depth.
    base = Image.new("RGBA", (w, h), FOREST)
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        grad.putpixel((0, y), int(60 * (y / h)))
    grad = grad.resize((w, h))
    img = Image.composite(Image.new("RGBA", (w, h), FOREST_DEEP), base, grad)
    d = ImageDraw.Draw(img)

    # Header ribbon.
    d.rectangle([0, 0, w, 168], fill=FOREST_DEEP)
    d.text((70, 44), "HH GOA 2026", font=fraunces(46, "Black"), fill=PAPER)
    d.text((70, 102), "गोवा", font=font(NOTO_DEV_BOLD, 38), fill=GOLD)
    right_aligned(d, w - 70, 58, "BUILDER PASS", font(POPPINS_SEMIBOLD, 20), GOLD)
    right_aligned(d, w - 70, 92, "GOA, INDIA · 28–31 OCT 2026", font(POPPINS_MEDIUM, 16), PAPER_DIM)
    d.rectangle([0, 166, w, 170], fill=GOLD)

    # Photo-slot inset panel — MUST match BRAND.canvas.photoSlot in constants.ts.
    slot = dict(x=230, y=210, width=620, height=826, r=28)
    inset = [slot["x"] - 10, slot["y"] - 10, slot["x"] + slot["width"] + 10, slot["y"] + slot["height"] + 10]
    d.rounded_rectangle(inset, radius=slot["r"] + 10, fill=FOREST_DEEP)

    # Decorative dotted side border (mirrors the ring motif elsewhere).
    dotted_rect_ring(d, 24, 190, w - 48, h - 210, 32, color=GOLD, spacing=22, dot_r=2.6)

    # Footer ribbon.
    d.rectangle([0, h - 60, w, h], fill=FOREST_DEEP)
    centered(d, w / 2, h - 40, "#FrameInGoa  ·  2:47PM STUDIO", font(POPPINS_MEDIUM, 16), PAPER_DIM)

    img.save(f"{OUT_DIR}/card-bg.png")


# ---------------------------------------------------------------------------
# Format: Boarding Pass — 1080x620
# ---------------------------------------------------------------------------


def gen_boarding_bg():
    w, h = 1080, 620
    img = Image.new("RGBA", (w, h), PARCHMENT)
    d = ImageDraw.Draw(img)

    # Left stub panel (forest), holds the photo slot.
    stub_w = 400
    d.rectangle([0, 0, stub_w, h], fill=FOREST)

    slot = dict(x=60, y=60, width=340, height=340, r=24)
    inset = [slot["x"] - 8, slot["y"] - 8, slot["x"] + slot["width"] + 8, slot["y"] + slot["height"] + 8]
    d.rounded_rectangle(inset, radius=slot["r"] + 8, fill=FOREST_DEEP)

    centered(d, stub_w / 2, 428, "GOA · INDIA", font(POPPINS_SEMIBOLD, 22), GOLD)
    devanagari_badge(d, stub_w / 2, 466, "गोवा", 30, PAPER)
    d.text((30, 20), "HH GOA 2026", font=fraunces(28, "Black"), fill=PAPER)

    # Static perforation notches (JS re-draws a crisper dashed line on top
    # at runtime — see lib/canvasCompose.ts drawPerforation).
    perforation_static(img, stub_w, 20, h - 20, INK_DIM, notch_r=14)
    d = ImageDraw.Draw(img)

    right_aligned(d, w - 40, 24, "BOARDING PASS", font(POPPINS_SEMIBOLD, 18), CORAL)

    # Postage-stamp corner, bottom-right of main body.
    postage_stamp_corner(img, w - 120, h - 110, 80, (*FOREST[:3], 235))
    d2 = ImageDraw.Draw(img)
    centered(d2, w - 120 + 40, h - 110 + 32, "GOI", font(POPPINS_SEMIBOLD, 20), PAPER)

    # Dotted rule above the barcode/footer zone drawn by JS at runtime.
    dotted_rect_ring(d2, stub_w + 30, 480, w - stub_w - 70, 100, 12, color=INK_DIM, spacing=18, dot_r=2)

    img.save(f"{OUT_DIR}/boarding-bg.png")


# ---------------------------------------------------------------------------
# Format: Team Frame — 1200x630 (plan §3.4 — P0, task-required)
# ---------------------------------------------------------------------------


def gen_team_bg():
    w, h = 1200, 630
    base = Image.new("RGBA", (w, h), FOREST)
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        grad.putpixel((0, y), int(60 * (y / h)))
    grad = grad.resize((w, h))
    img = Image.composite(Image.new("RGBA", (w, h), FOREST_DEEP), base, grad)
    d = ImageDraw.Draw(img)

    # गोवा badge, top-left corner (headline text — drawn by JS — owns
    # top-center, so keep this corner-only).
    d.text((36, 26), "गोवा", font=font(NOTO_DEV_BOLD, 30), fill=GOLD)
    right_aligned(d, w - 36, 32, "GOA, INDIA · 28–31 OCT 2026", font(POPPINS_MEDIUM, 14), PAPER_DIM)

    # Wave divider low on the canvas, above the footer text JS draws at y=588.
    wave_band(img, 560, 14, GOLD, amplitude=6, period=110, alpha=140)

    img.save(f"{OUT_DIR}/team-bg.png")


# ---------------------------------------------------------------------------
# Default OG image — 1200x630, generic (no per-user data)
# ---------------------------------------------------------------------------


def gen_og_default():
    w, h = 1200, 630
    base = Image.new("RGBA", (w, h), FOREST)
    grad = Image.new("L", (1, h), 0)
    for y in range(h):
        grad.putpixel((0, y), int(70 * (y / h)))
    grad = grad.resize((w, h))
    img = Image.composite(Image.new("RGBA", (w, h), FOREST_DEEP), base, grad)
    d = ImageDraw.Draw(img)

    wave_band(img, 500, 20, GOLD, amplitude=10, period=160, alpha=120)
    d = ImageDraw.Draw(img)

    d.text((80, 150), "HH GOA 2026", font=fraunces(72, "Black"), fill=PAPER)
    d.text((80, 240), "गोवा", font=font(NOTO_DEV_BOLD, 60), fill=GOLD)
    d.text((84, 330), "4 days. one rhythm. everything intentional.", font=font(POPPINS_MEDIUM, 26), fill=PAPER_DIM)
    d.text((84, 390), "#FrameInGoa  ·  Frame / ID Card Generator", font=font(POPPINS_SEMIBOLD, 24), fill=GOLD)

    postage_stamp_corner(img, w - 190, h - 190, 130, (*FOREST_DEEP[:3], 240))
    d2 = ImageDraw.Draw(img)
    centered(d2, w - 190 + 65, h - 190 + 46, "GOA", font(POPPINS_SEMIBOLD, 20), PAPER)
    centered(d2, w - 190 + 65, h - 190 + 72, "2026", font(POPPINS_MEDIUM, 16), GOLD)

    img.convert("RGB").save(f"{OUT_DIR}/og-default.png")


if __name__ == "__main__":
    gen_frame_pfp()
    gen_card_bg()
    gen_boarding_bg()
    gen_team_bg()
    gen_og_default()
    print("Generated: frame-pfp.png, card-bg.png, boarding-bg.png, team-bg.png, og-default.png")
