"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawBoardingPass,
  drawFrame,
  drawIdCard,
  drawTeamFrame,
  type BuilderFields,
  type TeamFields,
} from "@/lib/canvasCompose";
import type { Format } from "@/lib/constants";

export type RenderedResult = {
  blob: Blob;
  objectUrl: string;
  shareId: string;
};

type Props = {
  format: Format;
  croppedImageSrc?: string;
  fields?: BuilderFields;
  teamFields?: TeamFields;
  shareId: string;
  onComplete: (result: RenderedResult) => void;
  onError: (message: string) => void;
};

export default function CanvasRenderer({
  format,
  croppedImageSrc,
  fields,
  teamFields,
  shareId,
  onComplete,
  onError,
}: Props) {
  const [status, setStatus] = useState<"rendering" | "done">("rendering");
  const renderIdRef = useRef(0);

  useEffect(() => {
    const renderId = ++renderIdRef.current;
    let cancelled = false;
    setStatus("rendering");

    const run = async () => {
      try {
        const shareUrl =
          typeof window !== "undefined" ? `${window.location.origin}/share/${shareId}` : "";
        const empty = { name: "", role: "" };
        let blob: Blob;

        if (format === "pfp") {
          if (!croppedImageSrc) throw new Error("Missing photo.");
          blob = await drawFrame(croppedImageSrc, fields);
        } else if (format === "card") {
          if (!croppedImageSrc) throw new Error("Missing photo.");
          blob = await drawIdCard(croppedImageSrc, fields ?? empty, shareUrl);
        } else if (format === "boarding") {
          if (!croppedImageSrc) throw new Error("Missing photo.");
          blob = await drawBoardingPass(croppedImageSrc, fields ?? empty);
        } else {
          if (!teamFields || teamFields.members.length < 2) {
            throw new Error("Team frame needs at least two teammates.");
          }
          blob = await drawTeamFrame(teamFields.members, teamFields.teamName);
        }

        if (cancelled || renderId !== renderIdRef.current) return;
        const objectUrl = URL.createObjectURL(blob);
        setStatus("done");
        onComplete({ blob, objectUrl, shareId });
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
  }, [format, croppedImageSrc, fields?.name, fields?.role, fields?.teamName, teamFields, shareId]);

  if (status === "rendering") {
    const label =
      format === "pfp" ? "frame" : format === "team" ? "team frame" : format === "boarding" ? "pass" : "card";
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 py-16">
        <div
          className="h-8 w-8 rounded-full border-2 border-paper/20 border-t-gold animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-paper/50">Compositing your {label}…</p>
      </div>
    );
  }

  return null;
}
