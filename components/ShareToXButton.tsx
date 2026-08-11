"use client";

import { useState } from "react";
import { BRAND, type Format } from "@/lib/constants";
import { uploadToShareStore, ShareUploadError } from "@/lib/uploadToShareStore";
import { computeBuilderIdCode, type BuilderFields } from "@/lib/canvasCompose";

type Props = {
  blob: Blob;
  format: Format;
  /** Builder's name — used to personalize the tweet caption. */
  name?: string;
  /** Card/PFP/Boarding only — lets the upload reuse the SAME id the QR code
   *  on the Builder ID was rendered with (see lib/canvasCompose.ts
   *  drawIdCard), so scanning the QR resolves once shared. */
  fields?: BuilderFields;
};

type ShareStatus = "idle" | "uploading" | "error";

const SHARE_HASHTAG = BRAND.hashtag.replace(/^#/, "");

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

export default function ShareToXButton({ blob, format, name, fields }: Props) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const caption = BRAND.shareCaption(name);

  const handleShare = async () => {
    setStatus("uploading");
    setError(null);
    try {
      const shareId = fields?.name && fields?.role ? computeBuilderIdCode(fields) : undefined;
      const { shareUrl } = await uploadToShareStore(blob, format, shareId);
      shareViaLinkIntent(caption, shareUrl);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ShareUploadError
          ? err.message
          : "Couldn't prep the share link. You can still download the image and post it manually."
      );
    }
  };

  const isBusy = status === "uploading";

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        disabled={isBusy}
        className="min-h-[44px] w-full sm:w-auto px-8 rounded-xl border border-gold/30 bg-forest-deep/40 text-paper text-sm font-semibold hover:bg-forest-deep/70 active:bg-forest-deep disabled:opacity-60 disabled:cursor-wait transition-colors inline-flex items-center justify-center gap-2 font-[family-name:var(--font-body)]"
      >
        <XLogo />
        {status === "uploading" ? "Preparing…" : "Share to X"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-coral text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}

function XLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
