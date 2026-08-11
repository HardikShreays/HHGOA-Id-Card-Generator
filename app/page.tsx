"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import FormatToggle from "@/components/FormatToggle";
import CropStage from "@/components/CropStage";
import BuilderFieldsForm from "@/components/BuilderFieldsForm";
import TeamUploadFlow from "@/components/TeamUploadFlow";
import CanvasRenderer, { type RenderedResult } from "@/components/CanvasRenderer";
import ResultPanel from "@/components/ResultPanel";
import type { BuilderFields, TeamFields } from "@/lib/canvasCompose";
import { BRAND, FORMAT_CONFIG, type CroppedImage, type Format, type UploadedImage } from "@/lib/constants";

type Stage = "landing" | "upload" | "crop" | "fields" | "team" | "rendering" | "result";

export default function Home() {
  const [format, setFormat] = useState<Format>("pfp");
  const [stage, setStage] = useState<Stage>("landing");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [croppedImage, setCroppedImage] = useState<CroppedImage | null>(null);
  const [fields, setFields] = useState<BuilderFields | undefined>(undefined);
  const [teamFields, setTeamFields] = useState<TeamFields | null>(null);
  const [rendered, setRendered] = useState<RenderedResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const resetAll = (nextStage: Stage = "landing") => {
    if (image) URL.revokeObjectURL(image.objectUrl);
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    if (rendered) URL.revokeObjectURL(rendered.objectUrl);
    setImage(null);
    setCroppedImage(null);
    setFields(undefined);
    setTeamFields(null);
    setRendered(null);
    setRenderError(null);
    setStage(nextStage);
  };

  const handlePickFormat = (next: Format) => {
    setFormat(next);
    resetAll(next === "team" ? "team" : "upload");
  };

  const handleFormatToggleChange = (next: Format) => {
    setFormat(next);
    // Aspect ratio (and text fields) differ per format, so anything past
    // upload is no longer valid — start that format's flow fresh.
    resetAll(next === "team" ? "team" : "upload");
  };

  const handleImageReady = (img: UploadedImage) => {
    setImage(img);
    setStage("crop");
  };

  const handleCropComplete = (cropped: CroppedImage) => {
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    setCroppedImage(cropped);
    setStage("fields");
  };

  const handleFieldsSubmit = (submitted: BuilderFields) => {
    setFields(submitted);
    setStage("rendering");
  };

  const handleTeamComplete = (submitted: TeamFields) => {
    setTeamFields(submitted);
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

  return (
    <div className="min-h-screen bg-forest flex flex-col items-center px-4 py-10 sm:py-16">
      <header className="text-center mb-8 flex flex-col items-center gap-5 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-forest-deep/50 px-4 py-1.5">
          <span className="text-gold text-xs font-semibold tracking-wide uppercase font-[family-name:var(--font-mono-brand)]">
            {BRAND.location} · {BRAND.dateRange}
          </span>
        </div>

        <div>
          <h1 className="flex flex-col items-center gap-1">
            <span className="text-3xl sm:text-5xl font-black text-paper font-[family-name:var(--font-display)]">
              {BRAND.eventName}
            </span>
            <span className="text-2xl sm:text-3xl text-gold font-bold font-[family-name:var(--font-devanagari)]">
              {BRAND.eventNameDevanagari}
            </span>
          </h1>
          <p className="text-paper/60 text-sm sm:text-base mt-3 font-[family-name:var(--font-body)]">
            {BRAND.tagline}
          </p>
        </div>

        {stage !== "landing" && (
          <button
            type="button"
            onClick={() => resetAll("landing")}
            className="text-xs text-paper/50 hover:text-paper underline underline-offset-4 font-[family-name:var(--font-body)]"
          >
            ← Choose a different format
          </button>
        )}

        {stage !== "landing" && (
          <FormatToggle
            value={format}
            onChange={handleFormatToggleChange}
            disabled={stage === "rendering"}
          />
        )}
      </header>

      <main className="w-full flex-1 flex flex-col items-center">
        {stage === "landing" && <FormatPicker onPick={handlePickFormat} />}

        {stage === "upload" && <UploadDropzone onImageReady={handleImageReady} />}

        {stage === "crop" && image && (
          <CropStage
            imageSrc={image.objectUrl}
            format={format}
            onCancel={() => setStage("upload")}
            onComplete={handleCropComplete}
          />
        )}

        {stage === "fields" && (
          <BuilderFieldsForm
            initial={fields}
            showTeamName={format !== "team"}
            onCancel={() => setStage("crop")}
            onSubmit={handleFieldsSubmit}
          />
        )}

        {stage === "team" && (
          <TeamUploadFlow onCancel={() => resetAll("landing")} onComplete={handleTeamComplete} />
        )}

        {stage === "rendering" && format !== "team" && croppedImage && (
          <CanvasRenderer
            format={format}
            croppedImageSrc={croppedImage.objectUrl}
            fields={fields}
            onComplete={handleRenderComplete}
            onError={handleRenderError}
          />
        )}

        {stage === "rendering" && format === "team" && teamFields && (
          <CanvasRenderer
            format="team"
            teamFields={teamFields}
            onComplete={handleRenderComplete}
            onError={handleRenderError}
          />
        )}

        {stage === "result" && (
          <>
            {renderError && (
              <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 text-center">
                <p role="alert" className="text-sm text-coral font-[family-name:var(--font-body)]">
                  {renderError}
                </p>
                <button
                  type="button"
                  onClick={() => setStage("rendering")}
                  className="min-h-[44px] px-6 rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 transition-all font-[family-name:var(--font-body)]"
                >
                  Try again
                </button>
              </div>
            )}

            {!renderError && rendered && (
              <ResultPanel
                format={format}
                rendered={rendered}
                name={format === "team" ? teamFields?.teamName : fields?.name}
                fields={format === "team" ? undefined : fields}
                onEditFields={format === "team" ? () => setStage("team") : () => setStage("fields")}
                onAdjustCrop={format === "team" ? undefined : () => setStage("crop")}
                onNewPhoto={format === "team" ? undefined : () => resetAll("upload")}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-16 flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-paper/40 font-[family-name:var(--font-mono-brand)]">
          {BRAND.hashtag} · {BRAND.studioCredit}
        </p>
        <a
          href="https://hhgoa.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-paper/30 hover:text-paper/60 underline underline-offset-4"
        >
          hhgoa.com
        </a>
      </footer>
    </div>
  );
}

function FormatPicker({ onPick }: { onPick: (format: Format) => void }) {
  const formats: Format[] = ["pfp", "card", "boarding", "team"];
  return (
    <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
      {formats.map((f) => {
        const config = FORMAT_CONFIG[f];
        return (
          <button
            key={f}
            type="button"
            onClick={() => onPick(f)}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-gold/20 bg-forest-deep/40 p-5 text-left hover:border-gold/50 hover:bg-forest-deep/70 transition-all"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-lg font-bold text-paper font-[family-name:var(--font-display)]">
                {config.label}
              </span>
              <span className="text-xs text-gold font-[family-name:var(--font-mono-brand)]">
                {config.outputDims}
              </span>
            </div>
            <p className="text-sm text-paper/60 font-[family-name:var(--font-body)]">
              {config.description}
            </p>
            <span className="mt-2 text-xs text-gold/80 group-hover:text-gold font-semibold font-[family-name:var(--font-body)]">
              Start →
            </span>
          </button>
        );
      })}
    </div>
  );
}
