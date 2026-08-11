"use client";

import { FORMAT_CONFIG, FORMATS, type Format } from "@/lib/constants";

type Props = {
  value: Format;
  onChange: (format: Format) => void;
  disabled?: boolean;
};

export default function FormatToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Output format"
      className="inline-flex flex-wrap justify-center rounded-full border border-paper/15 bg-forest p-1"
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
              "px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px]",
              isActive ? "bg-gold text-ink" : "text-paper/60 hover:text-paper",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            ].join(" ")}
          >
            {FORMAT_CONFIG[format].shortLabel}
          </button>
        );
      })}
    </div>
  );
}
