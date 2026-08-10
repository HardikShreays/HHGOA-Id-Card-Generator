"use client";

import { useCallback, useRef, useState } from "react";
import { isHeicFile, convertHeicToJpeg, HeicConversionError } from "@/lib/heicConvert";
import { validateUploadFile, loadAndDownscale } from "@/lib/imageProcessing";
import type { UploadedImage } from "@/lib/constants";

type Props = {
  onImageReady: (image: UploadedImage) => void;
};

type Status = "idle" | "converting" | "processing" | "error";

export default function UploadDropzone({ onImageReady }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        onClick={() => !isBusy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isBusy) {
            inputRef.current?.click();
          }
        }}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer select-none",
          "min-h-[220px]", // comfortably >44px tap target, generous on mobile
          isDragOver ? "border-emerald-400 bg-emerald-950/20" : "border-white/20 hover:border-white/40",
          isBusy ? "cursor-wait opacity-70" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload a photo"
        />

        {status === "converting" && (
          <>
            <Spinner />
            <p className="text-sm text-white/80">Converting your iPhone photo…</p>
          </>
        )}

        {status === "processing" && (
          <>
            <Spinner />
            <p className="text-sm text-white/80">Preparing your photo…</p>
          </>
        )}

        {!isBusy && (
          <>
            <UploadIcon />
            <p className="text-base font-medium text-white">
              Tap to upload, or drag a photo here
            </p>
            <p className="text-xs text-white/50">JPG, PNG, or HEIC · up to 15MB</p>
          </>
        )}
      </div>

      {status === "error" && error && (
        <p role="alert" className="mt-3 text-sm text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
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
      className="text-white/70"
      aria-hidden="true"
    >
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
