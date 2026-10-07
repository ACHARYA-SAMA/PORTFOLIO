"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import GarageRow from "./GarageRow";
import CursorPreview from "./CursorPreview";
import CaseOverlay from "./CaseOverlay";
import ProjectGlobe from "./ProjectGlobe";
import ImageTrail from "./ImageTrail";
import SectionHead from "@/components/ui/SectionHead";
import { PROJECTS, chapterNo } from "@/lib/content";
import { pad } from "@/lib/format";
import s from "./garage.module.css";

const FLAGSHIP = PROJECTS.filter((p) => p.flagship);
const PINS = FLAGSHIP.map((p, i) => ({ label: pad(i + 1), title: p.title }));

export default function Garage() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [open, setOpen] = useState<{ index: number; source: HTMLElement | null } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const flagshipHover = hovered !== null && hovered < FLAGSHIP.length ? hovered : null;

  const openCase = (index: number, source: HTMLElement | null) => {
    // The overlay covers the row, so it never sees pointerleave. Clear hover here.
    setHovered(null);
    setOpen({ index, source });
  };

  const openFromGlobe = (pin: number) => {
    const row = document.querySelectorAll<HTMLElement>(`.${s.row} [data-flip-src]`)[pin] ?? null;
    openCase(pin, row);
  };

  const next = () => {
    if (!open) return;
    const index = (open.index + 1) % PROJECTS.length;
    const source = document.querySelectorAll<HTMLElement>(`.${s.row} [data-flip-src]`)[index] ?? null;
    setOpen({ index, source });
  };

  return (
    <section id="garage" className={s.garage} data-theme="paper" aria-labelledby="garage-title">
      <div className={s.wrap}>
        <div className={s.headArea}>
          <ImageTrail projects={PROJECTS} />
          <SectionHead
            index={chapterNo("garage")}
            kicker="Projects"
            meta={`${pad(FLAGSHIP.length)} flagship · ${pad(PROJECTS.length - FLAGSHIP.length)} more on the bench`}
            title={["The", "Garage"]}
            titleClassName={s.title}
            titleId="garage-title"
          />
        </div>

        <div className={s.flagship}>
          <ol className={s.rows}>
            {FLAGSHIP.map((p, i) => (
              <GarageRow key={p.id} project={p} index={i} active={hovered === i} onHover={setHovered} onOpen={openCase} />
            ))}
          </ol>
          <div className={s.globeCol}>
            <ProjectGlobe pins={PINS} active={flagshipHover} onPick={openFromGlobe} />
          </div>
        </div>

        <div className={`label ${s.moreHead}`}>
          <span>Also in the garage</span>
          <span className={s.moreRule} />
          <span>
            {pad(FLAGSHIP.length + 1)}–{pad(PROJECTS.length)}
          </span>
        </div>
        <ol className={s.rows} start={FLAGSHIP.length + 1}>
          {PROJECTS.slice(FLAGSHIP.length).map((p, i) => {
            const index = i + FLAGSHIP.length;
            return (
              <GarageRow key={p.id} project={p} index={index} active={hovered === index} onHover={setHovered} onOpen={openCase} />
            );
          })}
        </ol>
      </div>

      {/* Portalled so they sit above the nav instead of inside this section's stacking context. */}
      {mounted &&
        createPortal(
          <>
            <CursorPreview projects={PROJECTS} active={open ? null : hovered} />
            {open && (
              <CaseOverlay
                key={open.index}
                project={PROJECTS[open.index]}
                index={open.index}
                total={PROJECTS.length}
                source={open.source}
                onClose={() => setOpen(null)}
                onNext={next}
              />
            )}
          </>,
          document.body,
        )}
    </section>
  );
}
