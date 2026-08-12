// lib/cropImage.ts
// Turns a source image + a react-easy-crop pixel crop region into a real
// cropped image (Blob/objectUrl), ready to hand to the Phase 3 canvas
// compositor. Pure/framework-agnostic, mirrors the pattern in plan §4 Phase 3.

import { canvasToBlob } from "./canvasCompose";

export type PixelCrop = { x: number; y: number; width: number; height: number };

function loadHtmlImage(src: string, timeoutMs = 10000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(
      () => reject(new Error("Timed out loading image for cropping.")),
      timeoutMs
    );
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Failed to load image for cropping."));
    };
    img.src = src;
  });
}

/**
 * Crops `imageSrc` to the given pixel region and rasterizes it to a new
 * PNG blob/object URL. Output is capped at `maxOutputEdge` on its longest
 * side (crop regions can exceed that even though the source photo was
 * already downscaled on upload) to keep later canvas ops fast.
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop,
  maxOutputEdge: number
): Promise<{ objectUrl: string; width: number; height: number }> {
  const img = await loadHtmlImage(imageSrc);

  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));
  const longestEdge = Math.max(cropW, cropH);
  const scale = longestEdge > maxOutputEdge ? maxOutputEdge / longestEdge : 1;

  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  const blob = await canvasToBlob(canvas, "image/png");

  return { objectUrl: URL.createObjectURL(blob), width: outW, height: outH };
}
