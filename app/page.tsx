"use client";

import { useEffect, useRef, useState } from "react";
import EditorWorkspace from "@/components/EditorWorkspace";
import TeamEditor from "@/components/TeamEditor";
import { BRAND, type Format } from "@/lib/constants";

type Panel = "left" | "center" | "right";

const SIGNS: Array<{
  id: Format | "hype";
  label: string;
  side: Exclude<Panel, "center">;
  className: string;
}> = [
  { id: "card", label: "MAKE ID CARD", side: "left", className: "left-[33.4%] top-[23.1%] w-[26.4%]" },
  { id: "pfp", label: "MAKE PFP FRAME", side: "right", className: "left-[40.7%] top-[34.7%] w-[26.6%]" },
  { id: "team", label: "MAKE TEAM FRAME", side: "left", className: "left-[33.4%] top-[46.2%] w-[26.4%]" },
  { id: "hype", label: "CHECK HYPE", side: "right", className: "left-[40.7%] top-[57.8%] w-[26.6%]" },
];

export default function Home() {
  const [format, setFormat] = useState<Format>("card");
  const [panel, setPanel] = useState<Panel>("center");
  const [signsVisible, setSignsVisible] = useState(false);
  const signpostRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = signpostRef.current;
    if (!element) return;
    let observer: IntersectionObserver | null = null;
    const revealIfVisible = () => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
        setSignsVisible(true);
        observer?.disconnect();
        window.removeEventListener("scroll", revealIfVisible);
      }
    };
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(revealIfVisible, { threshold: 0.01 });
      observer.observe(element);
    }
    window.addEventListener("scroll", revealIfVisible, { passive: true });
    revealIfVisible();
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", revealIfVisible);
    };
  }, []);

  useEffect(() => {
    if (panel === "center") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [panel]);

  const openEditor = (nextFormat: Format, side: Exclude<Panel, "center">) => {
    setFormat(nextFormat);
    setPanel(side);
  };

  const closeEditor = () => {
    setPanel("center");
    window.history.replaceState(null, "", "#signpost");
  };
  const trackTransform =
    panel === "left" ? "translateX(100%)" : panel === "right" ? "translateX(-100%)" : "translateX(0)";

  return (
    <main className="overflow-x-hidden bg-forest text-paper">
      <Hero />

      <section
        ref={signpostRef}
        id="signpost"
        className={`overflow-hidden bg-forest ${
          panel === "center"
            ? "relative h-[65.07vw] min-h-0 lg:h-screen lg:h-[100svh] lg:min-h-[620px]"
            : "fixed inset-0 z-50 h-screen h-[100svh]"
        }`}
      >
        <div className="panel-track absolute inset-0" style={{ transform: trackTransform }}>
          <section
            className={`generator-panel absolute inset-0 overflow-y-auto bg-forest ${
              panel === "left" ? "visible pointer-events-auto" : "invisible pointer-events-none"
            }`}
            style={{ transform: "translateX(-100%)" }}
          >
            {panel === "left" && (
              <EditorChrome onBack={closeEditor}>
                {format === "team" ? <TeamEditor /> : <EditorWorkspace format="card" />}
              </EditorChrome>
            )}
          </section>

          <Signboard onPick={openEditor} signsVisible={signsVisible} interactive={panel === "center"} />

          <section
            className={`generator-panel absolute inset-0 overflow-y-auto bg-forest ${
              panel === "right" ? "visible pointer-events-auto" : "invisible pointer-events-none"
            }`}
            style={{ transform: "translateX(100%)" }}
          >
            {panel === "right" && (
              <EditorChrome onBack={closeEditor}>
                <EditorWorkspace format="pfp" />
              </EditorChrome>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative flex h-screen h-[100svh] min-h-[620px] flex-col items-center justify-start overflow-hidden border-b-[3px] border-black bg-forest px-5 pt-36 text-center sm:justify-center sm:pt-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/sunrise.png" alt="" className="hero-parallax absolute inset-x-0 bottom-0 h-[62%] w-full object-cover object-bottom opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-forest via-forest/95 to-forest/25" />
      <nav className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-start justify-between px-6 py-7 sm:px-14 sm:py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/studio-247.svg" alt="2:47 PM Studio" className="h-auto w-24 sm:w-32" />
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/hacker-house.png" alt="Hacker House" className="h-auto w-36 sm:w-64" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/goa-hindi.svg" alt="Goa" className="float-slow h-6 w-6 sm:h-10 sm:w-10" />
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex flex-col items-center sm:mt-16">
      <p className="hero-reveal text-[9px] font-bold uppercase tracking-[.28em] text-gold sm:text-sm">{BRAND.location} · {BRAND.dateRange}</p>
      <h1 className="hero-reveal mt-5 font-[family-name:var(--font-display)] text-[clamp(3.8rem,12vw,8.25rem)] font-bold leading-[.94] tracking-[-.02em]">
        BUILD IN<br />THE SUN
      </h1>
      <p className="hero-reveal mt-6 max-w-2xl text-[11px] font-semibold leading-relaxed sm:text-base">
        Less noise. More signal. <br />
        Make your HH Goa identity and ship it into the timeline.
      </p>
      <a href="#signpost" className="direction-cta brutal-button mt-8 rounded-full bg-gold px-7 py-3 text-xs font-bold text-ink sm:mt-10 sm:px-8 sm:py-4 sm:text-base">
        PICK YOUR DIRECTION ↓
      </a>
      </div>
      <div className="absolute inset-x-0 bottom-0">
        <div className="brand-ticker h-5 border-y-[3px] border-black" aria-hidden="true" />
      </div>
    </section>
  );
}

function Signboard({ onPick, signsVisible, interactive }: { onPick: (format: Format, side: "left" | "right") => void; signsVisible: boolean; interactive: boolean }) {
  return (
    <section className={`generator-panel signboard-reveal absolute inset-0 flex items-center justify-center overflow-hidden bg-forest ${interactive ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className="signboard-art relative aspect-[1440/937] w-full max-w-[1440px] shrink-0 scale-[1.15] lg:scale-100 lg:h-full lg:max-h-full lg:w-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/details.png" alt="Goa beach signpost with four directions" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />

        <div className="absolute left-1/2 top-[9%] z-20 w-max max-w-[90%] -translate-x-1/2 text-center lg:top-[6%]">
          <p className="signboard-title font-[family-name:var(--font-display)] font-bold leading-none text-gold">
            CHOOSE WHERE YOU&apos;RE HEADED
          </p>
          <p className="signboard-subtitle font-bold uppercase text-paper">Four signs. Three ways to frame the signal.</p>
        </div>

        {SIGNS.map((sign, index) => {
          const wrapperClass = `sign-reveal sign-wobble-${index % 2} absolute z-10 h-[8.8%] ${signsVisible ? "is-visible" : ""} ${sign.className}`;
          const className = "sign-hotspot flex h-full w-full touch-manipulation items-center justify-center px-[2%] text-center font-[family-name:var(--font-display)] font-bold leading-none text-ink";
          const pickSign = () => onPick(sign.id as Format, sign.side);
          if (sign.id === "hype") {
            return <div key={sign.id} className={wrapperClass} style={{ transitionDelay: `${index * 110}ms` }}><a href="https://hhgoa.com" className={className}>{sign.label} ↗</a></div>;
          }
          return (
            <div key={sign.id} className={wrapperClass} style={{ transitionDelay: `${index * 110}ms` }}>
              <a
                href={`/make/${sign.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  pickSign();
                }}
                className={className}
              >
                {sign.label}
              </a>
            </div>
          );
        })}

        <div className="signboard-footer absolute bottom-[6%] left-1/2 w-max max-w-[92%] -translate-x-1/2 rounded-full bg-parchment text-center font-bold text-ink lg:bottom-[1.35%]">
          LIVE PREVIEW · DOWNLOAD · SHARE TO X
        </div>
      </div>
    </section>
  );
}

function EditorChrome({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="relative min-h-full pb-20">
      <header className="sticky top-0 z-30 border-b-[3px] border-black bg-forest-deep/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-7">
          <button type="button" onClick={onBack} className="brutal-button min-h-10 rounded-full bg-gold px-4 text-[10px] font-bold text-ink">← Back to signs</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/hacker-house.png" alt="Hacker House" className="h-auto w-36 sm:w-48" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/goa-hindi.svg" alt="Goa" className="h-10 w-10" />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7">{children}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/palm-divider.svg" alt="" className="absolute inset-x-0 bottom-0 h-14 w-full object-cover opacity-55" />
    </div>
  );
}
