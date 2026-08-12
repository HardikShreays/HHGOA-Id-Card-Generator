# HH Goa 2026 — Social Graphic Generator

A mobile-first, client-side generator for three HH Goa 2026 social formats:

- 1200×1200 PFP Frame
- 1080×1350 Builder ID Card
- 1200×630 Team Frame for 2–3 people

The app follows the tropical-neubrutalist system from `HHGOA_DESIGN_SYSTEM.md`: jungle green, sunshine yellow, hot pink, Imbue display type, Victor Mono UI type, hard shadows, and official Goa artwork.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Product flow

1. Choose a destination from the four arrows in the Goa signpost artwork.
2. Use the one-screen editor to upload JPG, PNG, HEIC, or HEIF and enter details.
3. FaceDetector initializes the crop when supported; manual drag and zoom remain available.
4. Watch the PNG preview update in place, then download or share it to X with `#FrameInGoa`.
5. The fourth arrow opens `hhgoa.com`.

Uploads, crops, and image composition remain in the browser. The only server request is the optional Share-to-X fallback, which stores the final PNG temporarily so X can render it as an OG image.

## Brand assets

- Source exports: `assets/`
- Web-ready copies: `public/brand/`
- Self-hosted fonts: `public/fonts/`
- Web tokens and animation: `app/globals.css`
- Canvas tokens and geometry: `lib/constants.ts`
- Export compositor: `lib/canvasCompose.ts`

The compositor loads official SVG/PNG layers directly; there are no placeholder background templates to regenerate.

## Share setup

Attach Vercel Blob to the deployment so `BLOB_READ_WRITE_TOKEN` is available. Without it, image generation and download still work; the desktop/link share fallback shows an explanatory error.

Optionally set `NEXT_PUBLIC_SITE_URL` to the production domain.

## Verification checklist

- `npm run build`
- Test all three formats at 360px and desktop widths.
- Test JPG, PNG, and a real iPhone HEIC.
- Test portrait, landscape, off-center, and long-name inputs.
- Confirm PFP artwork survives X’s circular crop.
- Confirm ID text, barcode, and QR do not overlap.
- Confirm both 2- and 3-person team layouts.
- Confirm desktop download and iOS long-press save.
- Confirm the X caption includes `#FrameInGoa` and the share page shows the generated image.
