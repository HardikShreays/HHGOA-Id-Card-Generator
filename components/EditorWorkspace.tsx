"use client";

import { useCallback, useState } from "react";
import UploadDropzone from "./UploadDropzone";
import CropStage from "./CropStage";
import BuilderFieldsForm from "./BuilderFieldsForm";
import CanvasRenderer, { type RenderedResult } from "./CanvasRenderer";
import ResultPanel, { ResultActions } from "./ResultPanel";
import type { BuilderFields } from "@/lib/canvasCompose";
import type { CroppedImage, Format, UploadedImage } from "@/lib/constants";

const PREVIEW_PLACEHOLDER: CroppedImage = {
  objectUrl: "/brand/no-image-placeholder.png",
  width: 800,
  height: 1000,
};

export default function EditorWorkspace({ format }: { format: Exclude<Format, "team"> }) {
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [cropped, setCropped] = useState<CroppedImage | null>(PREVIEW_PLACEHOLDER);
  const [fields, setFields] = useState<BuilderFields>({ name: "", role: "" });
  const [rendered, setRendered] = useState<RenderedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImage = useCallback((next: UploadedImage) => {
    setImage((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return next;
    });
    setCropped(null);
    setRendered((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setError(null);
  }, []);

  const handleCropped = useCallback((next: CroppedImage) => {
    setCropped(next);
  }, []);

  const handleRendered = useCallback((next: RenderedResult) => {
    setRendered((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return next;
    });
    setError(null);
  }, []);

  const handleStartNew = useCallback(() => {
    setImage((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setCropped(PREVIEW_PLACEHOLDER);
    setFields({ name: "", role: "" });
    setRendered((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setError(null);
  }, []);

  const hasRealPhoto = Boolean(
    image && cropped && cropped.objectUrl !== PREVIEW_PLACEHOLDER.objectUrl
  );

  return (
    <div>
      <EditorHeading format={format} />
      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.82fr)]">
        <div className="flex min-w-0 flex-col gap-6">
        <div className="rounded-2xl border-[3px] border-black bg-parchment p-4 shadow-[7px_7px_0_#000]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-coral">Photo</p>
            {image && <UploadDropzone onImageReady={handleImage} compact />}
          </div>
          {!image ? (
            <UploadDropzone onImageReady={handleImage} />
          ) : (
            <CropStage imageSrc={image.objectUrl} format={format} onChange={handleCropped} compact />
          )}
        </div>
        <div className="rounded-2xl border-[3px] border-black bg-parchment p-4 shadow-[7px_7px_0_#000]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-coral">Details</p>
          <BuilderFieldsForm value={fields} onChange={setFields} />
        </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
          <div className="relative min-h-[420px] rounded-2xl border-[3px] border-black bg-gold p-3 shadow-[7px_7px_0_#000]">
            <div className="mb-3 flex items-center justify-between rounded-xl border-2 border-black bg-forest px-4 py-2 text-paper">
              <p className="text-[10px] font-bold uppercase tracking-[.18em]">Live preview</p>
            </div>
            <div className="rounded-xl border-2 border-black bg-parchment p-3">
              {!rendered && (
                <div className="flex min-h-[360px] items-center justify-center px-8 text-center text-xs font-bold text-forest">
                  Preparing your preview…
                </div>
              )}
              {rendered && <ResultPanel format={format} rendered={rendered} />}
              {cropped && (
                <CanvasRenderer
                  format={format}
                  croppedImageSrc={cropped.objectUrl}
                  fields={fields}
                  onComplete={handleRendered}
                  onError={setError}
                />
              )}
              {error && <p role="alert" className="mt-3 text-xs font-bold text-coral">{error}</p>}
            </div>
          </div>

          {rendered && (
            <div className="rounded-2xl border-[3px] border-black bg-parchment p-4 text-ink shadow-[7px_7px_0_#000]">
              <ResultActions
                format={format}
                rendered={rendered}
                name={fields.name}
                fields={fields}
                actionsEnabled={hasRealPhoto}
                onStartNew={handleStartNew}
              />
            </div>
          )}
          </div>
        </div>
    </div>
  );
}

function EditorHeading({ format }: { format: "pfp" | "card" }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">One screen. One clean drop.</p>
      <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold leading-none text-paper">
        {format === "card" ? "Builder ID Card" : "PFP Frame"}
      </h1>
      <p className="mt-2 max-w-xl text-xs font-semibold text-paper/75">
        Add your photo and details, adjust the crop, then download or share the preview right here.
      </p>
    </div>
  );
}
