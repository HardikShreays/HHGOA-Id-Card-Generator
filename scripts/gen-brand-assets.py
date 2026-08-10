#!/usr/bin/env python3
"""
Regenerates public/assets/frame-pfp.png, public/assets/card-bg.png, and
public/assets/og-default.png.

These are still PLACEHOLDER brand assets (plan §5/§11 — swap for the real
HH Goa 2026 logo/palette/template once organizers provide it). This pass
(plan §4 Phase 6) polishes them to read as "unmistakably an event artifact"
rather than a generic ring + logo: adds a small palm/sun/wave motif on top
of the existing teal/gold HH Goa 2026 identity, while keeping every canvas
geometry constant (canvas size, photoSlot rect, cardWidth/Height) EXACTLY
in sync with lib/constants.ts, since lib/canvasCompose.ts draws into those
exact coordinates.

Run: python3 scripts/gen-brand-assets.py
"""

import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

TEAL = (15, 122, 108, 255)  # BRAND.colors.primary #0F7A6C
GOLD = (242, 184, 7, 255)  # BRAND.colors.accent #F2B807
BG = (11, 18, 32, 255)  # BRAND.colors.background #0B1220
WHITE = (255, 255, 255, 255)

OUT_DIR = "public/assets"


def font(path, size):
    return ImageFont.truetype(path, size)


def draw_sun(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def draw_palm(base, x, y, scale=1.0, fill=TEAL, tilt=0.0):
    """Draws a simple 4-frond palm silhouette (trunk + fronds) onto `base`
    (an RGBA image), anchored at (x, y) = base of the trunk."""
    d = ImageDraw.Draw(base)
    trunk_h = 80 * scale
    trunk_w = 10 * scale
    # Curved trunk approximated as a tapered polygon leaning with `tilt`.
    lean = 18 * scale * tilt
    pts = [
        (x - trunk_w / 2, y),
        (x + trunk_w / 2, y),
        (x + trunk_w / 2 + lean * 0.4, y - trunk_h * 0.6),
        (x + lean, y - trunk_h),
    ]
    d.polygon(pts, fill=fill)
    top = (x + lean, y - trunk_h)
    frond_len = 60 * scale
    angles = [-150, -110, -70, -30, 15]
    for a in angles:
        rad = math.radians(a)
        tip = (top[0] + frond_len * math.cos(rad), top[1] + frond_len * math.sin(rad) * 0.6)
        ctrl = (
            top[0] + frond_len * 0.5 * math.cos(rad + 0.25),
            top[1] + frond_len * 0.5 * math.sin(rad + 0.25) * 0.6 - 10 * scale,
        )
        d.line([top, ctrl, tip], fill=fill, width=max(2, int(6 * scale)), joint="curve")


def draw_wave_band(base, y, height, color, amplitude=14, period=140, alpha=255):
    """Draws a horizontal sine-wave ribbon across the full width at `y`."""
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


def gen_frame_pfp():
    size = 1200
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = size / 2

    outer_r = size / 2 - 4
    inner_r = 430  # matches original punch-out radius (photo shows through here)
    band_mid_r = (outer_r + inner_r) / 2

    # Teal ring band.
    d.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=TEAL)
    d.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=(0, 0, 0, 0))

    # Thin gold hairlines just inside/outside the band for a "badge" feel.
    for r, w in [(inner_r + 6, 4), (inner_r + 14, 2)]:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=GOLD, width=w)

    # Circular text: event name (top) + tagline (bottom), matches original tone.
    # Spacing values below are tuned (see scripts note) so each string wraps
    # a comfortable arc with small symmetric gaps left/right rather than one
    # big dead arc of plain teal.
    def circular_text(text, radius, center_deg, fnt, fill, letter_spacing_deg, flip=False):
        """Places `text` centered at `center_deg` (0 = top, 180 = bottom,
        clockwise). `flip=True` is for bottom-half text: characters are
        drawn in reverse order and rotated +180° extra so they read
        upright/outward instead of upside-down/inward (the classic circular-
        text-on-the-bottom-half gotcha)."""
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

    f_title = font(FONT_BOLD, 40)
    f_tag = font(FONT_BOLD, 26)

    # Small gold sun accents mark the seams where the two text runs meet
    # (centered in each side gap), standing in for the "dots" in the
    # original placeholder while nodding to the beach motif the brief asks
    # for.
    for seam_deg in (87.5, -87.5):
        rad = math.radians(seam_deg)
        sx = cx + band_mid_r * math.sin(rad)
        sy = cy - band_mid_r * math.cos(rad)
        draw_sun(d, sx, sy, 6, GOLD)

    circular_text("HH GOA 2026", band_mid_r, 0, f_title, WHITE, 8.9)
    circular_text("BUILD · SHIP · REPEAT", band_mid_r, 180, f_tag, GOLD, 4.95, flip=True)

    img.save(f"{OUT_DIR}/frame-pfp.png")
    print("wrote", f"{OUT_DIR}/frame-pfp.png", img.size)


def gen_card_bg():
    w, h = 1080, 1350
    img = Image.new("RGBA", (w, h), BG)

    # Soft vertical gradient background (dark navy -> slightly lighter navy).
    top = (11, 18, 32)
    bottom = (18, 28, 46)
    for y in range(h):
        t = y / h
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        ImageDraw.Draw(img).line([(0, y), (w, y)], fill=(r, g, b, 255))

    d = ImageDraw.Draw(img)

    # Decorative teal glow circle, top-right (kept from original placeholder feel).
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([w - 260, -140, w + 260, 260], fill=(*TEAL[:3], 130))
    glow = glow.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(glow)

    # Sand/wave band along the very bottom edge — reinforces the Goa beach
    # theme and gives the footer text something to sit on.
    draw_wave_band(img, h - 46, 60, (*TEAL[:3],), amplitude=10, period=180, alpha=60)

    # Rounded outer border (drawn after the wave so its clean edge sits on top).
    d.rounded_rectangle([16, 16, w - 16, h - 16], radius=36, outline=GOLD, width=3)

    # Header wordmark.
    f_h1 = font(FONT_BOLD, 56)
    f_h2 = font(FONT_BOLD, 26)
    d.text((w / 2, 78), "HH GOA 2026", font=f_h1, fill=WHITE, anchor="mm")
    d.text((w / 2, 128), "BUILDER PASS", font=f_h2, fill=GOLD, anchor="mm")
    d.line([(72, 160), (w - 72, 160)], fill=(255, 255, 255, 160), width=2)

    # Photo slot — MUST match BRAND.canvas.photoSlot in lib/constants.ts
    # exactly ({x:230, y:210, width:620, height:826, cornerRadius:28}).
    slot = (230, 210, 230 + 620, 210 + 826)
    d.rounded_rectangle(slot, radius=28, fill=(35, 33, 28, 255), outline=GOLD, width=4)

    # Footer guide band (name/role/title text is drawn on top of this at
    # render time by lib/canvasCompose.ts — coordinates in CARD_TEXT_LAYOUT).
    d.rounded_rectangle([72, 1044, w - 72, 1044 + 210], radius=24, fill=(255, 255, 255, 18))

    img.save(f"{OUT_DIR}/card-bg.png")
    print("wrote", f"{OUT_DIR}/card-bg.png", img.size)


def gen_og_default():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(img)

    top = (11, 18, 32)
    bottom = (16, 26, 42)
    for y in range(h):
        t = y / h
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-180, -180, 260, 260], fill=(*TEAL[:3], 130))
    gd.ellipse([w - 260, h - 260, w + 180, h + 180], fill=(*TEAL[:3], 90))
    glow = glow.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(glow)

    draw_palm(img, 140, h - 60, scale=1.3, fill=(*TEAL[:3], 140), tilt=1)
    draw_palm(img, w - 150, h - 55, scale=1.1, fill=(*TEAL[:3], 110), tilt=-1)
    draw_sun(d, w - 110, 110, 46, (*GOLD[:3], 210))

    f_h1 = font(FONT_BOLD, 84)
    f_h2 = font(FONT_BOLD, 34)
    f_h3 = font(FONT_REG, 28)
    d.text((w / 2, h / 2 - 40), "HH GOA 2026", font=f_h1, fill=WHITE, anchor="mm")
    d.text((w / 2, h / 2 + 30), "BUILDER FRAME GENERATOR", font=f_h2, fill=GOLD, anchor="mm")
    d.text((w / 2, h / 2 + 80), "#FrameInGoa", font=f_h3, fill=(255, 255, 255, 180), anchor="mm")

    img.convert("RGB").save(f"{OUT_DIR}/og-default.png")
    print("wrote", f"{OUT_DIR}/og-default.png", img.size)


if __name__ == "__main__":
    gen_frame_pfp()
    gen_card_bg()
    gen_og_default()
