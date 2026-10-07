"use client";

import TextScramble from "@/components/ui/TextScramble";
import type { Project } from "@/lib/content";
import { pad } from "@/lib/format";
import s from "./garage.module.css";

type Props = {
  project: Project;
  index: number;
  active: boolean;
  onHover: (index: number | null) => void;
  onOpen: (index: number, source: HTMLElement) => void;
};

export default function GarageRow({ project, index, active, onHover, onOpen }: Props) {
  const big = Boolean(project.flagship);

  return (
    <li className={`${s.row} ${big ? s.rowBig : s.rowSmall}`} data-active={active}>
      <button
        type="button"
        className={s.rowBtn}
        aria-haspopup="dialog"
        data-cursor="VIEW"
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(index)}
        onBlur={() => onHover(null)}
        onClick={(e) => onOpen(index, e.currentTarget.querySelector<HTMLElement>("[data-flip-src]")!)}
      >
        <span className={s.flipSrc} data-flip-src="" aria-hidden="true" />
        <span className={s.rowFill} aria-hidden="true" />
        <span className={`display ${s.rowIndex}`} aria-hidden="true">
          {pad(index + 1)}
        </span>
        <span className={s.rowMain}>
          <TextScramble text={project.title} hoverRoot="button" className={`display ${s.rowTitle}`} />
          {project.line && <span className={s.rowLine}>{project.line}</span>}
        </span>
        <span className={s.chips}>
          {project.tags.map((t) => (
            <span key={t} className={`label ${s.chip}`}>
              {t}
            </span>
          ))}
        </span>
        <span className={s.rowArrow} aria-hidden="true">
          ↗
        </span>
      </button>
    </li>
  );
}
