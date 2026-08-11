"use client";

import { useMemo, useState } from "react";
import type { RenderedResult } from "@/components/CanvasRenderer";
import ShareToXButton from "@/components/ShareToXButton";
import { FORMAT_CONFIG, type Format } from "@/lib/constants";

type Props = {
  format: Format;
  rendered: RenderedResult;
  name?: string;
  onEditFields?: () => void;
  onAdjustCrop: () => void;
  onNewPhoto: () => void;
};

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS13Plus = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13Plus;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ResultPanel({ format, rendered, name, onEditFields, onAdjustCrop, onNewPhoto }: Props) {
  const [showIOSHint, setShowIOSHint] = useState(false);
  const onIOS = useMemo(isIOS, []);
  const cfg = FORMAT_CONFIG[format];

  const handleDownload = () => {
    if (onIOS) {
      window.open(rendered.objectUrl, "_blank");
      setShowIOSHint(true);
      return;
    }
    triggerDownload(rendered.blob, cfg.filename);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4">
      <img
        src={rendered.objectUrl}
        alt={`Your HH Goa 2026 ${cfg.label}`}
        className="max-h-[65vh] w-auto rounded-xl border border-paper/10 shadow-lg shadow-black/40"
      />

      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="min-h-[44px] w-full sm:w-auto px-8 rounded-xl bg-coral text-paper text-sm font-semibold hover:bg-coral/90 transition-colors"
        >
          Download PNG
        </button>

        <ShareToXButton blob={rendered.blob} format={format} name={name} shareId={rendered.shareId} />
      </div>

      {(onIOS || showIOSHint) && (
        <p className="text-xs text-paper/50 text-center max-w-xs" role="status">
          Opened in a new tab — press and hold the image, then choose{" "}
          <span className="text-paper/70">&ldquo;Save Image&rdquo;</span> to add it to your Photos.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {onEditFields && (
          <button
            type="button"
            onClick={onEditFields}
            className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper"
          >
            Edit details
          </button>
        )}
        <button
          type="button"
          onClick={onAdjustCrop}
          className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper"
        >
          {format === "team" ? "Edit team" : "Adjust crop"}
        </button>
        <button
          type="button"
          onClick={onNewPhoto}
          className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
