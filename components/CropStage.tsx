"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImage } from "@/lib/cropImage";
import { detectFaceFocalPoint } from "@/lib/faceDetection";
import { FORMAT_CONFIG, type CroppedImage, type Format } from "@/lib/constants";

type Props = {
  imageSrc: string;
  format: Format;
  onChange: (cropped: CroppedImage) => void;
  compact?: boolean;
};

export default function CropStage({ imageSrc, format, onChange, compact = false }: Props) {
  const config = FORMAT_CONFIG[format];
  const [crop, setCrop] = useState<Point>({ x: 0, y: -8 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [faceStatus, setFaceStatus] = useState<"looking" | "found" | "fallback">("looking");
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    setFaceStatus("looking");
    detectFaceFocalPoint(imageSrc).then((point) => {
      if (!active) return;
      setCrop({
        x: Math.round((0.5 - point.x) * 120),
        y: Math.round((0.42 - point.y) * 120),
      });
      setFaceStatus(point.detected ? "found" : "fallback");
    });
    return () => {
      active = false;
    };
  }, [imageSrc]);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => setArea(pixels), []);

  useEffect(() => {
    if (!area) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const next = await getCroppedImage(imageSrc, area, config.maxOutputEdge);
        if (!active) {
          URL.revokeObjectURL(next.objectUrl);
          return;
        }
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = next.objectUrl;
        onChange(next);
      } catch {
        // Keep the last valid preview while the user continues adjusting.
      }
    }, 320);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [area, config.maxOutputEdge, imageSrc, onChange]);

  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    []
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className={`relative w-full overflow-hidden rounded-xl border-[3px] border-black bg-black ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
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
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold" aria-hidden="true">−</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="Photo zoom"
          className="h-9 w-full accent-coral"
        />
        <span className="text-xs font-bold" aria-hidden="true">+</span>
      </div>
      <p className="text-[10px] font-semibold text-ink/55">
        {faceStatus === "looking"
          ? "Looking for a face…"
          : faceStatus === "found"
            ? "Face found. Drag or zoom to fine-tune."
            : "Centered automatically. Drag or zoom to adjust."}
      </p>
    </div>
  );
}
