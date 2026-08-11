"use client";

// components/TeamUploadFlow.tsx
// Team Frame (plan §3.4/§4/§9) needs 2–4 photos instead of 1 — this is a
// thin wrapper that repeats the existing single-photo
// UploadDropzone -> CropStage steps once per teammate, rather than a
// rewrite of either (plan §9's explicit guidance).

import { useState } from "react";
import UploadDropzone from "./UploadDropzone";
import CropStage from "./CropStage";
import type { UploadedImage, CroppedImage } from "@/lib/constants";
import type { TeamFields, TeamMember } from "@/lib/canvasCompose";

type Props = {
  onCancel: () => void;
  onComplete: (fields: TeamFields) => void;
};

type MemberDraft = TeamMember; // { name, role?, imageSrc }

type SubStep = "upload" | "crop" | "details";

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 4;
const NAME_MAX = 30;
const ROLE_MAX = 30;

export default function TeamUploadFlow({ onCancel, onComplete }: Props) {
  const [teamName, setTeamName] = useState("");
  const [teamNameConfirmed, setTeamNameConfirmed] = useState(false);

  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [subStep, setSubStep] = useState<SubStep>("upload");
  const [pendingUpload, setPendingUpload] = useState<UploadedImage | null>(null);
  const [pendingCropped, setPendingCropped] = useState<CroppedImage | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");

  const atMax = members.length >= MAX_MEMBERS;
  const canFinish = members.length >= MIN_MEMBERS;

  if (!teamNameConfirmed) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="team-name" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
            Team name
          </label>
          <input
            id="team-name"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value.slice(0, 30))}
            placeholder="e.g. Nightshift"
            className="min-h-[44px] rounded-xl bg-forest-deep/60 border border-gold/25 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold transition-colors font-[family-name:var(--font-body)]"
            autoFocus
          />
          <p className="text-xs text-paper/40 font-[family-name:var(--font-body)]">
            You&apos;ll add 2–4 teammates&apos; photos next.
          </p>
        </div>
        <div className="w-full flex gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-xl border border-gold/25 text-paper/70 text-sm font-medium hover:text-paper hover:border-gold/50 transition-colors font-[family-name:var(--font-body)]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!teamName.trim()}
            onClick={() => setTeamNameConfirmed(true)}
            className="flex-1 min-h-[44px] rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-body)]"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // --- Per-member upload step ---
  if (subStep === "upload") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <MemberProgress members={members} current={members.length} />
        <p className="text-center text-sm text-paper/60 font-[family-name:var(--font-body)]">
          Photo for teammate {members.length + 1}
        </p>
        <UploadDropzone
          onImageReady={(img) => {
            setPendingUpload(img);
            setSubStep("crop");
          }}
        />
        <div className="w-full flex gap-3">
          <button
            type="button"
            onClick={() => (members.length === 0 ? setTeamNameConfirmed(false) : onCancel())}
            className="flex-1 min-h-[44px] rounded-xl border border-gold/25 text-paper/70 text-sm font-medium hover:text-paper hover:border-gold/50 transition-colors font-[family-name:var(--font-body)]"
          >
            Back
          </button>
          {canFinish && (
            <button
              type="button"
              onClick={() => onComplete({ teamName: teamName.trim(), members })}
              className="flex-1 min-h-[44px] rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 transition-all font-[family-name:var(--font-body)]"
            >
              Done — generate ({members.length})
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Per-member crop step ---
  if (subStep === "crop" && pendingUpload) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <MemberProgress members={members} current={members.length} />
        <CropStage
          imageSrc={pendingUpload.objectUrl}
          format="team"
          onCancel={() => {
            setPendingUpload(null);
            setSubStep("upload");
          }}
          onComplete={(cropped) => {
            setPendingCropped(cropped);
            setDraftName("");
            setDraftRole("");
            setSubStep("details");
          }}
        />
      </div>
    );
  }

  // --- Per-member name/role step ---
  if (subStep === "details" && pendingCropped) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <MemberProgress members={members} current={members.length} />
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingCropped.objectUrl}
            alt="Cropped preview"
            className="w-20 h-20 rounded-full object-cover border-2 border-gold/40"
          />
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.slice(0, NAME_MAX))}
              placeholder="Teammate name"
              className="min-h-[44px] rounded-xl bg-forest-deep/60 border border-gold/25 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold transition-colors font-[family-name:var(--font-body)]"
              autoFocus
            />
            <input
              type="text"
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value.slice(0, ROLE_MAX))}
              placeholder="Role (optional)"
              className="min-h-[44px] rounded-xl bg-forest-deep/60 border border-gold/25 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold transition-colors font-[family-name:var(--font-body)]"
            />
          </div>
        </div>

        <div className="w-full flex gap-3">
          <button
            type="button"
            onClick={() => setSubStep("crop")}
            className="flex-1 min-h-[44px] rounded-xl border border-gold/25 text-paper/70 text-sm font-medium hover:text-paper hover:border-gold/50 transition-colors font-[family-name:var(--font-body)]"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!draftName.trim()}
            onClick={() => {
              const next: MemberDraft = {
                name: draftName.trim(),
                role: draftRole.trim() || undefined,
                imageSrc: pendingCropped.objectUrl,
              };
              const updated = [...members, next];
              setMembers(updated);
              setPendingUpload(null);
              setPendingCropped(null);
              if (updated.length >= MAX_MEMBERS) {
                onComplete({ teamName: teamName.trim(), members: updated });
              } else {
                setSubStep("upload");
              }
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-body)]"
          >
            {atMax ? "Add & generate" : "Add teammate"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function MemberProgress({ members, current }: { members: MemberDraft[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: MAX_MEMBERS }).map((_, i) => (
        <div
          key={i}
          className={[
            "h-1.5 rounded-full transition-all",
            i < members.length ? "w-8 bg-gold" : i === current ? "w-8 bg-gold/40" : "w-4 bg-gold/15",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
