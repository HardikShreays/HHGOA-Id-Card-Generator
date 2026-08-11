"use client";

import { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import CropStage from "@/components/CropStage";
import type { TeamFields } from "@/lib/canvasCompose";
import type { CroppedImage, UploadedImage } from "@/lib/constants";

type MemberDraft = {
  id: string;
  uploaded?: UploadedImage;
  cropped?: CroppedImage;
  name: string;
  role: string;
};

type Sub = "list" | "upload" | "crop" | "details";

type Props = {
  initial?: TeamFields;
  onCancel: () => void;
  onSubmit: (fields: TeamFields) => void;
};

const NAME_MAX = 28;
const ROLE_MAX = 28;
const TEAM_MAX = 32;

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function TeamFrameFlow({ initial, onCancel, onSubmit }: Props) {
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [members, setMembers] = useState<MemberDraft[]>(() =>
    initial?.members.map((m) => ({
      id: newId(),
      cropped: { objectUrl: m.imageSrc, width: 0, height: 0 },
      name: m.name,
      role: m.role ?? "",
    })) ?? []
  );
  const [sub, setSub] = useState<Sub>("list");
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = members.find((m) => m.id === activeId);

  const ready = members.filter((m) => m.cropped && m.name.trim());
  const canGenerate = ready.length >= 2 && teamName.trim().length > 0;

  const startAdd = () => {
    if (members.length >= 4) return;
    const id = newId();
    setMembers((prev) => [...prev, { id, name: "", role: "" }]);
    setActiveId(id);
    setSub("upload");
  };

  const updateActive = (patch: Partial<MemberDraft>) => {
    if (!activeId) return;
    setMembers((prev) => prev.map((m) => (m.id === activeId ? { ...m, ...patch } : m)));
  };

  const removeMember = (id: string) => {
    setMembers((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.uploaded) URL.revokeObjectURL(target.uploaded.objectUrl);
      if (target?.cropped) URL.revokeObjectURL(target.cropped.objectUrl);
      return prev.filter((m) => m.id !== id);
    });
    if (activeId === id) {
      setActiveId(null);
      setSub("list");
    }
  };

  const handleImageReady = (img: UploadedImage) => {
    updateActive({ uploaded: img });
    setSub("crop");
  };

  const handleCropComplete = (cropped: CroppedImage) => {
    const prev = active?.cropped;
    if (prev) URL.revokeObjectURL(prev.objectUrl);
    updateActive({ cropped });
    setSub("details");
  };

  const handleDetailsDone = () => {
    setActiveId(null);
    setSub("list");
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    onSubmit({
      teamName: teamName.trim(),
      members: ready.map((m) => ({
        name: m.name.trim(),
        role: m.role.trim() || undefined,
        imageSrc: m.cropped!.objectUrl,
      })),
    });
  };

  if (sub === "upload") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <p className="text-sm text-paper/60 text-center">
          Photo for teammate {members.findIndex((m) => m.id === activeId) + 1}
        </p>
        <UploadDropzone onImageReady={handleImageReady} />
        <button
          type="button"
          onClick={() => {
            if (active && !active.cropped) removeMember(active.id);
            else {
              setActiveId(null);
              setSub("list");
            }
          }}
          className="min-h-[44px] text-sm text-paper/60 underline underline-offset-4"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (sub === "crop" && active?.uploaded) {
    return (
      <CropStage
        imageSrc={active.uploaded.objectUrl}
        format="team"
        onCancel={() => setSub("upload")}
        onComplete={handleCropComplete}
      />
    );
  }

  if (sub === "details" && active) {
    return (
      <form
        className="w-full max-w-md mx-auto flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleDetailsDone();
        }}
      >
        {active.cropped && (
          <img
            src={active.cropped.objectUrl}
            alt=""
            className="mx-auto h-28 w-28 rounded-full object-cover border-2 border-gold"
          />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tm-name" className="text-sm text-paper/70">
            Name
          </label>
          <input
            id="tm-name"
            type="text"
            value={active.name}
            onChange={(e) => updateActive({ name: e.target.value.slice(0, NAME_MAX) })}
            placeholder="Teammate name"
            maxLength={NAME_MAX}
            className="min-h-[44px] rounded-xl bg-paper/5 border border-paper/15 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tm-role" className="text-sm text-paper/70">
            Stack / role <span className="text-paper/35">(optional)</span>
          </label>
          <input
            id="tm-role"
            type="text"
            value={active.role}
            onChange={(e) => updateActive({ role: e.target.value.slice(0, ROLE_MAX) })}
            placeholder="e.g. Frontend"
            maxLength={ROLE_MAX}
            className="min-h-[44px] rounded-xl bg-paper/5 border border-paper/15 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={!active.name.trim()}
          className="min-h-[44px] rounded-xl bg-coral text-paper text-sm font-semibold disabled:opacity-40"
        >
          Add to frame
        </button>
      </form>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-name" className="text-sm text-paper/70">
          Team name
        </label>
        <input
          id="team-name"
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value.slice(0, TEAM_MAX))}
          placeholder="e.g. Dietcode"
          maxLength={TEAM_MAX}
          className="min-h-[44px] rounded-xl bg-paper/5 border border-paper/15 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold font-display text-lg"
        />
      </div>

      <div>
        <p className="text-sm text-paper/70 mb-3">Teammates · {ready.length}/4 · need 2–4</p>
        <div className="grid grid-cols-2 gap-3">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="relative rounded-2xl border border-paper/15 bg-forest p-3 flex flex-col items-center gap-2"
            >
              {m.cropped ? (
                <img src={m.cropped.objectUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-paper/5" />
              )}
              <p className="text-sm text-paper truncate w-full text-center">{m.name || `Builder ${i + 1}`}</p>
              <button
                type="button"
                onClick={() => removeMember(m.id)}
                className="text-xs text-coral/80 hover:text-coral min-h-[44px]"
              >
                Remove
              </button>
            </div>
          ))}
          {members.length < 4 && (
            <button
              type="button"
              onClick={startAdd}
              className="rounded-2xl border border-dashed border-gold/40 min-h-[160px] text-gold text-sm font-medium hover:bg-gold/5"
            >
              + Add teammate
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl border border-paper/15 text-paper/70 text-sm font-medium hover:text-paper"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex-1 min-h-[44px] rounded-xl bg-coral text-paper text-sm font-semibold disabled:opacity-40"
        >
          Generate frame
        </button>
      </div>
    </div>
  );
}
