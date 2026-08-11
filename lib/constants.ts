export const BRAND = {
  eventName: "HH Goa 2026",
  eventNameDevanagari: "गोवा",
  studioCredit: "2:47PM STUDIO",
  hashtag: "#FrameInGoa",
  dateRange: "28–31 OCT 2026",
  location: "GOA, INDIA",
  tagline: "4 days. one rhythm. everything intentional.",
  colors: {
    forest: "#0B3D2E",
    forestDeep: "#062A20",
    parchment: "#F6ECD9",
    gold: "#E8B923",
    coral: "#E85D75",
    ink: "#12241C",
    paper: "#FFF9EE",
  },
  fonts: {
    display: "'Fraunces', 'Poppins', serif",
    devanagari: "'Noto Sans Devanagari', sans-serif",
    mono: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    body: "'Poppins', 'Inter', system-ui, sans-serif",
  },
  // next/font CSS variables — canvas reads these so exports use the same
  // loaded faces as the UI (avoids fallback-font PNGs on a cold cache).
  fontVars: {
    display: "--font-fraunces",
    body: "--font-poppins",
    mono: "--font-jetbrains",
    devanagari: "--font-noto-deva",
  },
  canvas: {
    pfpSize: 1200,
    cardWidth: 1080,
    cardHeight: 1350,
    boardingWidth: 1080,
    boardingHeight: 620,
    teamWidth: 1200,
    teamHeight: 630,
    // Must match the photo well baked into public/assets/card-bg.png
    photoSlot: { x: 270, y: 186, width: 540, height: 548, cornerRadius: 24 },
    pfpPhoto: { cx: 600, cy: 508, r: 318 },
    boardingPhoto: { x: 48, y: 148, size: 196 },
  },
  shareCaption: (name?: string) =>
    name
      ? `I just framed myself for HH Goa 2026 — ${name}. 4 days. one rhythm.`
      : `I just framed myself for HH Goa 2026. 4 days. one rhythm.`,
};

export const CARD_TEXT_LAYOUT = {
  name: { cx: 540, y: 762, maxWidth: 900, maxFontSize: 48, minFontSize: 24 },
  teamPill: { cx: 540, y: 822 },
  role: { cx: 540, y: 872, maxWidth: 900, maxFontSize: 24, minFontSize: 14 },
  builderTitle: { cx: 540, y: 910, maxWidth: 900, maxFontSize: 22, minFontSize: 14 },
  idCode: { x: 72, y: 1008 },
  barcode: { x: 72, y: 1054, width: 420, height: 72 },
  qr: { x: 848, y: 1000, size: 160 },
  footer: { cx: 540, y: 1284 },
};

export const PFP_TEXT_LAYOUT = {
  pillY: 78,
  name: { cx: 600, y: 880, maxWidth: 920, maxFontSize: 44, minFontSize: 22 },
  title: { cx: 600, y: 940, maxWidth: 880, maxFontSize: 22, minFontSize: 14 },
  footerY: 1128,
};

export const BOARDING_LAYOUT = {
  passenger: { x: 272, y: 168 },
  seat: { x: 272, y: 268 },
  gate: { x: 500, y: 268 },
  klass: { x: 272, y: 368 },
  barcode: { x: 48, y: 520, width: 700, height: 56 },
  stubId: { cx: 940, y: 520 },
  perforationX: 820,
};

export const UPLOAD_LIMITS = {
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxLongEdgePx: 2500,
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".heic", ".heif"],
  acceptedMimePrefixes: ["image/"],
  heicMimeTypes: ["image/heic", "image/heif"],
  heicExtensions: [".heic", ".heif"],
};

export type UploadedImage = {
  objectUrl: string;
  fileName: string;
  width: number;
  height: number;
};

export type Format = "pfp" | "card" | "boarding" | "team";

export type CroppedImage = {
  objectUrl: string;
  width: number;
  height: number;
};

export const FORMAT_CONFIG: Record<
  Format,
  {
    label: string;
    shortLabel: string;
    aspect: number;
    cropShape: "round" | "rect";
    maxOutputEdge: number;
    width: number;
    height: number;
    blurb: string;
    filename: string;
  }
> = {
  pfp: {
    label: "Profile Frame",
    shortLabel: "Frame",
    aspect: 1,
    cropShape: "round",
    maxOutputEdge: 1400,
    width: 1200,
    height: 1200,
    blurb: "Circular PFP with a गोवा badge and your builder title.",
    filename: "hh-goa-2026-frame.png",
  },
  card: {
    label: "Builder Pass",
    shortLabel: "Pass",
    aspect: 540 / 548,
    cropShape: "rect",
    maxOutputEdge: 1600,
    width: 1080,
    height: 1350,
    blurb: "VIP badge — name, team, ID code, barcode, and a share QR.",
    filename: "hh-goa-2026-builder-pass.png",
  },
  boarding: {
    label: "Boarding Pass",
    shortLabel: "Ticket",
    aspect: 1,
    cropShape: "round",
    maxOutputEdge: 900,
    width: 1080,
    height: 620,
    blurb: "Ticket stub. Seat from your name. Gate is your team.",
    filename: "hh-goa-2026-boarding-pass.png",
  },
  team: {
    label: "Team Frame",
    shortLabel: "Team",
    aspect: 1,
    cropShape: "round",
    maxOutputEdge: 900,
    width: 1200,
    height: 630,
    blurb: "Bring 2–4 teammates into one combined frame.",
    filename: "hh-goa-2026-team-frame.png",
  },
};

export const FORMATS: Format[] = ["pfp", "card", "boarding", "team"];
