"use client";

import { useEffect, useRef, useState } from "react";
import { drawFrame, drawIdCard, type BuilderFields } from "@/lib/canvasCompose";
import type { Format } from "@/lib/constants";

export type RenderedResult = {
  blob: Blob;
  objectUrl: string;
};

type Props = {
  format: Format;
  croppedImageSrc: string;
  fields?: BuilderFields;
  onComplete: (result: RenderedResult) => void;
  onError: (message: string) => void;
};

/**
 * Runs the Phase 3 canvas compositor (drawFrame / drawIdCard) against the
 * cropped image + fields, and reports the result blob back up. Pure glue —
 * all the actual compositing logic lives in lib/canvasCompose.ts so it stays
 * framework-agnostic and testable on its own.
 */
export default function CanvasRenderer({
  format,
  croppedImageSrc,
  fields,
  onComplete,
  onError,
}: Props) {
  const [status, setStatus] = useState<"rendering" | "done">("rendering");
  // Monotonic id so a stale async render (StrictMode remount or rapid input
  // changes) cannot call onComplete/onError after a newer render started.
  const renderIdRef = useRef(0);

  useEffect(() => {
    const renderId = ++renderIdRef.current;

    let cancelled = false;
    setStatus("rendering");

    const run = async () => {
      try {
        const blob =
          format === "pfp"
            ? await drawFrame(croppedImageSrc)
            : await drawIdCard(croppedImageSrc, fields ?? { name: "", role: "" });

        if (cancelled || renderId !== renderIdRef.current) return;
        const objectUrl = URL.createObjectURL(blob);
        setStatus("done");
        onComplete({ blob, objectUrl });
      } catch (err) {
        if (cancelled || renderId !== renderIdRef.current) return;
        onError(
          err instanceof Error
            ? err.message
            : "Something went wrong while generating your image. Please try again."
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, croppedImageSrc, fields?.name, fields?.role]);

  if (status === "rendering") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 py-16">
        <div
          className="h-8 w-8 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-white/50">Compositing your {format === "pfp" ? "frame" : "card"}…</p>
      </div>
    );
  }

  return null;
}
