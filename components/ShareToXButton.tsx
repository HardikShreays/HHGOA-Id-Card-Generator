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

const FILENAMES: Record<Format, string> = {
  pfp: "hh-goa-2026-frame.png",
  card: "hh-goa-2026-builder-pass.png",
  team: "hh-goa-2026-team-frame.png",
};

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

function canShareFiles(file: File): boolean {
  return typeof navigator !== "undefined" && typeof navigator.canShare === "function"
    ? navigator.canShare({ files: [file] })
    : false;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export default function ShareToXButton({ blob, format, name, fields }: Props) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const shareId = fields?.name && fields?.role ? computeBuilderIdCode(fields) : undefined;
  const caption = BRAND.shareCaption(name, shareId);

  const handleShare = async () => {
    setStatus("uploading");
    setError(null);
    try {
      const file = new File([blob], FILENAMES[format], { type: "image/png" });

      // Mobile-first: attach the PNG via the OS share sheet (Android/iOS).
      if (canShareFiles(file) && typeof navigator.share === "function") {
        try {
          await navigator.share({
            files: [file],
            text: `${caption} ${BRAND.hashtag}`,
          });
          setStatus("idle");
          return;
        } catch (err) {
          if (isAbortError(err)) {
            setStatus("idle");
            return;
          }
          // Unexpected share failure — fall through to link-intent.
        }
      }

      // Desktop / unsupported browsers: upload + X web intent with preview link.
      const { shareUrl } = await uploadToShareStore(blob, format, shareId);
      shareViaLinkIntent(caption, shareUrl);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof ShareUploadError
          ? err.message
          : "Couldn't prep the share. You can still download the image and post it manually."
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
