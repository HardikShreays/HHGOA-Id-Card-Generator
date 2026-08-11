"use client";

import { useState, type FormEvent } from "react";
import type { BuilderFields } from "@/lib/canvasCompose";

type Props = {
  initial?: BuilderFields;
  /** Card/PFP/Boarding all use this form; team name is only meaningful
   *  outside the Team Frame format (a personal "which team am I on" pill),
   *  so callers can hide it entirely when it doesn't apply. */
  showTeamName?: boolean;
  showSocials?: boolean;
  onCancel: () => void;
  onSubmit: (fields: BuilderFields) => void;
};

const NAME_MAX = 40;
const ROLE_MAX = 40;
const TEAM_MAX = 30;
const HANDLE_MAX = 24;

const inputClass =
  "min-h-[44px] rounded-xl bg-forest-deep/60 border border-gold/25 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold transition-colors font-[family-name:var(--font-body)]";

export default function BuilderFieldsForm({
  initial,
  showTeamName = true,
  showSocials = true,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [xHandle, setXHandle] = useState(initial?.socials?.x ?? "");
  const [githubHandle, setGithubHandle] = useState(initial?.socials?.github ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const socials =
      xHandle.trim() || githubHandle.trim()
        ? {
            ...(xHandle.trim() ? { x: xHandle.trim().replace(/^@/, "") } : {}),
            ...(githubHandle.trim() ? { github: githubHandle.trim().replace(/^@/, "") } : {}),
          }
        : undefined;

    onSubmit({
      name: name.trim(),
      role: role.trim(),
      ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
      ...(socials ? { socials } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="builder-name" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
          Your name
        </label>
        <input
          id="builder-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder="e.g. Hardik Sharma"
          maxLength={NAME_MAX}
          className={inputClass}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="builder-role" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
          Stack / role
        </label>
        <input
          id="builder-role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value.slice(0, ROLE_MAX))}
          placeholder="e.g. AI Engineer, Backend"
          maxLength={ROLE_MAX}
          className={inputClass}
        />
        <p className="text-xs text-paper/40 font-[family-name:var(--font-body)]">
          We&apos;ll generate a fun builder title from this — no need to overthink it.
        </p>
      </div>

      {showTeamName && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="builder-team" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
            Team name <span className="text-paper/40">(optional)</span>
          </label>
          <input
            id="builder-team"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value.slice(0, TEAM_MAX))}
            placeholder="e.g. Nightshift"
            maxLength={TEAM_MAX}
            className={inputClass}
          />
        </div>
      )}

      {showSocials && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="builder-x" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
              X handle <span className="text-paper/40">(optional)</span>
            </label>
            <input
              id="builder-x"
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value.slice(0, HANDLE_MAX))}
              placeholder="@handle"
              maxLength={HANDLE_MAX}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="builder-github" className="text-sm text-paper/70 font-[family-name:var(--font-body)]">
              GitHub <span className="text-paper/40">(optional)</span>
            </label>
            <input
              id="builder-github"
              type="text"
              value={githubHandle}
              onChange={(e) => setGithubHandle(e.target.value.slice(0, HANDLE_MAX))}
              placeholder="username"
              maxLength={HANDLE_MAX}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="w-full flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl border border-gold/25 text-paper/70 text-sm font-medium hover:text-paper hover:border-gold/50 transition-colors font-[family-name:var(--font-body)]"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!name.trim() || !role.trim()}
          className="flex-1 min-h-[44px] rounded-xl bg-gold text-ink text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-[family-name:var(--font-body)]"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
