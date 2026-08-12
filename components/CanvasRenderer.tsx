"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawFrame,
  drawIdCard,
  drawTeamFrame,
  type BuilderFields,
  type TeamFields,
} from "@/lib/canvasCompose";
import type { Format } from "@/lib/constants";

export type RenderedResult = { blob: Blob; objectUrl: string };

type Props = {
  format: Format;
  croppedImageSrc?: string;
  fields?: BuilderFields;
  teamFields?: TeamFields;
  onComplete: (result: RenderedResult) => void;
  onError: (message: string) => void;
};

export default function CanvasRenderer(props: Props) {
  const renderId = useRef(0);
  const [rendering, setRendering] = useState(true);
  const fieldsKey = JSON.stringify(props.fields ?? props.teamFields ?? {});

  useEffect(() => {
    const id = ++renderId.current;
    let cancelled = false;
    setRendering(true);
    const timer = window.setTimeout(async () => {
      try {
        let blob: Blob;
        if (props.format === "team") {
          if (!props.teamFields) return;
          blob = await drawTeamFrame(props.teamFields);
        } else {
          if (!props.croppedImageSrc) return;
          blob =
            props.format === "pfp"
              ? await drawFrame(props.croppedImageSrc, props.fields)
              : await drawIdCard(props.croppedImageSrc, props.fields ?? { name: "", role: "" });
        }
        if (cancelled || id !== renderId.current) return;
        props.onComplete({ blob, objectUrl: URL.createObjectURL(blob) });
        setRendering(false);
      } catch (error) {
        if (cancelled || id !== renderId.current) return;
        props.onError(error instanceof Error ? error.message : "Could not generate the preview.");
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Stable serialized keys intentionally drive live preview updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.format, props.croppedImageSrc, fieldsKey]);

  if (!rendering) return null;
  return (
    <div className="absolute right-3 top-3 z-10 rounded-full border-2 border-black bg-gold px-3 py-1 text-[10px] font-bold text-ink">
      Updating…
    </div>
  );
}
