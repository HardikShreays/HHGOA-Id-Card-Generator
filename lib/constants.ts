// lib/constants.ts
// Brand tokens + shared config. Colors/fonts are placeholders until the
// organizers hand over the real HH Goa 2026 brand kit (see plan §11).

export const BRAND = {
  eventName: "HH Goa 2026",
  hashtag: "#FrameInGoa",
  colors: {
    primary: "#0F7A6C", // TODO: replace with official HH Goa 2026 primary
    accent: "#F2B807", // TODO: replace with official accent
    background: "#0B1220", // TODO: replace with official background
    text: "#FFFFFF", // TODO: replace with official text color
  },
  fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", // TODO: swap for event font when provided
  canvas: {
    pfpSize: 1200, // Format A output: 1200x1200 square
    cardWidth: 1080, // Format B output
    cardHeight: 1350,
    // Matches the photo-slot rect baked into public/assets/card-bg.png
    // (see scripts/gen-brand-assets — regenerate both together if either changes).
    photoSlot: { x: 230, y: 210, width: 620, height: 826, cornerRadius: 28 },
  },
  shareCaption: (name?: string) =>
    name
      ? `I just built my HH Goa 2026 badge, ${name}! 🌴`
      : `I just built my HH Goa 2026 frame! 🌴`,
};

// Format B text layout — matches the "guide band" baked into card-bg.png
// (see photoSlot above; band starts ~34px below the slot and runs ~210px tall).
// Coordinates are canvas pixels, origin top-left, on the 1080x1350 card.
export const CARD_TEXT_LAYOUT = {
  // y values are the TOP of each text block (ctx.textBaseline = "top").
  name: { cx: 540, y: 1082, maxWidth: 900, maxFontSize: 54, minFontSize: 26, color: "#FFFFFF" },
  role: { cx: 540, y: 1148, maxWidth: 900, maxFontSize: 28, minFontSize: 16, color: "#F2B807" },
  builderTitle: { cx: 540, y: 1192, maxWidth: 900, maxFontSize: 22, minFontSize: 14, color: "rgba(255,255,255,0.78)" },
  footer: { cx: 540, y: 1300, fontSize: 18, color: "rgba(255,255,255,0.5)", text: "HH Goa 2026 · Builder" },
};

// Upload validation / performance limits (Phase 1 + Phase 8 perf checklist)
export const UPLOAD_LIMITS = {
  maxFileSizeBytes: 15 * 1024 * 1024, // 15MB cap, per plan §4 Phase 1
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

/** The two output formats, per plan §0. */
export type Format = "pfp" | "card";

/** A cropped image ready to hand to the (Phase 3) canvas compositor. */
export type CroppedImage = {
  objectUrl: string;
  width: number;
  height: number;
};

// Crop-stage config per format (plan §4 Phase 2 step 2).
export const FORMAT_CONFIG: Record<
  Format,
  { label: string; shortLabel: string; aspect: number; cropShape: "round" | "rect"; maxOutputEdge: number }
> = {
  pfp: {
    label: "PFP Frame",
    shortLabel: "Frame",
    aspect: 1, // 1:1 square, matches X's circular PFP crop
    cropShape: "round",
    maxOutputEdge: 1400,
  },
  card: {
    label: "Builder ID Card",
    shortLabel: "ID Card",
    aspect: 3 / 4, // portrait photo slot; refine once card-bg.png is designed
    cropShape: "rect",
    maxOutputEdge: 1600,
  },
};
