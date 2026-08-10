"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImage } from "@/lib/cropImage";
import { FORMAT_CONFIG, type CroppedImage, type Format } from "@/lib/constants";

type Props = {
  imageSrc: string;
  format: Format;
  onCancel: () => void;
  onComplete: (cropped: CroppedImage) => void;
};

export default function CropStage({ imageSrc, format, onCancel, onComplete }: Props) {
  const config = FORMAT_CONFIG[format];

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // react-easy-crop starts centered with a "cover" fit at zoom=1, so a user
  // who hits Continue without touching anything already gets a sane crop
  // (plan §4 Phase 2 step 3 — the tool does the initial smart crop).
  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setIsExporting(true);
    setError(null);
    try {
      const cropped = await getCroppedImage(imageSrc, croppedAreaPixels, config.maxOutputEdge);
      onComplete(cropped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't process that crop. Please try again."
      );
      setIsExporting(false);
    }
  }, [imageSrc, croppedAreaPixels, config.maxOutputEdge, onComplete]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={config.aspect}
          cropShape={config.cropShape}
          objectFit="cover"
          restrictPosition
          showGrid={config.cropShape === "rect"}
          zoomWithScroll
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="w-full flex items-center gap-3 px-1">
        <span className="text-xs text-white/50 shrink-0" aria-hidden="true">
          −
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full accent-emerald-400 h-11 touch-none"
        />
        <span className="text-sm text-white/50 shrink-0" aria-hidden="true">
          +
        </span>
      </div>

      <p className="text-xs text-white/40 text-center">
        Drag to reposition, pinch or use the slider to zoom. Looks good already? Just hit
        Continue.
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-400 text-center">
          {error}
        </p>
      )}

      <div className="w-full flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isExporting}
          className="flex-1 min-h-[44px] rounded-xl border border-white/15 text-white/70 text-sm font-medium hover:text-white hover:border-white/30 disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isExporting || !croppedAreaPixels}
          className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {isExporting ? "Processing…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
