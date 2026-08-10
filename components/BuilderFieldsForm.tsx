"use client";

import { useState, type FormEvent } from "react";
import type { BuilderFields } from "@/lib/canvasCompose";

type Props = {
  initial?: BuilderFields;
  onCancel: () => void;
  onSubmit: (fields: BuilderFields) => void;
};

const NAME_MAX = 40;
const ROLE_MAX = 40;

export default function BuilderFieldsForm({ initial, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), role: role.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="builder-name" className="text-sm text-white/70">
          Your name
        </label>
        <input
          id="builder-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder="e.g. Hardik Sharma"
          maxLength={NAME_MAX}
          className="min-h-[44px] rounded-xl bg-white/5 border border-white/15 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400 transition-colors"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="builder-role" className="text-sm text-white/70">
          Stack / role
        </label>
        <input
          id="builder-role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value.slice(0, ROLE_MAX))}
          placeholder="e.g. AI Engineer, Backend"
          maxLength={ROLE_MAX}
          className="min-h-[44px] rounded-xl bg-white/5 border border-white/15 px-4 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400 transition-colors"
        />
        <p className="text-xs text-white/40">
          We'll generate a fun builder title from this — no need to overthink it.
        </p>
      </div>

      <div className="w-full flex gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 min-h-[44px] rounded-xl border border-white/15 text-white/70 text-sm font-medium hover:text-white hover:border-white/30 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
