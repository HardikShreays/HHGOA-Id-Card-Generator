"use client";

import { useMemo, useState } from "react";
import type { RenderedResult } from "./CanvasRenderer";
import ShareToXButton from "./ShareToXButton";
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
  onStartNew?: () => void;
  actionsEnabled?: boolean;
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
  team: "hh-goa-2026-team-frame.png",
};

const ALT_TEXT: Record<Format, string> = {
  pfp: "Your HH Goa 2026 profile frame",
  card: "Your HH Goa 2026 builder pass",
  team: "Your HH Goa 2026 team frame",
};

const EDIT_LABEL: Record<Format, string> = {
  pfp: "Edit details",
  card: "Edit details",
  team: "Edit team",
};

export default function ResultPanel({
  format,
  rendered,
}: Pick<Props, "format" | "rendered">) {
  return (
    <div className="flex w-full justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={rendered.objectUrl}
        alt={ALT_TEXT[format]}
        className="max-h-[65vh] w-auto rounded-xl border-[3px] border-black shadow-[8px_8px_0_#000]"
      />
    </div>
  );
}

export function ResultActions({
  format,
  rendered,
  name,
  fields,
  onEditFields,
  onAdjustCrop,
  onNewPhoto,
  onStartNew,
  actionsEnabled = true,
}: Props) {
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
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!actionsEnabled}
          className="brutal-button pulse-glow min-h-[44px] w-full rounded-xl bg-gold px-8 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          Download PNG
        </button>

        {actionsEnabled ? (
          <ShareToXButton blob={rendered.blob} format={format} name={name} fields={fields} onStartNew={onStartNew} />
        ) : (
          <button type="button" disabled className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-coral px-8 text-sm font-bold text-white opacity-45 sm:w-auto">
            <span>Share to</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/social-x.svg" alt="X" className="h-5 w-5 object-contain" />
          </button>
        )}
      </div>

      {(onIOS || showIOSHint) && (
        <p className="max-w-xs text-center text-xs text-ink/60" role="status">
          Opened in a new tab — press and hold the image, then choose{" "}
          <span className="font-bold text-ink">&ldquo;Save Image&rdquo;</span> to add it to your Photos.
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {onEditFields && (
          <button
            type="button"
            onClick={onEditFields}
            className="min-h-[44px] text-xs font-bold text-forest underline decoration-2 underline-offset-4"
          >
            {EDIT_LABEL[format]}
          </button>
        )}
        {onAdjustCrop && (
          <button
            type="button"
            onClick={onAdjustCrop}
            className="min-h-[44px] text-xs font-bold text-forest underline decoration-2 underline-offset-4"
          >
            Adjust crop
          </button>
        )}
        {onNewPhoto && (
          <button
            type="button"
            onClick={onNewPhoto}
            className="min-h-[44px] text-xs font-bold text-forest underline decoration-2 underline-offset-4"
          >
            Use a different photo
          </button>
        )}
      </div>
    </div>
  );
}
