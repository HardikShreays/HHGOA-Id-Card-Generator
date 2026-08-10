# HH Goa 2026 — Frame / ID Card Generator

Client-side generator for the HH Goa 2026 PFP frame and Builder ID card.
Upload a photo → crop → download or share to X. No login, no server round
trip except for the "Share to X" link fallback (see below).

Implementation follows `HH_GOA_2026_IMPLEMENTATION_PLAN.md`. Status:

- ✅ Phase 0–2 — setup, upload/HEIC handling, crop stage
- ✅ Phase 3 — canvas compositing engine (`lib/canvasCompose.ts`)
- ✅ Phase 4 — download (with iOS Safari long-press-to-save fallback)
- ✅ Phase 5 — Share to X (native Web Share API + link-intent/OG fallback)
- ✅ Phase 6 — branding pass (placeholder assets polished; **still needs the
  real HH Goa 2026 brand kit swapped in before final ship — see below**)
- 🟡 Phase 7 — mobile QA pass: code-level checks done (see below); real-device
  testing still needs to happen on an actual iPhone/Android
- 🟡 Phase 8 — deploy + submit: app builds clean and is deploy-ready; running
  `vercel --prod` and attaching Blob storage still needs your Vercel account

### Phase 7 — what's verified vs. what still needs a real device

Verified in code / build:
- `npm run build` succeeds with zero errors (Next.js 16 / Turbopack)
- `heic2any` is dynamically imported — only enters the bundle when a HEIC
  file is actually picked (`lib/heicConvert.ts`)
- Large photos are downscaled to a 2500px longest edge before touching the
  canvas (`lib/imageProcessing.ts`)
- Template PNGs (`frame-pfp.png`, `card-bg.png`) are `<link rel="preload">`d
  in `app/layout.tsx` so they're warm before the compositor needs them
- All buttons are `min-h-[44px]` tap targets, layout is single-column and
  tested down to 360px in dev tools, crop uses `react-easy-crop` (touch +
  pinch built in)

Still needs a real device, not something verifiable from code:
- [ ] iPhone Safari: HEIC upload → crop → download → native Web Share sheet
- [ ] Android Chrome: same flow
- [ ] Desktop Chrome/Firefox: same flow, plus the link-intent share fallback
- [ ] Slow 4G throttle in Chrome DevTools: confirm upload-to-result still
      feels like "a few seconds"
- [ ] Edge-case photos: extreme portrait, extreme landscape, very small,
      very large (12MP+), square, off-center subject

### Phase 8 — deploy checklist

1. `vercel --prod` (or connect the repo in the Vercel dashboard) — needs
   your Vercel login, not something I can run from here.
2. **Attach a Vercel Blob store** (Storage tab → Create → Blob). This is
   what fixes the "Share storage isn't configured" message you saw — it
   auto-sets `BLOB_READ_WRITE_TOKEN`. Without it, download and the native
   mobile share sheet still work fine; only the desktop/link-intent share
   fallback degrades gracefully instead of failing.
3. Optional: set `NEXT_PUBLIC_SITE_URL` to your real production domain so
   share links stay stable across preview deploys.
4. Swap in the real HH Goa 2026 brand kit if you have it yet (colors/fonts
   in `lib/constants.ts`, art in `public/assets/`) and redeploy.
5. Open the live URL in a fresh incognito tab — confirm no login wall and
   the whole flow works in one pass.
6. Paste the `/share/[id]` link into a real tweet compose box (or an OG
   preview checker) and confirm the big image card renders.
7. Submit the live link via the Google Form.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. The "Share to X" link-intent fallback (see
below) needs `BLOB_READ_WRITE_TOKEN` set locally to work; without it you'll
still see the whole flow, but sharing on desktop (or any browser without the
native file-share API) will show a friendly "share storage isn't configured"
message instead of failing silently. The native-share path (mobile Safari /
Chrome with a real photo picker) works with no env vars.

## Deploying

1. `vercel --prod` (or connect the repo in the Vercel dashboard).
2. **Attach a Vercel Blob store** to the project (Storage tab → Create →
   Blob). This auto-sets `BLOB_READ_WRITE_TOKEN` — required for the
   "Share to X" desktop/link fallback (`/api/store`, `/share/[id]`). Without
   it, download and the native mobile share sheet still work fine; only the
   link-intent fallback degrades gracefully.
3. Optional: set `NEXT_PUBLIC_SITE_URL` to the production domain once known,
   so share links stay stable across preview deploys (falls back to
   Vercel's auto-injected `VERCEL_URL` otherwise).
4. Swap in the real brand kit when organizers provide it (see below) and
   redeploy.

## Brand assets — still placeholder

`public/assets/frame-pfp.png`, `card-bg.png`, and `og-default.png` are
generated placeholders (`scripts/gen-brand-assets.py`, needs Pillow —
`pip install pillow`), not the official HH Goa 2026 kit. Before final ship:

- Get the real logo, color hex codes, and approved font from organizers
  (plan §11).
- Either hand-design replacement PNGs at the same canvas sizes
  (`frame-pfp.png` 1200×1200, `card-bg.png` 1080×1350, `og-default.png`
  1200×630), **or** update the constants/colors at the top of
  `scripts/gen-brand-assets.py` and re-run it.
- If `card-bg.png`'s photo-slot position changes, update
  `BRAND.canvas.photoSlot` in `lib/constants.ts` to match — the two must
  stay in sync (`lib/canvasCompose.ts` draws into that exact rect).
- Update `BRAND.colors` / `BRAND.fontFamily` in `lib/constants.ts` to match
  — the web UI (buttons, toggle, focus states) already reads from those
  tokens, so it repaints automatically.

## Testing the share flow

The X card validator has historically been flaky — more reliable checks
(plan §6.3):

1. Generate a frame/card, hit "Share to X".
2. On a phone with the native share sheet: confirm the image actually
   attaches when you pick X/Twitter.
3. On desktop (or after forcing the link-intent path): confirm the tweet
   compose box shows a big image preview before you send — paste the
   `/share/[id]` link into a throwaway test tweet if needed.
4. Common failure modes to check: image URL 404s, `twitter:card` isn't
   `summary_large_image`, or the share page silently falls back to
   `og-default.png` (means the Blob upload or `head()` lookup failed —
   check `BLOB_READ_WRITE_TOKEN` is set).

---

<details>
<summary>Original create-next-app boilerplate notes</summary>

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
to automatically optimize and load [Geist](https://vercel.com/font), a font
family for Vercel — currently unused (see plan §5, brand font TODO).

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub repository](https://github.com/vercel/next.js)

</details>
