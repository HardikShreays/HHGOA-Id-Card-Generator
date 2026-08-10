"use client";

import { FORMAT_CONFIG, type Format } from "@/lib/constants";

type Props = {
  value: Format;
  onChange: (format: Format) => void;
  disabled?: boolean;
};

const FORMATS: Format[] = ["pfp", "card"];

export default function FormatToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Output format"
      className="inline-flex rounded-full border border-white/15 bg-white/5 p-1"
    >
      {FORMATS.map((format) => {
        const isActive = value === format;
        return (
          <button
            key={format}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => !isActive && onChange(format)}
            className={[
              "px-4 py-2.5 rounded-full text-sm font-medium transition-colors min-w-[44px] min-h-[44px]",
              isActive
                ? "bg-emerald-500 text-black"
                : "text-white/60 hover:text-white/90",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            ].join(" ")}
          >
            {FORMAT_CONFIG[format].label}
          </button>
        );
      })}
    </div>
  );
}
