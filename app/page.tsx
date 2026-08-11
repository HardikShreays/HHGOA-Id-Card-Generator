"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import FormatPicker from "@/components/FormatPicker";
import FormatToggle from "@/components/FormatToggle";
import CropStage from "@/components/CropStage";
import BuilderFieldsForm from "@/components/BuilderFieldsForm";
import TeamFrameFlow from "@/components/TeamFrameFlow";
import CanvasRenderer, { type RenderedResult } from "@/components/CanvasRenderer";
import ResultPanel from "@/components/ResultPanel";
import type { BuilderFields, TeamFields } from "@/lib/canvasCompose";
import { BRAND, FORMAT_CONFIG, type CroppedImage, type Format, type UploadedImage } from "@/lib/constants";

type Stage = "pick" | "upload" | "crop" | "fields" | "team" | "rendering" | "result";

function newShareId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function Home() {
  const [format, setFormat] = useState<Format>("pfp");
  const [stage, setStage] = useState<Stage>("pick");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [croppedImage, setCroppedImage] = useState<CroppedImage | null>(null);
  const [fields, setFields] = useState<BuilderFields | undefined>(undefined);
  const [teamFields, setTeamFields] = useState<TeamFields | undefined>(undefined);
  const [rendered, setRendered] = useState<RenderedResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [shareId, setShareId] = useState(newShareId);

  const resetToPick = () => {
    if (image) URL.revokeObjectURL(image.objectUrl);
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    if (rendered) URL.revokeObjectURL(rendered.objectUrl);
    teamFields?.members.forEach((m) => {
      if (m.imageSrc.startsWith("blob:")) URL.revokeObjectURL(m.imageSrc);
    });
    setImage(null);
    setCroppedImage(null);
    setFields(undefined);
    setTeamFields(undefined);
    setRendered(null);
    setRenderError(null);
    setShareId(newShareId());
    setStage("pick");
  };

  const handleFormatPicked = (next: Format) => {
    setFormat(next);
    setStage(next === "team" ? "team" : "upload");
  };

  const handleFormatChange = (next: Format) => {
    if (next === format) return;
    if (image) URL.revokeObjectURL(image.objectUrl);
    if (croppedImage) URL.revokeObjectURL(croppedImage.objectUrl);
    if (rendered) URL.revokeObjectURL(rendered.objectUrl);
    teamFields?.members.forEach((m) => {
      if (m.imageSrc.startsWith("blob:")) URL.revokeObjectURL(m.imageSrc);
    });
    setImage(null);
    setCroppedImage(null);
    setFields(undefined);
    setTeamFields(undefined);
    setRendered(null);
    setRenderError(null);
    setShareId(newShareId());
    setFormat(next);
    setStage(next === "team" ? "team" : "upload");
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

  const handleTeamSubmit = (submitted: TeamFields) => {
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

  const inFlow = stage !== "pick";

  return (
    <div className="min-h-screen bg-forest-deep flex flex-col items-center px-4 py-10 sm:py-16">
      <header className="text-center mb-10 flex flex-col items-center gap-5 max-w-2xl">
        <p className="inline-flex items-center rounded-full border border-gold/40 bg-forest px-4 py-1.5 font-mono text-[11px] tracking-widest text-gold uppercase">
          {BRAND.location} · {BRAND.dateRange}
        </p>
        <div>
          <p className="font-devanagari text-3xl text-gold mb-2">{BRAND.eventNameDevanagari}</p>
          <h1 className="font-display text-3xl sm:text-5xl font-black text-paper tracking-tight">
            Frame yourself for {BRAND.eventName}
          </h1>
          <p className="text-paper/55 text-sm mt-3">{BRAND.tagline}</p>
          <p className="font-mono text-[11px] text-paper/35 mt-2 tracking-widest">
            Powered by {BRAND.studioCredit}
          </p>
        </div>
      </header>

      <main className="w-full flex-1 flex flex-col items-center gap-8">
        {stage === "pick" && (
          <>
            <FormatPicker onChange={handleFormatPicked} />
            <p className="font-mono text-xs text-paper/40 tracking-wide">
              247 Builders · 4 Days · {BRAND.hashtag}
            </p>
          </>
        )}

        {inFlow && (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={resetToPick}
              className="text-xs font-mono text-paper/40 hover:text-gold min-h-[44px]"
            >
              ← All formats
            </button>
            <FormatToggle
              value={format}
              onChange={handleFormatChange}
              disabled={stage === "crop" || stage === "rendering"}
            />
            <h2 className="font-display text-xl text-paper">
              Make your {FORMAT_CONFIG[format].shortLabel.toLowerCase()}
            </h2>
          </div>
        )}

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
            showTeamName={format === "card" || format === "boarding"}
            showSocials={format === "card"}
            onCancel={() => setStage("crop")}
            onSubmit={handleFieldsSubmit}
          />
        )}

        {stage === "team" && (
          <TeamFrameFlow
            initial={teamFields}
            onCancel={resetToPick}
            onSubmit={handleTeamSubmit}
          />
        )}

        {stage === "rendering" && (croppedImage || teamFields) && (
          <CanvasRenderer
            format={format}
            croppedImageSrc={croppedImage?.objectUrl}
            fields={fields}
            teamFields={teamFields}
            shareId={shareId}
            onComplete={handleRenderComplete}
            onError={handleRenderError}
          />
        )}

        {stage === "result" && (
          <>
            {renderError && (
              <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 text-center">
                <p role="alert" className="text-sm text-coral">
                  {renderError}
                </p>
                <button
                  type="button"
                  onClick={() => setStage("rendering")}
                  className="min-h-[44px] px-6 rounded-xl bg-coral text-paper text-sm font-semibold"
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
                onEditFields={() => setStage(format === "team" ? "team" : "fields")}
                onAdjustCrop={() => setStage(format === "team" ? "team" : "crop")}
                onNewPhoto={resetToPick}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-16 w-full max-w-3xl border-t border-paper/10 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-paper/40">
        <span className="text-coral">{BRAND.hashtag}</span>
        <a href="https://hhgoa.com" className="hover:text-gold" target="_blank" rel="noreferrer">
          hhgoa.com
        </a>
        <span>{BRAND.studioCredit}</span>
      </footer>
    </div>
  );
}
