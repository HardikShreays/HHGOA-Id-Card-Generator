"use client";

import EditorWorkspace from "./EditorWorkspace";
import TeamEditor from "./TeamEditor";
import type { Format } from "@/lib/constants";

export default function StandaloneEditorPage({ format }: { format: Format }) {
  return (
    <main className="min-h-screen bg-forest text-paper">
      <header className="sticky top-0 z-30 border-b-[3px] border-black bg-forest-deep/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-7">
          <a
            href="/#signpost"
            className="brutal-button flex min-h-10 items-center rounded-full bg-gold px-4 text-[10px] font-bold text-ink"
          >
            ← Back to signs
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/hacker-house.png" alt="Hacker House" className="h-auto w-36 sm:w-48" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/goa-hindi.svg" alt="Goa" className="h-10 w-10" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7">
        {format === "team" ? <TeamEditor /> : <EditorWorkspace format={format} />}
      </div>
    </main>
  );
}
