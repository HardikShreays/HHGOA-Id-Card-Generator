"use client";

import { useState, type FormEvent } from "react";
import type { BuilderFields } from "@/lib/canvasCompose";

type Props = {
  initial?: BuilderFields;
  showTeamName?: boolean;
  showSocials?: boolean;
  onCancel: () => void;
  onSubmit: (fields: BuilderFields) => void;
};

const NAME_MAX = 40;
const ROLE_MAX = 40;
const TEAM_MAX = 28;
const SOCIAL_MAX = 32;

const inputClass =
  "min-h-[44px] rounded-xl bg-paper/5 border border-paper/15 px-4 text-paper placeholder:text-paper/30 focus:outline-none focus:border-gold transition-colors";

export default function BuilderFieldsForm({
  initial,
  showTeamName,
  showSocials,
  onCancel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [xHandle, setXHandle] = useState(initial?.socials?.x ?? "");
  const [github, setGithub] = useState(initial?.socials?.github ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const socials = {
      ...(xHandle.trim() ? { x: xHandle.trim().replace(/^@/, "") } : {}),
      ...(github.trim() ? { github: github.trim() } : {}),
    };
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
      ...(Object.keys(socials).length ? { socials } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="builder-name" className="text-sm text-paper/70">
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
        <label htmlFor="builder-role" className="text-sm text-paper/70">
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
        <p className="text-xs text-paper/40">
          We generate a builder title from this — no need to overthink it.
        </p>
      </div>

      {showTeamName && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="builder-team" className="text-sm text-paper/70">
            Team name <span className="text-paper/35">(optional)</span>
          </label>
          <input
            id="builder-team"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value.slice(0, TEAM_MAX))}
            placeholder="e.g. Dietcode"
            maxLength={TEAM_MAX}
            className={inputClass}
          />
        </div>
      )}

      {showSocials && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="builder-x" className="text-sm text-paper/70">
              X <span className="text-paper/35">(optional)</span>
            </label>
            <input
              id="builder-x"
              type="text"
              value={xHandle}
              onChange={(e) => setXHandle(e.target.value.slice(0, SOCIAL_MAX))}
              placeholder="@handle"
              maxLength={SOCIAL_MAX}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="builder-gh" className="text-sm text-paper/70">
              GitHub <span className="text-paper/35">(optional)</span>
            </label>
            <input
              id="builder-gh"
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value.slice(0, SOCIAL_MAX))}
              placeholder="username"
              maxLength={SOCIAL_MAX}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div className="w-full flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl border border-paper/15 text-paper/70 text-sm font-medium hover:text-paper hover:border-paper/30 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[44px] rounded-xl bg-coral text-paper text-sm font-semibold hover:bg-coral/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
