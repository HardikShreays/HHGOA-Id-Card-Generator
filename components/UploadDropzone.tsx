"use client";

import { useCallback, useState } from "react";
import { isHeicFile, convertHeicToJpeg, HeicConversionError } from "@/lib/heicConvert";
import { validateUploadFile, loadAndDownscale } from "@/lib/imageProcessing";
import type { UploadedImage } from "@/lib/constants";

type Props = {
  onImageReady: (image: UploadedImage) => void;
  compact?: boolean;
};

type Status = "idle" | "converting" | "processing" | "error";

export default function UploadDropzone({ onImageReady, compact = false }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      const validation = validateUploadFile(file);
      if (!validation.ok) {
        setStatus("error");
        setError(validation.reason);
        return;
      }

      try {
        let workingBlob: Blob = file;

        if (isHeicFile(file)) {
          setStatus("converting");
          try {
            workingBlob = await convertHeicToJpeg(file);
          } catch (err) {
            const message =
              err instanceof HeicConversionError
                ? err.message
                : "We couldn't convert that HEIC photo. Try a JPG or PNG instead.";
            setStatus("error");
            setError(message);
            return;
          }
        }

        setStatus("processing");
        const { objectUrl, width, height } = await loadAndDownscale(workingBlob);

        setStatus("idle");
        onImageReady({ objectUrl, fileName: file.name, width, height });
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong reading that photo. Please try another one."
        );
      }
    },
    [onImageReady]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input value so selecting the same file twice still fires onChange.
    e.target.value = "";
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const isBusy = status === "converting" || status === "processing";

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-[3px] border-dashed border-black text-center transition-colors cursor-pointer select-none",
          compact ? "min-h-[72px] p-3" : "min-h-[220px] p-8",
          isDragOver ? "bg-gold" : "bg-white hover:bg-gold/20",
          isBusy ? "cursor-wait opacity-70" : "",
        ].join(" ")}
      >
        <input
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleInputChange}
          disabled={isBusy}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
          aria-label="Choose a photo from your library"
        />

        {status === "converting" && (
          <>
            <Spinner />
            <p className="text-sm text-ink/80">Converting your iPhone photo…</p>
          </>
        )}

        {status === "processing" && (
          <>
            <Spinner />
            <p className="text-sm text-ink/80">Preparing your photo…</p>
          </>
        )}

        {!isBusy && (
          <>
            {!compact && <UploadIcon />}
            <p className={`${compact ? "text-[10px]" : "text-sm"} font-bold text-ink`}>
              {compact ? "Replace photo" : "Tap to upload, or drag a photo here"}
            </p>
            {!compact && <p className="text-xs text-ink/55">JPG, PNG, or HEIC · up to 15MB</p>}
          </>
        )}
      </div>

      {status === "error" && error && (
        <p role="alert" className="mt-3 text-sm font-bold text-coral text-center">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold"
      aria-hidden="true"
    />
  );
}

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="text-forest"
      aria-hidden="true"
    >
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
