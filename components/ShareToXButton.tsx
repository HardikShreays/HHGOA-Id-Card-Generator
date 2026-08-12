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
  /** Lets the upload reuse the same id the QR code
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
        className="brutal-button inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-coral px-8 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/social-x.svg" alt="" className="h-5 w-5 object-contain" />
        {status === "uploading" ? "Preparing…" : "Share to X"}
      </button>

      {error && (
        <p role="alert" className="max-w-xs text-center text-xs font-bold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
