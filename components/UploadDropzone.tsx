"use client";

import { useCallback, useId, useState } from "react";
import { isHeicFile, convertHeicToJpeg, HeicConversionError } from "@/lib/heicConvert";
import { validateUploadFile, loadAndDownscale } from "@/lib/imageProcessing";
import type { UploadedImage } from "@/lib/constants";

// TEMP: on-screen upload debugging for mobile devices where the console isn't
// accessible. Flip to false (or delete the debug UI below) once verified.
const DEBUG_UPLOAD = true;

type Props = {
  onImageReady: (image: UploadedImage) => void;
  /** Renders a small "Replace" icon button instead of the full dropzone. */
  compact?: boolean;
};

type Status = "idle" | "converting" | "processing" | "error";

export default function UploadDropzone({ onImageReady, compact = false }: Props) {
  const inputId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);

  const log = useCallback((message: string) => {
    if (!DEBUG_UPLOAD) return;
    // eslint-disable-next-line no-console
    console.log(`[upload] ${message}`);
    setDebug((prev) => [...prev.slice(-5), message]);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      log(`picked: ${file.name || "unnamed"} · ${file.type || "no-type"} · ${Math.round(file.size / 1024)}KB`);

      const validation = validateUploadFile(file);
      if (!validation.ok) {
        setStatus("error");
        setError(validation.reason);
        log(`validation failed: ${validation.reason}`);
        return;
      }

      try {
        let workingBlob: Blob = file;

        if (isHeicFile(file)) {
          setStatus("converting");
          log("HEIC detected — converting…");
          try {
            workingBlob = await convertHeicToJpeg(file);
            log("HEIC converted");
          } catch (err) {
            const message =
              err instanceof HeicConversionError
                ? err.message
                : "We couldn't convert that HEIC photo. Try a JPG or PNG instead.";
            setStatus("error");
            setError(message);
            log(`HEIC convert failed: ${message}`);
            return;
          }
        }

        setStatus("processing");
        log("processing (decode + downscale)…");
        const { objectUrl, width, height } = await loadAndDownscale(workingBlob);

        setStatus("idle");
        log(`ready: ${width}×${height}`);
        onImageReady({ objectUrl, fileName: file.name, width, height });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong reading that photo. Please try another one.";
        setStatus("error");
        setError(message);
        log(`error: ${message}`);
      }
    },
    [log, onImageReady]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    log(`change fired · files=${e.target.files?.length ?? 0}`);
    // Reset the input value so selecting the same file twice still fires onChange.
    e.target.value = "";
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const isBusy = status === "converting" || status === "processing";

  // Shared hidden input. A <label htmlFor> is the most reliable way to open the
  // native picker on iOS Safari (no synthetic click / tap-passthrough needed).
  const input = (
    <input
      id={inputId}
      type="file"
      accept="image/*,.heic,.heif"
      onChange={handleInputChange}
      disabled={isBusy}
      className="sr-only"
      aria-label="Choose a photo"
    />
  );

  const debugPanel =
    DEBUG_UPLOAD && debug.length > 0 ? (
      <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg border-2 border-black bg-black/85 p-2 text-[9px] leading-snug text-lime-300">
        {debug.join("\n")}
      </pre>
    ) : null;

  if (compact) {
    return (
      <>
        {input}
        <label
          htmlFor={inputId}
          className={[
            "brutal-button inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-gold px-3 text-[10px] font-bold text-ink",
            isBusy ? "cursor-wait opacity-70" : "",
          ].join(" ")}
        >
          <ReplaceIcon />
          {isBusy ? "…" : "Replace"}
        </label>
        {status === "error" && error && (
          <p role="alert" className="mt-2 text-[10px] font-bold text-coral">
            {error}
          </p>
        )}
        {debugPanel}
      </>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {input}
      <label
        htmlFor={inputId}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          "flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-[3px] border-dashed border-black p-8 text-center transition-colors cursor-pointer select-none",
          isDragOver ? "bg-gold" : "bg-white hover:bg-gold/20",
          isBusy ? "cursor-wait opacity-70" : "",
        ].join(" ")}
      >
        {isBusy ? (
          <>
            <Spinner />
            <p className="text-sm text-ink/80">
              {status === "converting" ? "Converting your iPhone photo…" : "Preparing your photo…"}
            </p>
          </>
        ) : (
          <>
            <UploadIcon />
            <p className="text-sm font-bold text-ink">Tap to upload, or drag a photo here</p>
            <p className="text-xs text-ink/55">JPG, PNG, or HEIC · up to 15MB</p>
          </>
        )}
      </label>

      {status === "error" && error && (
        <p role="alert" className="mt-3 text-sm font-bold text-coral text-center">
          {error}
        </p>
      )}
      {debugPanel}
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

function ReplaceIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v4h-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
