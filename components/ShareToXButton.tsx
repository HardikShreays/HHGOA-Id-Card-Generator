"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND, type Format } from "@/lib/constants";
import { uploadToShareStore, ShareUploadError } from "@/lib/uploadToShareStore";
import { computeBuilderIdCode, type BuilderFields } from "@/lib/canvasCompose";

type Props = {
  blob: Blob;
  format: Format;
  /** Builder's name — used to personalize the tweet caption. */
  name?: string;
  /** Lets the upload reuse the same id the QR code
   *  on the Builder ID was rendered with (see lib/canvasCompose.ts
   *  drawIdCard), so scanning the QR resolves once shared. */
  fields?: BuilderFields;
  onStartNew?: () => void;
};

type ShareStatus = "idle" | "uploading" | "error";

const SHARE_HASHTAG = "hhgoa";

function shareViaLinkIntent(caption: string, shareUrl: string) {
  const text = encodeURIComponent(caption);
  const url = encodeURIComponent(shareUrl);
  const hashtags = encodeURIComponent(SHARE_HASHTAG);
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`,
    "_blank",
    "noopener,noreferrer"
  );
}

export default function ShareToXButton({ blob, format, name, fields, onStartNew }: Props) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const cachedShareUrl = useRef<string | null>(null);
  const cachedBlob = useRef<Blob | null>(null);

  useEffect(() => {
    if (cachedBlob.current === blob) return;
    cachedBlob.current = blob;
    cachedShareUrl.current = null;
  }, [blob]);

  const shareId = fields?.name && fields?.role ? computeBuilderIdCode(fields) : undefined;
  const caption = BRAND.shareCaption(name, shareId, format);

  const openX = (shareUrl: string) => {
    shareViaLinkIntent(caption, shareUrl);
    setShowDone(true);
  };

  const handleShare = async () => {
    setStatus("uploading");
    setError(null);
    try {
      let shareUrl = cachedShareUrl.current;
      if (!shareUrl) {
        const result = await uploadToShareStore(blob, format, shareId);
        shareUrl = result.shareUrl;
        cachedShareUrl.current = shareUrl;
      }
      setStatus("idle");
      openX(shareUrl);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ShareUploadError
          ? err.message
          : "Couldn't prep the share. You can still download the image and post it manually."
      );
    }
  };

  const handleShareAgain = () => {
    if (cachedShareUrl.current) {
      openX(cachedShareUrl.current);
      return;
    }
    void handleShare();
  };

  const handleStartNew = () => {
    setShowDone(false);
    onStartNew?.();
  };

  const isBusy = status === "uploading";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={isBusy}
        className="brutal-button inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-coral px-8 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {status === "uploading" ? (
          "Preparing…"
        ) : (
          <>
            <span>Share to</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/social-x.svg" alt="X" className="h-5 w-5 object-contain" />
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="max-w-xs text-center text-xs font-bold text-coral">
          {error}
        </p>
      )}

      {showDone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-done-title"
        >
          <div className="w-full max-w-sm rounded-2xl border-[3px] border-black bg-parchment p-6 text-center text-ink shadow-[8px_8px_0_#000]">
            <p id="share-done-title" className="font-[family-name:var(--font-display)] text-3xl font-bold">
              Shared to X
            </p>
            <p className="mt-2 text-sm font-semibold text-ink/70">
              Same frame is ready until you refresh. Share it again or start a new one.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleShareAgain}
                className="brutal-button inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-coral px-6 text-sm font-bold text-white"
              >
                <span>Share again</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/social-x.svg" alt="" className="h-4 w-4 object-contain" />
              </button>
              <button
                type="button"
                onClick={handleStartNew}
                className="brutal-button min-h-[44px] rounded-xl bg-gold px-6 text-sm font-bold text-ink"
              >
                Start new
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
