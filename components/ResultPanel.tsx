"use client";

import { useMemo, useState } from "react";
import type { RenderedResult } from "@/components/CanvasRenderer";
import ShareToXButton from "@/components/ShareToXButton";
import type { Format } from "@/lib/constants";
import type { BuilderFields } from "@/lib/canvasCompose";

type Props = {
  format: Format;
  rendered: RenderedResult;
  /** Builder's name — passed through to personalize the share caption. */
  name?: string;
  /** Card/PFP/Boarding only — passed through so Share-to-X can reuse the
   *  SAME id the QR code was rendered with. */
  fields?: BuilderFields;
  onEditFields?: () => void;
  onAdjustCrop?: () => void;
  onNewPhoto?: () => void;
};

/**
 * iOS Safari's `download` attribute on <a> has historically been
 * unreliable/inconsistent (silently opens the image instead of saving it,
 * depending on OS version). On iOS we skip straight to "open the image,
 * long-press to save" rather than gambling on `a.download` actually
 * triggering a save.
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

const FILENAMES: Record<Format, string> = {
  pfp: "hh-goa-2026-frame.png",
  card: "hh-goa-2026-builder-pass.png",
  boarding: "hh-goa-2026-boarding-pass.png",
  team: "hh-goa-2026-team-frame.png",
};

const ALT_TEXT: Record<Format, string> = {
  pfp: "Your HH Goa 2026 profile frame",
  card: "Your HH Goa 2026 builder pass",
  boarding: "Your HH Goa 2026 boarding pass",
  team: "Your HH Goa 2026 team frame",
};

const EDIT_LABEL: Record<Format, string> = {
  pfp: "Edit details",
  card: "Edit details",
  boarding: "Edit details",
  team: "Edit team",
};

export default function ResultPanel({ format, rendered, name, fields, onEditFields, onAdjustCrop, onNewPhoto }: Props) {
  const [showIOSHint, setShowIOSHint] = useState(false);
  const onIOS = useMemo(isIOS, []);

  const filename = FILENAMES[format];

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rendered.objectUrl}
        alt={ALT_TEXT[format]}
        className="max-h-[65vh] w-auto rounded-xl border border-gold/25 shadow-lg shadow-black/40"
      />

      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="min-h-[44px] w-full sm:w-auto px-8 rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 active:brightness-95 transition-all font-[family-name:var(--font-body)]"
        >
          Download PNG
        </button>

        <ShareToXButton blob={rendered.blob} format={format} name={name} fields={fields} />
      </div>

      {(onIOS || showIOSHint) && (
        <p className="text-xs text-paper/50 text-center max-w-xs font-[family-name:var(--font-body)]" role="status">
          Opened in a new tab — press and hold the image, then choose{" "}
          <span className="text-paper/70">&ldquo;Save Image&rdquo;</span> to add it to your Photos.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {onEditFields && (
          <button
            type="button"
            onClick={onEditFields}
            className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper font-[family-name:var(--font-body)]"
          >
            {EDIT_LABEL[format]}
          </button>
        )}
        {onAdjustCrop && (
          <button
            type="button"
            onClick={onAdjustCrop}
            className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper font-[family-name:var(--font-body)]"
          >
            Adjust crop
          </button>
        )}
        {onNewPhoto && (
          <button
            type="button"
            onClick={onNewPhoto}
            className="min-h-[44px] text-sm text-paper/70 underline underline-offset-4 hover:text-paper font-[family-name:var(--font-body)]"
          >
            Use a different photo
          </button>
        )}
      </div>
    </div>
  );
}
