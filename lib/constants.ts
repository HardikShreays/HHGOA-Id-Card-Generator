export const BRAND = {
  eventName: "HH Goa 2026",
  eventNameDevanagari: "गोवा",
  studioCredit: "2:47PM STUDIO",
  hashtag: "#FrameInGoa",
  dateRange: "28–31 OCT 2026",
  location: "GOA, INDIA",
  tagline: "Less noise. More signal. Build your way to Goa.",

  colors: {
    forest: "#0B6839",
    forestDeep: "#07502C",
    parchment: "#FFFBE8",
    gold: "#FEE101",
    coral: "#FF0080",
    ink: "#000000",
    paper: "#FFFFFF",
    leaf: "#9AC95F",
  },

  fonts: {
    display: "'Imbue', Georgia, serif",
    devanagari: "'Victor Mono', ui-monospace, monospace",
    mono: "'Victor Mono', ui-monospace, monospace",
    body: "'Victor Mono', ui-monospace, monospace",
  },

  canvas: {
    pfpSize: 1200,
    cardWidth: 1080,
    cardHeight: 1350,
    teamWidth: 1200,
    teamHeight: 630,
    photoSlot: { x: 72, y: 224, width: 628, height: 776, cornerRadius: 24 },
  },

  shareCaption: (name?: string, idCode?: string) => {
    const base = name
      ? `${name} is building toward HH Goa 2026. See you by the signal.`
      : "I just built my HH Goa 2026 frame. See you by the signal.";
    return idCode ? `${base} · #${idCode}` : base;
  },
};

export const CARD_TEXT_LAYOUT = {
  name: { x: 72, y: 1028, maxWidth: 740, maxFontSize: 72, minFontSize: 34, color: BRAND.colors.forest },
  role: { x: 76, y: 1110, maxWidth: 680, maxFontSize: 27, minFontSize: 16, color: BRAND.colors.ink },
  builderTitle: { x: 76, y: 1158, maxWidth: 680, maxFontSize: 23, minFontSize: 14, color: BRAND.colors.coral },
  idCode: { x: 76, y: 1235, fontSize: 18, color: BRAND.colors.ink },
  qr: { x: 850, y: 1080, size: 152 },
};

export const PFP_TEXT_LAYOUT = {
  name: { cx: 600, y: 900, maxWidth: 650, maxFontSize: 52, minFontSize: 25, color: BRAND.colors.paper },
  builderTitle: { cx: 600, y: 958, maxWidth: 650, maxFontSize: 22, minFontSize: 13, color: BRAND.colors.gold },
  scrim: { y: 790, height: 240 },
};

export const TEAM_TEXT_LAYOUT = {
  nameY: 50,
  memberY: 170,
  footerY: 590,
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

export type Format = "pfp" | "card" | "team";

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
    description: "A bold, circular HH Goa frame made for your X profile.",
  },
  card: {
    label: "Builder ID Card",
    shortLabel: "ID Card",
    aspect: 628 / 776,
    cropShape: "rect",
    maxOutputEdge: 1600,
    outputDims: "1080×1350",
    description: "A share-ready event badge with your role and builder title.",
  },
  team: {
    label: "Team Frame",
    shortLabel: "Team",
    aspect: 1,
    cropShape: "round",
    maxOutputEdge: 1200,
    outputDims: "1200×630",
    description: "A 2–3 person team drop for building together.",
  },
};
