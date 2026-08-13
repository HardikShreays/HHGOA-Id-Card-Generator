import { BRAND, CARD_TEXT_LAYOUT, PFP_TEXT_LAYOUT, TEAM_TEXT_LAYOUT } from "./constants";

export type BuilderFields = {
  name: string;
  role: string;
  teamName?: string;
  socials?: { x?: string; github?: string; instagram?: string };
};

export type TeamMember = {
  name: string;
  role: string;
  imageSrc: string;
};

export type TeamFields = {
  teamName: string;
  members: TeamMember[];
};

const staticImageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string, timeoutMs = 10000): Promise<HTMLImageElement> {
  const cacheable = src.startsWith("/");
  const cached = cacheable ? staticImageCache.get(src) : undefined;
  if (cached) return cached;

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Only opt into CORS for genuinely remote URLs. Setting crossOrigin on
    // same-origin/relative assets is unnecessary and has tripped up some
    // mobile browsers, so we skip it for "/brand/…", blob:, and data: srcs.
    if (/^https?:\/\//i.test(src)) img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => reject(new Error(`Timed out loading image: ${src}`)), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });

  if (cacheable) {
    staticImageCache.set(src, pending);
    pending.catch(() => staticImageCache.delete(src));
  }
  return pending;
}

const FONT_STACK = [
  { family: "Imbue", weight: "700" },
  { family: "Victor Mono", weight: "400" },
  { family: "Victor Mono", weight: "500" },
  { family: "Victor Mono", weight: "600" },
  { family: "Victor Mono", weight: "700" },
];

let fontsReadyPromise: Promise<void> | null = null;

export function ensureFontsLoaded(): Promise<void> {
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    try {
      await Promise.all(
        FONT_STACK.map(({ family, weight }) => document.fonts.load(`normal ${weight} 32px "${family}"`))
      );
      await document.fonts.ready;
    } catch {
      // Canvas rendering remains usable with system fallbacks.
    }
  })();
  return fontsReadyPromise;
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const srcAspect = img.width / img.height;
  const destAspect = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (srcAspect > destAspect) {
    sw = img.height * destAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / destAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  lineWidth = 0
) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && lineWidth) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function dottedBorderPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  dotSpacing = 16,
  dotRadius = 3,
  color = BRAND.colors.gold
) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = dotRadius * 2;
  ctx.setLineDash([1, Math.max(2, dotSpacing - 1)]);
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/**
 * Exports a canvas to a Blob without ever hanging.
 *
 * `canvas.toBlob` is unreliable on some mobile browsers (notably iOS Safari):
 * the callback can fire with `null`, or never fire at all for large canvases.
 * When that happens we fall back to the synchronous `toDataURL` path, which is
 * far more consistent, so the live preview can always resolve.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
  timeoutMs = 4000
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (blob: Blob) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(blob);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(error);
    };

    const fallbackToDataUrl = () => {
      try {
        const dataUrl =
          quality != null ? canvas.toDataURL(type, quality) : canvas.toDataURL(type);
        const commaIndex = dataUrl.indexOf(",");
        const meta = dataUrl.slice(0, commaIndex);
        const base64 = dataUrl.slice(commaIndex + 1);
        const mime = meta.match(/:(.*?);/)?.[1] ?? type;
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        finish(new Blob([bytes], { type: mime }));
      } catch (error) {
        fail(error instanceof Error ? error : new Error("Canvas export failed."));
      }
    };

    const timer = window.setTimeout(fallbackToDataUrl, timeoutMs);

    try {
      canvas.toBlob(
        (blob) => (blob ? finish(blob) : fallbackToDataUrl()),
        type,
        quality
      );
    } catch {
      fallbackToDataUrl();
    }
  });
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  family: string,
  maxWidth: number,
  minSize: number,
  maxSize: number
) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minSize: number,
  maxSize: number,
  color: string,
  weight: string,
  family: string,
  align: CanvasTextAlign = "center"
) {
  if (!text) return;
  const size = fitFontSize(ctx, text, weight, family, maxWidth, minSize, maxSize);
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y, maxWidth);
}

export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function computeBuilderIdCode(fields: Pick<BuilderFields, "name" | "role">): string {
  const seed = hashSeed(`${fields.name.trim().toLowerCase()}|${fields.role.trim().toLowerCase()}`);
  return `HH-GOA-${(seed % 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
}

export function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  color = BRAND.colors.ink
) {
  ctx.save();
  ctx.fillStyle = color;
  let cursor = x;
  let s = seed || 1;
  while (cursor < x + w) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const barW = 2 + ((s >>> 0) % 5);
    if (cursor + barW > x + w) break;
    ctx.fillRect(cursor, y, barW, h);
    cursor += barW + 3 + ((s >>> 8) % 4);
  }
  ctx.restore();
}

export async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  data: string
) {
  const QRCode = (await import("qrcode")).default;
  const offscreen = document.createElement("canvas");
  await QRCode.toCanvas(offscreen, data, {
    width: size,
    margin: 1,
    color: { dark: BRAND.colors.ink, light: BRAND.colors.parchment },
  });
  ctx.drawImage(offscreen, x, y, size, size);
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  color: string,
  rows = 2
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let row = 0; row < rows; row++) {
    ctx.beginPath();
    const rowY = y + row * 22;
    ctx.moveTo(x, rowY);
    for (let px = 0; px < width; px += 40) {
      ctx.quadraticCurveTo(x + px + 10, rowY - 10, x + px + 20, rowY);
      ctx.quadraticCurveTo(x + px + 30, rowY + 10, x + px + 40, rowY);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalmDoodle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, Math.abs(scale));
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 120);
  ctx.quadraticCurveTo(8, 58, 0, 0);
  ctx.stroke();
  [-1.1, -.55, 0, .55, 1.1].forEach((angle) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(38, -12, 72, 12);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

export async function drawFrame(userImageSrc: string, fields?: BuilderFields): Promise<Blob> {
  const size = BRAND.canvas.pfpSize;
  await ensureFontsLoaded();
  const [userImg, frame] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/brand/final-pfp.svg"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  const photoRadius = 444;
  ctx.save();
  ctx.beginPath();
  ctx.arc(600, 600, photoRadius, 0, Math.PI * 2);
  ctx.clip();
  if (userImageSrc === "/brand/no-image-placeholder.png") {
    // Preserve the full placeholder artwork so its bottom label remains visible.
    ctx.drawImage(userImg, 156, 156, 888, 888);
  } else {
    drawImageCover(ctx, userImg, 156, 156, 888, 888);
  }
  ctx.restore();
  ctx.drawImage(frame, 0, 0, size, size);

  const nameValue = fields?.name.trim() ?? "";
  const roleValue = fields?.role.trim() ?? "";
  if (nameValue || roleValue) {
    const yellowOuterRadius = 478;
    const gradientBottom = 600 + yellowOuterRadius;
    const scrim = ctx.createLinearGradient(0, 790, 0, gradientBottom);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,.82)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(600, 600, yellowOuterRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = scrim;
    ctx.fillRect(600 - yellowOuterRadius, 790, yellowOuterRadius * 2, gradientBottom - 790);
    ctx.restore();

    const name = PFP_TEXT_LAYOUT.name;
    drawFittedText(ctx, nameValue || "YOUR NAME", name.cx, name.y, name.maxWidth, name.minFontSize, name.maxFontSize, BRAND.colors.paper, "700", BRAND.fonts.display);
    const role = PFP_TEXT_LAYOUT.builderTitle;
    drawFittedText(ctx, roleValue.toUpperCase() || "STACK / ROLE", role.cx, role.y, role.maxWidth, role.minFontSize, role.maxFontSize, BRAND.colors.coral, "700", BRAND.fonts.mono);
  }

  return canvasToBlob(canvas);
}

export async function drawIdCard(userImageSrc: string, fields: BuilderFields): Promise<Blob> {
  const { cardWidth: w, cardHeight: h, photoSlot } = BRAND.canvas;
  await ensureFontsLoaded();
  const [userImg, builderPass] = await Promise.all([
    loadImage(userImageSrc),
    loadImage("/brand/final-builder-pass.svg"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(builderPass, 0, 0, w, h);

  ctx.save();
  roundedRectPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius);
  ctx.clip();
  if (userImageSrc === "/brand/no-image-placeholder.png") {
    ctx.drawImage(userImg, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height);
  } else {
    drawImageCover(ctx, userImg, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height);
  }
  ctx.restore();
  ctx.strokeStyle = BRAND.colors.ink;
  ctx.lineWidth = 5;
  roundedRectPath(ctx, photoSlot.x, photoSlot.y, photoSlot.width, photoSlot.height, photoSlot.cornerRadius);
  ctx.stroke();

  // Clear the template's sample details while preserving its artwork and footer.
  ctx.fillStyle = BRAND.colors.parchment;
  ctx.fillRect(48, 850, w - 96, 320);

  const name = fields.name.trim();
  const role = fields.role.trim();
  const nameLayout = CARD_TEXT_LAYOUT.name;
  drawFittedText(ctx, name, nameLayout.x, nameLayout.y, nameLayout.maxWidth, nameLayout.minFontSize, nameLayout.maxFontSize, nameLayout.color, "700", BRAND.fonts.display, "left");
  const roleLayout = CARD_TEXT_LAYOUT.role;
  drawFittedText(ctx, role.toUpperCase(), roleLayout.x, roleLayout.y, roleLayout.maxWidth, roleLayout.minFontSize, roleLayout.maxFontSize, roleLayout.color, "700", BRAND.fonts.mono, "left");
  const { generateBuilderTitle } = await import("./builderTitle");
  const titleLayout = CARD_TEXT_LAYOUT.builderTitle;
  drawFittedText(ctx, `“${generateBuilderTitle(role || name)}”`, titleLayout.x, titleLayout.y, titleLayout.maxWidth, titleLayout.minFontSize, titleLayout.maxFontSize, titleLayout.color, "700", BRAND.fonts.mono, "left");

  const idCode = computeBuilderIdCode(fields);
  const seed = hashSeed(`${name.toLowerCase()}|${role.toLowerCase()}`);
  const idLayout = CARD_TEXT_LAYOUT.idCode;
  ctx.font = `700 ${idLayout.fontSize}px ${BRAND.fonts.mono}`;
  ctx.fillStyle = idLayout.color;
  ctx.textAlign = "left";
  ctx.fillText(`#${idCode}`, idLayout.x, idLayout.y);
  drawBarcode(ctx, 280, 1120, 470, 30, seed);

  const socialLines = [
    [
      fields.socials?.x ? `X @${fields.socials.x}` : "",
      fields.socials?.github ? `GH @${fields.socials.github}` : "",
    ].filter(Boolean).join("  ·  "),
    fields.socials?.instagram ? `IG @${fields.socials.instagram}` : "",
  ].filter(Boolean);
  if (socialLines.length) {
    ctx.font = `600 14px ${BRAND.fonts.mono}`;
    ctx.fillStyle = BRAND.colors.ink;
    socialLines.forEach((line, index) => {
      ctx.fillText(line, 360, 1012 + index * 46, 390);
    });
  }
  if (fields.teamName?.trim()) {
    ctx.font = `600 20px ${BRAND.fonts.mono}`;
    ctx.fillStyle = BRAND.colors.coral;
    ctx.fillText(`Team ${fields.teamName.trim()}`, 76, 950, 500);
  }

  const qr = CARD_TEXT_LAYOUT.qr;
  try {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    await drawQRCode(ctx, qr.x, qr.y, qr.size, `${origin}/share/${idCode}`);
  } catch {
    // QR is a progressive enhancement; never block the export.
  }
  return canvasToBlob(canvas);
}

export async function drawTeamFrame(fields: TeamFields): Promise<Blob> {
  const { teamWidth: w, teamHeight: h } = BRAND.canvas;
  const members = fields.members.slice(0, 3);
  if (members.length < 2) throw new Error("Add at least two teammates.");

  await ensureFontsLoaded();
  const [hackerHouse, goaImg, ticker, ...photos] = await Promise.all([
    loadImage("/brand/hacker-house.png"),
    loadImage("/brand/goa-hindi.svg"),
    loadImage("/brand/ticker.svg"),
    ...members.map((member) => loadImage(member.imageSrc)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.fillStyle = BRAND.colors.forest;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BRAND.colors.gold;
  ctx.fillRect(0, 0, w, 22);
  for (let x = 0; x < w; x += 102) ctx.drawImage(ticker, x, 8, 102, 7);
  drawImageContain(ctx, hackerHouse, 56, 42, 330, 72);
  drawImageContain(ctx, goaImg, 1010, 32, 132, 132);
  drawPalmDoodle(ctx, 72, 235, .8, BRAND.colors.gold);
  drawPalmDoodle(ctx, 1120, 255, -.72, BRAND.colors.coral);
  drawWaves(ctx, 36, 535, 260, BRAND.colors.leaf, 2);
  drawWaves(ctx, 905, 535, 260, BRAND.colors.gold, 2);

  const teamName = fields.teamName.trim() || "BUILDING TOGETHER";
  drawFittedText(
    ctx,
    teamName.toUpperCase(),
    600,
    TEAM_TEXT_LAYOUT.nameY,
    560,
    34,
    60,
    BRAND.colors.paper,
    "700",
    BRAND.fonts.display
  );

  const diameter = members.length === 2 ? 280 : 230;
  const gap = members.length === 2 ? 110 : 70;
  const total = diameter * members.length + gap * (members.length - 1);
  const startX = (w - total) / 2;

  members.forEach((member, index) => {
    const x = startX + index * (diameter + gap);
    const y = TEAM_TEXT_LAYOUT.memberY;
    ctx.fillStyle = BRAND.colors.ink;
    ctx.beginPath();
    ctx.arc(x + diameter / 2 + 8, y + diameter / 2 + 9, diameter / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = index % 2 === 0 ? BRAND.colors.coral : BRAND.colors.gold;
    ctx.beginPath();
    ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2 + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + diameter / 2, y + diameter / 2, diameter / 2 - 7, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(ctx, photos[index], x + 7, y + 7, diameter - 14, diameter - 14);
    ctx.restore();

    drawFittedText(ctx, member.name.trim(), x + diameter / 2, y + diameter + 22, diameter + 30, 16, 27, BRAND.colors.paper, "700", BRAND.fonts.display);
    drawFittedText(ctx, member.role.trim().toUpperCase(), x + diameter / 2, y + diameter + 55, diameter + 30, 10, 14, BRAND.colors.gold, "700", BRAND.fonts.mono);
  });

  ctx.font = `700 15px ${BRAND.fonts.mono}`;
  ctx.fillStyle = BRAND.colors.paper;
  ctx.textAlign = "center";
  ctx.fillText(`${BRAND.hashtag.toUpperCase()}  ·  ${BRAND.dateRange}  ·  ${BRAND.location}`, 600, TEAM_TEXT_LAYOUT.footerY);
  return canvasToBlob(canvas);
}
