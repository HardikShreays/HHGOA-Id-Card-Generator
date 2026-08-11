// lib/constants.ts
// Brand tokens + shared config — Redesign v2 (see
// HH-GOA-2026-GENERATOR-REDESIGN-PLAN.md §2 and §4).
//
// Font note: the plan suggests next/font/local, but next/font/local mints a
// hashed, unpredictable font-family name per build — fine for CSS, but the
// canvas compositor (lib/canvasCompose.ts) needs to reference the *exact*
// family name in `ctx.font = "... <family>"` strings, and that name has to
// stay stable and known at authoring time. So instead we self-host the same
// files via plain `@font-face` rules in app/globals.css under fixed names
// ("Fraunces", "Noto Sans Devanagari", "JetBrains Mono", "Poppins") and
// reference those fixed names everywhere below. Same result (self-hosted,
// no runtime Google Fonts dependency, no FOUC risk once §5's
// document.fonts.ready fix lands) — just simpler to keep DOM and canvas in
// sync.

export const BRAND = {
  eventName: "HH Goa 2026",
  eventNameDevanagari: "गोवा",
  studioCredit: "2:47PM STUDIO",
  hashtag: "#FrameInGoa",
  dateRange: "28–31 OCT 2026",
  location: "GOA, INDIA",
  tagline: "4 days. one rhythm. everything intentional.",

  colors: {
    // Deep forest green — primary surface.
    forest: "#0B3D2E",
    forestDeep: "#062A20",
    // Parchment/cream — secondary surface (PFP + boarding-pass base).
    parchment: "#F6ECD9",
    // Gold — primary accent (borders, labels, stamps).
    gold: "#E8B923",
    // Coral/pink — loud accent, used sparingly.
    coral: "#E85D75",
    ink: "#12241C", // near-black text on parchment
    paper: "#FFF9EE", // off-white text on forest
  },

  fonts: {
    // Bold slab/display for headlines — Fraunces (variable, has the "black"
    // cut used for stamp-like wordmarks).
    display: "'Fraunces', 'Poppins', serif",
    // Devanagari-capable pairing for गोवा accents.
    devanagari: "'Noto Sans Devanagari', 'Poppins', sans-serif",
    // Monospace for ticket/ID data (flight-style fields, barcode captions).
    mono: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    // Body/UI font.
    body: "'Poppins', 'Inter', system-ui, sans-serif",
  },

  canvas: {
    pfpSize: 1200, // Format: Profile Frame — 1200x1200 square
    cardWidth: 1080, // Format: Builder ID / VIP Pass
    cardHeight: 1350,
    boardingWidth: 1080, // Format: Boarding Pass
    boardingHeight: 620,
    teamWidth: 1200, // Format: Team Frame
    teamHeight: 630,

    // Matches the photo-slot rect baked into public/assets/card-bg.png
    // (see scripts/gen-brand-assets.py — regenerate both together if either
    // changes).
    photoSlot: { x: 230, y: 210, width: 620, height: 826, cornerRadius: 28 },

    // Matches public/assets/boarding-bg.png's photo-slot rect.
    boardingPhotoSlot: { x: 60, y: 60, width: 340, height: 340, cornerRadius: 24 },
  },

  shareCaption: (name?: string) =>
    name
      ? `I just built my HH Goa 2026 badge, ${name}! 🌴`
      : `I just built my HH Goa 2026 frame! 🌴`,
};

// Builder ID / VIP Pass text layout — matches the "guide band" baked into
// card-bg.png (photoSlot above; band starts ~34px below the slot).
// Coordinates are canvas pixels, origin top-left, on the 1080x1350 card.
// Text block is shifted left of card-center (cx=470, not 540) and capped at
// maxWidth=760 (x: 90–850) to leave a dedicated column (x: 850–990) clear
// for the QR code — a long name at its largest shrink-to-fit size must
// never be able to reach into that column.
export const CARD_TEXT_LAYOUT = {
  // y values are the TOP of each text block (ctx.textBaseline = "top").
  name: { cx: 470, y: 1060, maxWidth: 760, maxFontSize: 54, minFontSize: 22, color: BRAND.colors.paper },
  teamPill: { cx: 470, y: 1120, maxWidth: 500, fontSize: 20, color: BRAND.colors.ink },
  role: { cx: 470, y: 1160, maxWidth: 760, maxFontSize: 26, minFontSize: 14, color: BRAND.colors.gold },
  builderTitle: { cx: 470, y: 1198, maxWidth: 760, maxFontSize: 22, minFontSize: 13, color: "rgba(255,249,238,0.82)" },
  idCode: { x: 90, y: 1266, fontSize: 20, color: "rgba(255,249,238,0.7)" },
  footer: { cx: 540, y: 1300, fontSize: 16, color: "rgba(255,249,238,0.5)" },
  /** Dedicated QR column — kept clear of all text above. */
  qr: { x: 850, y: 1020, size: 140 },
};

// Boarding Pass text layout. Canvas is 1080x620.
export const BOARDING_TEXT_LAYOUT = {
  flightLine: { x: 430, y: 68, fontSize: 22, color: BRAND.colors.ink },
  passengerLabel: { x: 430, y: 130, fontSize: 14, color: "rgba(18,36,28,0.55)" },
  passengerValue: { x: 430, y: 150, maxWidth: 560, maxFontSize: 34, minFontSize: 18, color: BRAND.colors.ink },
  fieldsRow: { x: 430, y: 240, gap: 190, fontSize: 14, valueFontSize: 22, color: "rgba(18,36,28,0.55)", valueColor: BRAND.colors.ink },
  classLine: { x: 430, y: 340, maxWidth: 560, fontSize: 18, color: BRAND.colors.coral },
  barcodeCaption: { x: 430, y: 560, fontSize: 14, color: "rgba(18,36,28,0.55)" },
};

// Team Frame text layout. Canvas is 1200x630.
export const TEAM_TEXT_LAYOUT = {
  teamName: { cx: 600, y: 56, maxWidth: 1080, maxFontSize: 48, minFontSize: 26, color: BRAND.colors.paper },
  memberRowY: 150,
  memberCaptionOffset: 18,
  footer: { cx: 600, y: 588, fontSize: 16, color: "rgba(255,249,238,0.55)" },
};

// PFP text layout. Canvas is 1200x1200. Ring band (frame-pfp.png) occupies
// the annulus between r=430 (inner, photo) and r=596 (outer) — name/title
// MUST stay inside r=430 (i.e. y <= 1030 for anything centered at cx=600)
// or it collides with the ring's baked-in circular text.
export const PFP_TEXT_LAYOUT = {
  name: { cx: 600, y: 860, maxWidth: 700, maxFontSize: 40, minFontSize: 20, color: BRAND.colors.paper },
  builderTitle: { cx: 600, y: 916, maxWidth: 700, maxFontSize: 20, minFontSize: 13, color: "rgba(255,249,238,0.85)" },
  /** Legibility scrim behind the text, drawn before it — top y and height
   *  of a bottom-fade gradient over the photo inside the inner circle. */
  scrim: { y: 780, height: 250 },
};

// Upload validation / performance limits.
export const UPLOAD_LIMITS = {
  maxFileSizeBytes: 15 * 1024 * 1024, // 15MB cap
  maxLongEdgePx: 2500, // downscale on load if longer edge exceeds this
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".heif"],
  acceptedMimePrefixes: ["image/"],
  heicMimeTypes: ["image/heic", "image/heif"],
  heicExtensions: [".heic", ".heif"],
};

export type UploadedImage = {
  /** Object URL pointing at the (possibly downscaled/converted) working image */
  objectUrl: string;
  /** Original file name, kept for reference/debugging */
  fileName: string;
  width: number;
  height: number;
};

/** The four output formats (plan §3 — up from 2). */
export type Format = "pfp" | "card" | "boarding" | "team";

/** A cropped image ready to hand to the canvas compositor. */
export type CroppedImage = {
  objectUrl: string;
  width: number;
  height: number;
};

// Crop-stage config per format.
export const FORMAT_CONFIG: Record<
  Format,
  {
    label: string;
    shortLabel: string;
    aspect: number;
    cropShape: "round" | "rect";
    maxOutputEdge: number;
    outputDims: string;
    description: string;
  }
> = {
  pfp: {
    label: "Profile Frame",
    shortLabel: "Frame",
    aspect: 1, // 1:1 square, matches X's circular PFP crop
    cropShape: "round",
    maxOutputEdge: 1400,
    outputDims: "1200×1200",
    description: "A circular scalloped frame for your PFP.",
  },
  card: {
    label: "Builder ID / VIP Pass",
    shortLabel: "ID Card",
    aspect: 3 / 4, // portrait photo slot
    cropShape: "rect",
    maxOutputEdge: 1600,
    outputDims: "1080×1350",
    description: "Your full builder badge — name, role, generated title, ID code, QR.",
  },
  boarding: {
    label: "Boarding Pass",
    shortLabel: "Boarding Pass",
    aspect: 1, // square photo slot
    cropShape: "round",
    maxOutputEdge: 1200,
    outputDims: "1080×620",
    description: "A ticket-stub pass — flight, seat, gate, class, all derived from your data.",
  },
  team: {
    label: "Team Frame",
    shortLabel: "Team Frame",
    aspect: 1, // each member slot is square
    cropShape: "round",
    maxOutputEdge: 1000,
    outputDims: "1200×630",
    description: "Bring 2–4 teammates into one combined frame.",
  },
};
