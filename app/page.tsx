"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import FormatToggle from "@/components/FormatToggle";
import CropStage from "@/components/CropStage";
import BuilderFieldsForm from "@/components/BuilderFieldsForm";
import CanvasRenderer, { type RenderedResult } from "@/components/CanvasRenderer";
import ResultPanel from "@/components/ResultPanel";
import type { BuilderFields } from "@/lib/canvasCompose";
import { BRAND, FORMAT_CONFIG, type CroppedImage, type Format, type UploadedImage } from "@/lib/constants";

type Stage = "upload" | "crop" | "fields" | "rendering" | "result";

export default function Home() {
  const [format, setFormat] = useState<Format>("pfp");
  const [stage, setStage] = useState<Stage>("upload");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [croppedImage, setCroppedImage] = useState<CroppedImage | null>(null);
  const [fields, setFields] = useState<BuilderFields | undefined>(undefined);
  const [rendered, setRendered] = useState<RenderedResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const resetToUpload = () => {
    if (image) URL.revokeObjectURL(image.objectUrl);
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    if (rendered) URL.revokeObjectURL(rendered.objectUrl);
    setImage(null);
    setCroppedImage(null);
    setFields(undefined);
    setRendered(null);
    setRenderError(null);
    setStage("upload");
  };

  const handleImageReady = (img: UploadedImage) => {
    setImage(img);
    setStage("crop");
  };

  const handleCropComplete = (cropped: CroppedImage) => {
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    setCroppedImage(cropped);
    // Format B needs a name/role before we can render text onto the card;
    // Format A can go straight to compositing.
    setStage(format === "card" ? "fields" : "rendering");
  };

  const handleFieldsSubmit = (submitted: BuilderFields) => {
    setFields(submitted);
    setStage("rendering");
  };

  const handleRenderComplete = (result: RenderedResult) => {
    if (rendered) URL.revokeObjectURL(rendered.objectUrl);
    setRendered(result);
    setRenderError(null);
    setStage("result");
  };

  const handleRenderError = (message: string) => {
    setRenderError(message);
    setStage("result");
  };

  const handleFormatChange = (next: Format) => {
    setFormat(next);
    // Aspect ratio (and text fields) differ per format, so anything past the
    // crop stage is no longer valid — send the user back to re-crop rather
    // than silently stretching a stale crop or composite.
    if (stage !== "upload" && stage !== "crop") {
      if (rendered) URL.revokeObjectURL(rendered.objectUrl);
      setRendered(null);
      setRenderError(null);
      setFields(undefined);
      if (croppedImage) {
        URL.revokeObjectURL(croppedImage.objectUrl);
        setCroppedImage(null);
      }
      setStage(image ? "crop" : "upload");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center px-4 py-10 sm:py-16">
      <header className="text-center mb-8 flex flex-col items-center gap-5">
        <div>
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase">
            {BRAND.eventName}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Make your {FORMAT_CONFIG[format].shortLabel.toLowerCase()}
          </h1>
          <p className="text-white/50 text-sm mt-2">
            No sign-up. Upload a photo to get started.
          </p>
        </div>

        <FormatToggle
          value={format}
          onChange={handleFormatChange}
          disabled={stage === "crop" || stage === "rendering"}
        />
      </header>

      <main className="w-full flex-1 flex flex-col items-center">
        {stage === "upload" && <UploadDropzone onImageReady={handleImageReady} />}

        {stage === "crop" && image && (
          <CropStage
            imageSrc={image.objectUrl}
            format={format}
            onCancel={resetToUpload}
            onComplete={handleCropComplete}
          />
        )}

        {stage === "fields" && (
          <BuilderFieldsForm
            initial={fields}
            onCancel={() => setStage("crop")}
            onSubmit={handleFieldsSubmit}
          />
        )}

        {stage === "rendering" && croppedImage && (
          <CanvasRenderer
            format={format}
            croppedImageSrc={croppedImage.objectUrl}
            fields={fields}
            onComplete={handleRenderComplete}
            onError={handleRenderError}
          />
        )}

        {stage === "result" && (
          <>
            {renderError && (
              <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 text-center">
                <p role="alert" className="text-sm text-red-400">
                  {renderError}
                </p>
                <button
                  type="button"
                  onClick={() => setStage("rendering")}
                  className="min-h-[44px] px-6 rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}

            {!renderError && rendered && (
              <ResultPanel
                format={format}
                rendered={rendered}
                name={fields?.name}
                onEditFields={format === "card" ? () => setStage("fields") : undefined}
                onAdjustCrop={() => setStage("crop")}
                onNewPhoto={resetToUpload}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
