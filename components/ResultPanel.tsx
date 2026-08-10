"use client";

import { useMemo, useState } from "react";
import type { RenderedResult } from "@/components/CanvasRenderer";
import ShareToXButton from "@/components/ShareToXButton";
import type { Format } from "@/lib/constants";

type Props = {
  format: Format;
  rendered: RenderedResult;
  /** Builder's name (Format B only) — passed through to personalize the share caption. */
  name?: string;
  onEditFields?: () => void;
  onAdjustCrop: () => void;
  onNewPhoto: () => void;
};

/**
 * iOS Safari's `download` attribute on <a> has historically been
 * unreliable/inconsistent (silently opens the image instead of saving it,
 * depending on OS version). Per plan §4 Phase 4 step 3 / §7 mobile checklist:
 * on iOS we skip straight to "open the image, long-press to save" rather
 * than gambling on `a.download` actually triggering a save.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as "MacIntel" but is touch-capable, unlike a real Mac.
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
  // Give the browser a moment to actually start the download before we
  // revoke the URL out from under it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ResultPanel({ format, rendered, name, onEditFields, onAdjustCrop, onNewPhoto }: Props) {
  const [showIOSHint, setShowIOSHint] = useState(false);
  const onIOS = useMemo(isIOS, []);

  const filename = format === "pfp" ? "hh-goa-2026-frame.png" : "hh-goa-2026-builder-card.png";

  const handleDownload = () => {
    if (onIOS) {
      // `a.download` is not reliable on iOS Safari — open the image in a
      // new tab instead so the user can long-press → "Save Image" (the
      // native, always-works path on that platform).
      window.open(rendered.objectUrl, "_blank");
      setShowIOSHint(true);
      return;
    }
    triggerDownload(rendered.blob, filename);
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
      <img
        src={rendered.objectUrl}
        alt={format === "pfp" ? "Your HH Goa 2026 frame" : "Your HH Goa 2026 builder card"}
        className="max-h-[65vh] w-auto rounded-xl border border-white/10 shadow-lg shadow-black/40"
      />

      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="min-h-[44px] w-full sm:w-auto px-8 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 active:bg-emerald-600 transition-colors"
        >
          Download PNG
        </button>

        <ShareToXButton blob={rendered.blob} format={format} name={name} />
      </div>

      {(onIOS || showIOSHint) && (
        <p className="text-xs text-white/50 text-center max-w-xs" role="status">
          Opened in a new tab — press and hold the image, then choose{" "}
          <span className="text-white/70">&ldquo;Save Image&rdquo;</span> to add it to your Photos.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {format === "card" && onEditFields && (
          <button
            type="button"
            onClick={onEditFields}
            className="min-h-[44px] text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            Edit details
          </button>
        )}
        <button
          type="button"
          onClick={onAdjustCrop}
          className="min-h-[44px] text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Adjust crop
        </button>
        <button
          type="button"
          onClick={onNewPhoto}
          className="min-h-[44px] text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Use a different photo
        </button>
      </div>
    </div>
  );
}
