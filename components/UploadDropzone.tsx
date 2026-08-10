"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsTouchDevice(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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

  const openPicker = () => {
    if (isBusy) return;
    if (isTouchDevice) {
      setShowSourcePicker(true);
    } else {
      galleryInputRef.current?.click();
    }
  };

  const pickFromGallery = () => {
    setShowSourcePicker(false);
    galleryInputRef.current?.click();
  };

  const pickFromCamera = () => {
    setShowSourcePicker(false);
    cameraInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openPicker}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isBusy) {
            e.preventDefault();
            openPicker();
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
          ref={galleryInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Choose a photo from your library"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Take a photo with your camera"
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

      {showSourcePicker && (
        <SourcePickerSheet
          onGallery={pickFromGallery}
          onCamera={pickFromCamera}
          onDismiss={() => setShowSourcePicker(false)}
        />
      )}
    </div>
  );
}

function SourcePickerSheet({
  onGallery,
  onCamera,
  onDismiss,
}: {
  onGallery: () => void;
  onCamera: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Choose photo source"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-2 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCamera}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-white hover:bg-white/10 active:bg-white/15"
        >
          <CameraIcon />
          <span className="text-base font-medium">Take a photo</span>
        </button>
        <button
          type="button"
          onClick={onGallery}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-white hover:bg-white/10 active:bg-white/15"
        >
          <GalleryIcon />
          <span className="text-base font-medium">Choose from library</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1 w-full rounded-xl px-4 py-3.5 text-center text-sm text-white/60 hover:bg-white/5 active:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
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
