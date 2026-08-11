"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawFrame,
  drawIdCard,
  drawBoardingPass,
  drawTeamFrame,
  type BuilderFields,
  type TeamFields,
} from "@/lib/canvasCompose";
import type { Format } from "@/lib/constants";

export type RenderedResult = {
  blob: Blob;
  objectUrl: string;
};

type Props =
  | {
      format: "pfp" | "card" | "boarding";
      croppedImageSrc: string;
      fields?: BuilderFields;
      teamFields?: undefined;
      onComplete: (result: RenderedResult) => void;
      onError: (message: string) => void;
    }
  | {
      format: "team";
      croppedImageSrc?: undefined;
      fields?: undefined;
      teamFields: TeamFields;
      onComplete: (result: RenderedResult) => void;
      onError: (message: string) => void;
    };

const STATUS_LABEL: Record<Format, string> = {
  pfp: "frame",
  card: "builder pass",
  boarding: "boarding pass",
  team: "team frame",
};

/**
 * Runs the canvas compositor (drawFrame / drawIdCard / drawBoardingPass /
 * drawTeamFrame) against the cropped image(s) + fields, and reports the
 * result blob back up. Pure glue — all the actual compositing logic lives
 * in lib/canvasCompose.ts so it stays framework-agnostic and testable on
 * its own.
 */
export default function CanvasRenderer(props: Props) {
  const { format, onComplete, onError } = props;
  const [status, setStatus] = useState<"rendering" | "done">("rendering");
  // Monotonic id so a stale async render (StrictMode remount or rapid input
  // changes) cannot call onComplete/onError after a newer render started.
  const renderIdRef = useRef(0);

  // Stable-ish dependency keys for the effect below.
  const fieldsKey = props.format !== "team" ? `${props.fields?.name ?? ""}|${props.fields?.role ?? ""}|${props.fields?.teamName ?? ""}|${props.fields?.socials?.x ?? ""}|${props.fields?.socials?.github ?? ""}` : "";
  const teamKey = props.format === "team" ? `${props.teamFields.teamName}|${props.teamFields.members.map((m) => `${m.name}:${m.role ?? ""}:${m.imageSrc}`).join(",")}` : "";

  useEffect(() => {
    const renderId = ++renderIdRef.current;
    let cancelled = false;
    setStatus("rendering");

    const run = async () => {
      try {
        let blob: Blob;
        if (props.format === "pfp") {
          blob = await drawFrame(props.croppedImageSrc, props.fields);
        } else if (props.format === "card") {
          blob = await drawIdCard(props.croppedImageSrc, props.fields ?? { name: "", role: "" });
        } else if (props.format === "boarding") {
          blob = await drawBoardingPass(props.croppedImageSrc, props.fields ?? { name: "", role: "" });
        } else if (props.format === "team") {
          blob = await drawTeamFrame(props.teamFields);
        } else {
          throw new Error("Unknown format.");
        }

        if (cancelled || renderId !== renderIdRef.current) return;
        const objectUrl = URL.createObjectURL(blob);
        setStatus("done");
        onComplete({ blob, objectUrl });
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
  }, [format, props.croppedImageSrc, fieldsKey, teamKey]);

  if (status === "rendering") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 py-16">
        <div
          className="h-8 w-8 rounded-full border-2 border-gold/20 border-t-gold animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-paper/50 font-[family-name:var(--font-body)]">
          Compositing your {STATUS_LABEL[format]}…
        </p>
      </div>
    );
  }

  return null;
}
