# HH GOA 2026 — Design System Reference

> **Purpose of this file:** Feed this document to any LLM/coding assistant before asking it to build UI, generate graphics, or write CSS for the "Hacker House Goa 2026" brand (site: hhgoa.com). It contains the *actual* extracted design tokens (colors, fonts, shadows, motion, asset inventory) pulled directly from the site's production CSS bundle and DOM — not guesses. Treat every value below as ground truth unless the user overrides it.

---

## 1. Brand summary

**What it is:** Landing page for "Hacker House Goa," a 4-day invite-only hackathon/residency in Goa, India (28–31 Oct 2026). Studio credit: "2:47 pm Studio."

**Vibe in one line:** *Neubrutalist tropical hacker-zine* — jungle green + sunshine yellow + neon pink, a high-contrast serif display face paired with a monospace terminal body face, hard-offset sticker/comic-book shadows, floating hand-drawn illustration elements, and glowing pulse CTAs, wrapped around beach/Goa imagery (sunrise, palm trees, Hindi script).

**Tone of voice / copy style:** Short punchy fragments, lowercase stylization mixed with ALL CAPS labels, startup/hacker slang ("lock in," "ship it," "elite builders," "no fluff"), occasional emoji (🌴), Gen-Z hackathon energy. Example lines: *"4 days. one rhythm. everything intentional."* / *"heads down. ship or ship"* / *"Most hackathons are just hype and no substance."*

---

## 2. Color palette (exact hex values — from CSS custom properties)

These are the literal `:root` CSS variables found in the production stylesheet. Use these hex codes exactly; do not approximate.

| Token | Hex | Role |
|---|---|---|
| `--primary` / `--background` / `--card` / `--border` / `--input` / `--muted` / `--sidebar` | `#0b6839` | **Jungle green** — dominant brand color, page backgrounds, borders |
| `--secondary` / `--muted-foreground` / `--ring` / `--chart-2` / `--sidebar-primary` / `--sidebar-ring` | `#fee101` | **Sunshine yellow** — CTAs, glows, highlights, secondary surfaces |
| `--accent` / `--sidebar-accent` / `--chart-3` | `#ff0080` | **Hot pink** — used sparingly as a "pop" accent, stickers, stamps |
| `--foreground` / `--card-foreground` / `--accent-foreground` / `--popover-foreground` / `--sidebar-foreground` / `--primary-foreground` / `--chart-4` | `#fff` | White — text on green |
| `--secondary-foreground` / `--sidebar-primary-foreground` | `#000` | Black — text on yellow |
| Cream / off-white (used in gradients, not a named var) | `#fffbe8` | Sand/paper warm white |
| `--destructive` | `#dc2626` | Error red (form validation only) |
| Additional reds seen in the `red` scale (validation states) | `#e40014`, `#bf000f`, `#fb2c36`, `#ffcaca`, `#fef2f2` | Error states, do not use decoratively |
| `--chart-5` | `#ccc` | Neutral gray, minor use |

**Signature gradients (used exactly as-is on the live site):**
```css
/* Hero / accent gradient */
background: linear-gradient(135deg, #0b6839, #fee101);

/* Shimmer / highlight gradient */
background: linear-gradient(135deg, #fee101, #fffbe8, #fee101);
```

**Palette rule of thumb for new components:** green = base/background, yellow = primary action/glow/energy, pink = rare accent (stamps, tags, "pop" moments only — don't overuse), cream = paper/card surfaces, black = outlines and hard shadows, white = text on dark.

---

## 3. Typography

| Role | Font family | Source | Notes |
|---|---|---|---|
| **Display / headings** | `Imbue` | Self-hosted via `next/font`, weight used: 400–700, also on Google Fonts (`Imbue:opsz,wght@10..100,400..700`) | High-contrast serif, editorial/dramatic. Use for hero headlines, names on ID cards, large numerals. |
| **Body / UI / everything else (default site font)** | `Victor Mono` | Self-hosted via `next/font`, weight range 100–700, also on Google Fonts | Monospace, terminal/hacker aesthetic. This is literally set as `--default-font-family` — i.e. the base font for the *entire* site, not just code snippets. Use for paragraphs, labels, buttons, nav, badges. |
| Fallback stack | `Victor Mono Fallback` → `local(Arial)` with `ascent-override:81.73%; descent-override:18.58%; size-adjust:134.59%` | — | Metric-matched fallback to avoid layout shift. Not critical to replicate outside the original site. |

**Rule:** Do NOT substitute a generic sans-serif (Inter, Helvetica, etc.) as the body font — the monospace body text is a deliberate, load-bearing brand choice, not a placeholder. Pair Imbue (display) with Victor Mono (everything else) on every new surface for this brand.

Google Fonts CDN import (safe substitute when self-hosted files aren't available):
```html
<link href="https://fonts.googleapis.com/css2?family=Imbue:opsz,wght@10..100,400..700&family=Victor+Mono:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
```

---

## 4. Shape language & shadows (neubrutalist / sticker style)

- **Border radius scale:** base `--radius: .625rem` (10px). Derived via `calc()`:
  - `.rounded-sm` → `calc(var(--radius) * .6)` (6px)
  - `.rounded-md` → `calc(var(--radius) * .8)` (8px)
  - `.rounded-lg` → `var(--radius)` (10px)
  - Pills/circles use `border-radius: 3.40282e38px` (i.e. effectively 999px)
- **Shadows are HARD, not blurred** — this is the single most important stylistic signature. No soft `box-shadow: 0 4px 12px rgba(...)` blur-style shadows. Instead, flat offset shadows that look like cut paper / stickers:
  ```css
  box-shadow: 4px 4px #fee101;                       /* colored hard shadow, no blur */
  box-shadow: 6px 8px 0 rgba(0,0,0,.25);
  box-shadow: 8px 10px 0 rgba(0,0,0,.25);
  box-shadow: 3px 3px 0 rgba(0,0,0,.15);
  box-shadow: 4px 5px 0 rgba(0,0,0,.2);
  box-shadow: 0 12px 0 rgba(0,0,0,.25);
  box-shadow: 0 2px 3px rgba(0,0,0,.35);
  ```
  Pattern: `X-offset Y-offset 0 rgba(black, alpha)` — always `0` blur radius. Increase offset distance for "bigger/more elevated" elements.
- **Borders:** solid black (or dark green) borders, typically 2–3.5px, on cards/buttons/inputs — reinforces the sticker/cutout look.
- **Buttons press down on click:** translate the element toward the shadow origin and shrink the shadow on `:active` to simulate a physical button press (common neubrutalist interaction pattern). On `:hover`, translate slightly away and enlarge the shadow.

---

## 5. Motion (exact keyframes from production CSS)

```css
@keyframes marquee {
  0%   { transform: translate(0); }
  100% { transform: translate(-50%); }
}
/* infinite horizontal scroll ticker — used for stats/sponsor/tag strips */

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50%      { transform: translateY(-15px) rotate(2deg); }
}
/* gentle drift + tilt — used on floating illustration elements (sun, decorative graphics) */

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 #fee10166; }
  50%      { box-shadow: 0 0 30px 15px #fee10100; }
}
/* breathing yellow glow — used on primary CTA buttons */

@keyframes bounceSubtle {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
/* small idle bounce — used on icons/small interactive elements */

@keyframes fadeInUp {
  0%   { opacity: 0; transform: translateY(...); }
  100% { opacity: 1; transform: translateY(0); }
}
/* scroll-reveal / entrance animation for sections and cards */
```

Additional observed glow variant (button-specific):
```css
.cta-button-glow {
  transition: transform 60ms linear, filter 60ms linear;
}
/* fast, snappy — not eased slow transitions. Keep interaction transitions under ~100ms for this brand's "snappy sticker" feel. */
```

**Motion rules for new work:** Reuse these five keyframes verbatim where possible rather than inventing new easing curves. Keep hover/active transitions very fast (60–150ms, linear or ease-out) — the brand favors snappy tactile feedback over slow smooth easing.

---

## 6. Asset folder inventory

The production `/assets` folder (Next.js static export) contains the following files. **Naming pattern:** Figma-exported assets keep the pattern `{layer-index}-{layer-type}-{figma-node-id}.svg` (meaningless as descriptive names — must be identified visually if reused), while hand-named raster images describe their content directly.

### Hand-named raster images (self-descriptive, safe to reference by purpose)
| Filename | Likely purpose |
|---|---|
| `Sun rise.png` | Hero background — illustrated sunrise/beach scene |
| `Hacker house.png` | Wordmark/logo graphic for "Hacker House" |
| `agenda.png` | Illustration accompanying the "Inside the room" / day-by-day agenda section |
| `details.png` | Illustration accompanying the stats/past-editions section |
| `footer trees.png` | Palm tree silhouette illustration used in the footer |
| `hackers.png` | Illustration accompanying the "Less Noise. More Signal." manifesto section |
| `goa_hindi.svg` | Devanagari-script "गोवा" (Goa) wordmark accent — bilingual branding element |

### Figma-exported SVGs (generic names — identify visually before reuse)
```
002-group-54-14.svg
2-47.svg                          (also referenced as the "2:47 pm Studio" logo mark)
008-group-54-324.svg
019-group-59467-54-3485.svg       (used near the agenda/day-cards section)
036-vector-54-3934.svg            (used near the FAQ section)
138-frame-1948755142-54-27257.svg (FAQ icon)
140-frame-1948755145-54-27273.svg (FAQ icon, reused across multiple FAQ rows)
149-group-54-27351.svg
155-group-54-27661.svg
179-vector-54-30944.svg           (footer decorative vector)
180-frame-1948754793-54-30952.svg (footer social icon — X/Twitter)
181-frame-1948754789-54-30958.svg (footer social icon — Telegram)
182-frame-1948754788-54-30962.svg (footer social icon — email)
```

### Fonts (media folder)
```
1a710777613e50ef-s.p.0dsr9mj7kd7mv.woff2   → Victor Mono, default/Latin subset (no restrictive unicode-range — this is the main file to embed if self-hosting)
11d07749a96308ac-s.p.1pby6vc151-5p.woff2   → Imbue, default/Latin subset
```
(Both fonts ship many additional per-script `.woff2` subset files for Cyrillic, Greek, Vietnamese, etc. — not needed unless supporting those scripts.)

**Guidance for reuse:** If the actual asset files are not available to you (e.g. you only have this reference doc, not the folder), do NOT invent filenames or fabricate visual content claiming to be these assets. Instead, redraw equivalent decorative elements (sunrise, palm trees, sun-ray icon, hand-drawn vector squiggles) from scratch in SVG/canvas using the exact color tokens in Section 2 — this preserves brand consistency without misrepresenting asset provenance.

---

## 7. Layout/content patterns observed on the live site

- **Hero:** full-bleed illustrated background, bold logo graphic, bilingual (English + Devanagari) wordmark, date/location line in monospace caps (`GOA, INDIA · 28–31 OCT 2026`), two CTAs (primary filled + secondary anchor-link).
- **Stats bar:** animated count-up numbers (Registrations / Projects / Hackers / Bounties) — implies JS-driven number animation, likely triggered on scroll-into-view.
- **Agenda cards:** four day-cards presented in a deliberately non-linear grid order (stylistic choice, not a bug) — each with a short 2–4 word tagline.
- **FAQ:** icon-per-question accordion (not a plain text accordion) using the `Frame-19487551xx` SVG icon set, "+" expand indicator.
- **Manifesto section:** punchy short-paragraph copy block with a single strong CTA, high-contrast (likely dark bg / bright text).
- **Footer:** repeats date/location + studio credit, social icons (X, Telegram, email), legal links, palm tree illustration bleeding off the bottom edge.
- **Sticker/tag elements:** small rotated pill/badge elements (e.g. hashtag stickers, "eyebrow" labels above headlines) — rotate 2–4° off-axis, hard-shadowed, high-contrast fill — recurring motif for callouts.

---

## 8. Quick-reference token block (drop-in CSS)

```css
:root{
  --green:      #0b6839;
  --green-dark: #074a28;
  --yellow:     #fee101;
  --pink:       #ff0080;
  --cream:      #fffbe8;
  --black:      #000;
  --white:      #fff;
  --radius:     .625rem;

  --font-display: 'Imbue', serif;
  --font-body:    'Victor Mono', ui-monospace, monospace;

  --gradient-brand:   linear-gradient(135deg, var(--green), var(--yellow));
  --gradient-shimmer: linear-gradient(135deg, var(--yellow), var(--cream), var(--yellow));

  --shadow-sm: 3px 3px 0 rgba(0,0,0,.25);
  --shadow-md: 6px 8px 0 rgba(0,0,0,.3);
  --shadow-lg: 8px 10px 0 rgba(0,0,0,.4);
}
```

---

## 9. Do / Don't for anyone extending this brand

**Do:**
- Use hard-offset, zero-blur shadows everywhere elevation is needed.
- Keep Victor Mono as the default body/UI font — even for dense paragraph text.
- Use yellow for primary actions and glow states; reserve pink for rare, high-impact accents (stamps, tags, one-off highlights).
- Rotate small badge/sticker elements 2–4° for a hand-placed, non-grid-perfect feel.
- Keep hover/active transitions fast (60–150ms).

**Don't:**
- Don't introduce soft/blurred drop shadows (`box-shadow: 0 4px 20px rgba(0,0,0,.1)` style) — breaks the sticker aesthetic immediately.
- Don't swap in a generic grotesque sans-serif as the body font.
- Don't overuse the pink accent as a base color — it's a pop, not a primary.
- Don't invent or claim specific original asset files that weren't actually provided — redraw equivalents from the token values instead.
