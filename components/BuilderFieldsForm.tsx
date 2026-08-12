"use client";

import type { BuilderFields } from "@/lib/canvasCompose";

type Props = {
  value: BuilderFields;
  onChange: (fields: BuilderFields) => void;
};

const inputClass =
  "min-h-[44px] w-full rounded-xl border-2 border-black bg-white px-3 text-sm text-ink shadow-[3px_3px_0_#000] placeholder:text-ink/35 focus:bg-gold/10 focus:outline-none";

export default function BuilderFieldsForm({ value, onChange }: Props) {
  const update = (patch: Partial<BuilderFields>) => onChange({ ...value, ...patch });
  const updateSocial = (key: "x" | "github", raw: string) =>
    update({
      socials: {
        ...value.socials,
        [key]: raw.replace(/^@/, "").slice(0, 24),
      },
    });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Your name">
        <input
          value={value.name}
          onChange={(event) => update({ name: event.target.value.slice(0, 40) })}
          placeholder="Hardik Sharma"
          className={inputClass}
        />
      </Field>
      <Field label="Stack / role">
        <input
          value={value.role}
          onChange={(event) => update({ role: event.target.value.slice(0, 40) })}
          placeholder="AI Engineer"
          className={inputClass}
        />
      </Field>
      <Field label="Team name (optional)">
        <input
          value={value.teamName ?? ""}
          onChange={(event) => update({ teamName: event.target.value.slice(0, 30) })}
          placeholder="Nightshift"
          className={inputClass}
        />
      </Field>
      <Field label="X handle (optional)">
        <input
          value={value.socials?.x ?? ""}
          onChange={(event) => updateSocial("x", event.target.value)}
          placeholder="@handle"
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wide text-forest">
      {label}
      {children}
    </label>
  );
}
