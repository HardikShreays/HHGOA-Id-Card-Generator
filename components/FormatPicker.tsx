"use client";

import { FORMAT_CONFIG, FORMATS, type Format } from "@/lib/constants";

type Props = {
  value?: Format;
  onChange: (format: Format) => void;
};

export default function FormatPicker({ value, onChange }: Props) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
      {FORMATS.map((format) => {
        const cfg = FORMAT_CONFIG[format];
        const active = value === format;
        return (
          <button
            key={format}
            type="button"
            onClick={() => onChange(format)}
            className={[
              "rounded-2xl border p-5 text-left transition-colors min-h-[44px]",
              active
                ? "border-gold bg-gold/10"
                : "border-paper/15 bg-forest hover:border-gold/50",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-lg font-bold text-paper">{cfg.label}</p>
              <p className="font-mono text-[11px] text-gold">
                {cfg.width}×{cfg.height}
              </p>
            </div>
            <p className="mt-2 text-sm text-paper/60">{cfg.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}
