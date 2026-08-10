"use client";

import { useState } from "react";
import { BRAND, type Format } from "@/lib/constants";
import { uploadToShareStore, ShareUploadError } from "@/lib/uploadToShareStore";

type Props = {
  blob: Blob;
  format: Format;
  /** Builder's name (Format B only) — used to personalize the tweet caption. */
  name?: string;
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

export default function ShareToXButton({ blob, format, name }: Props) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const caption = BRAND.shareCaption(format === "card" ? name : undefined);

  const handleShare = async () => {
    setStatus("uploading");
    setError(null);
    try {
      const { shareUrl } = await uploadToShareStore(blob, format);
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
        className="min-h-[44px] w-full sm:w-auto px-8 rounded-xl border border-white/20 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 active:bg-white/15 disabled:opacity-60 disabled:cursor-wait transition-colors inline-flex items-center justify-center gap-2"
      >
        <XLogo />
        {status === "uploading" ? "Preparing…" : "Share to X"}
      </button>

      {error && (
        <p role="alert" className="text-xs text-red-400 text-center max-w-xs">
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
