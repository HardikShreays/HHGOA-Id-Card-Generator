"use client";

import { useCallback, useMemo, useState } from "react";
import UploadDropzone from "./UploadDropzone";
import CropStage from "./CropStage";
import CanvasRenderer, { type RenderedResult } from "./CanvasRenderer";
import ResultPanel, { ResultActions } from "./ResultPanel";
import type { CroppedImage, UploadedImage } from "@/lib/constants";
import type { TeamFields } from "@/lib/canvasCompose";

type DraftMember = {
  id: number;
  name: string;
  role: string;
  image: UploadedImage | null;
  cropped: CroppedImage | null;
};

const PREVIEW_PLACEHOLDER: CroppedImage = {
  objectUrl: "/brand/no-image-placeholder.png",
  width: 800,
  height: 1000,
};
const newMember = (id: number): DraftMember => ({
  id,
  name: "",
  role: "",
  image: null,
  cropped: PREVIEW_PLACEHOLDER,
});
const inputClass = "min-h-11 w-full rounded-xl border-2 border-black bg-white px-3 text-sm shadow-[3px_3px_0_#000] placeholder:text-ink/35";

export default function TeamEditor() {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([newMember(1), newMember(2)]);
  const [rendered, setRendered] = useState<RenderedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateMember = useCallback((id: number, patch: Partial<DraftMember>) => {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  }, []);

  const teamFields = useMemo<TeamFields | null>(() => {
    if (members.length < 2 || members.some((member) => !member.cropped)) return null;
    return {
      teamName,
      members: members.map((member) => ({
        name: member.name || "BUILDER",
        role: member.role || "TEAMMATE",
        imageSrc: member.cropped!.objectUrl,
      })),
    };
  }, [members, teamName]);

  const handleRendered = useCallback((next: RenderedResult) => {
    setRendered((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return next;
    });
    setError(null);
  }, []);

  const handleStartNew = useCallback(() => {
    setTeamName("");
    setMembers((current) => {
      for (const member of current) {
        if (member.image) URL.revokeObjectURL(member.image.objectUrl);
      }
      return [newMember(1), newMember(2)];
    });
    setRendered((previous) => {
      if (previous) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setError(null);
  }, []);

  const hasAllRealPhotos = members.every((member) => Boolean(member.image));

  return (
    <div>
      <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-gold">2–3 people. One frame.</p>
          <h1 className="font-[family-name:var(--font-display)] text-6xl font-bold leading-none">Team Frame</h1>
      </div>
      <div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,.88fr)]">
        <div className="flex min-w-0 flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gold">
          Team name
          <input value={teamName} onChange={(event) => setTeamName(event.target.value.slice(0, 36))} placeholder="Nightshift" className={inputClass} />
        </label>
        <div className="grid gap-5 md:grid-cols-2">
          {members.map((member, index) => (
            <MemberCard key={member.id} member={member} index={index} onUpdate={updateMember} />
          ))}
        </div>
        <div className="flex gap-3">
          {members.length < 3 && (
            <button type="button" onClick={() => setMembers((current) => [...current, newMember(Date.now())])} className="brutal-button min-h-11 rounded-xl bg-gold px-5 text-xs font-bold text-ink">
              + Add third teammate
            </button>
          )}
          {members.length === 3 && (
            <button type="button" onClick={() => setMembers((current) => current.slice(0, 2))} className="brutal-button min-h-11 rounded-xl bg-white px-5 text-xs font-bold text-ink">
              Remove third
            </button>
          )}
        </div>
      </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-20 lg:self-start">
          <div className="relative min-h-[390px] rounded-2xl border-[3px] border-black bg-gold p-3 text-ink shadow-[7px_7px_0_#000]">
            <div className="mb-3 flex items-center justify-between rounded-xl border-2 border-black bg-forest px-4 py-2 text-paper">
              <p className="text-[10px] font-bold uppercase tracking-[.18em]">Live preview</p>
            </div>
            <div className="rounded-xl border-2 border-black bg-parchment p-3">
              {!rendered && (
                <div className="flex min-h-[330px] items-center justify-center px-8 text-center text-xs font-bold text-forest">
                  Preparing your team preview…
                </div>
              )}
              {rendered && <ResultPanel format="team" rendered={rendered} />}
              {teamFields && <CanvasRenderer format="team" teamFields={teamFields} onComplete={handleRendered} onError={setError} />}
              {error && <p role="alert" className="mt-3 text-xs font-bold text-coral">{error}</p>}
            </div>
          </div>

          {rendered && (
            <div className="rounded-2xl border-[3px] border-black bg-parchment p-4 text-ink shadow-[7px_7px_0_#000]">
              <ResultActions
                format="team"
                rendered={rendered}
                name={teamName}
                actionsEnabled={hasAllRealPhotos}
                onStartNew={handleStartNew}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  index,
  onUpdate,
}: {
  member: DraftMember;
  index: number;
  onUpdate: (id: number, patch: Partial<DraftMember>) => void;
}) {
  const handleImage = useCallback((image: UploadedImage) => onUpdate(member.id, { image, cropped: null }), [member.id, onUpdate]);
  const handleCrop = useCallback((cropped: CroppedImage) => onUpdate(member.id, { cropped }), [member.id, onUpdate]);

  return (
    <div className="rounded-2xl border-[3px] border-black bg-parchment p-4 text-ink shadow-[6px_6px_0_#000]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-coral">Teammate {index + 1}</p>
        {member.image && <UploadDropzone onImageReady={handleImage} compact />}
      </div>
      {!member.image ? (
        <UploadDropzone onImageReady={handleImage} />
      ) : (
        <CropStage imageSrc={member.image.objectUrl} format="team" onChange={handleCrop} compact />
      )}
      <div className="mt-4 grid gap-3">
        <input value={member.name} onChange={(event) => onUpdate(member.id, { name: event.target.value.slice(0, 30) })} placeholder="Name" className={inputClass} />
        <input value={member.role} onChange={(event) => onUpdate(member.id, { role: event.target.value.slice(0, 30) })} placeholder="Role / stack" className={inputClass} />
      </div>
    </div>
  );
}
