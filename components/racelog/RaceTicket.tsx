"use client";

import { useEffect, useState, type CSSProperties } from "react";
import KalmanViz from "./KalmanViz";
import TextScramble from "@/components/ui/TextScramble";
import type { RaceEntry } from "@/lib/content";
import { pad } from "@/lib/format";
import s from "./racelog.module.css";

type Props = { entry: RaceEntry; index: number; total: number };

function Belt() {
  return (
    <svg className={s.belt} viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="40" width="400" height="34" />
      <g transform="translate(250 57)">
        <path d="M-18 -20h36l6 40h-48z" />
        <path d="M-6 16l-28 58 18 4 22-56z" />
        <path d="M6 16l30 56-18 6-20-56z" />
      </g>
      <rect x="0" y="54" width="400" height="2" className={s.beltStitch} />
    </svg>
  );
}

/** A race ticket: perforated stub, mono ticket number, big name, serif result. */
export default function RaceTicket({ entry, index, total }: Props) {
  const wide = entry.variant === "wide";
  const belt = entry.variant === "belt";
  const [open, setOpen] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => setTouch(window.matchMedia("(hover: none)").matches), []);

  const expanded = open || touch;
  const number = pad(index + 1, 2);
  // Longest word drives the name size so nothing breaks mid-word.
  const longest = Math.max(...entry.name.split(/\s+/).map((w) => w.length));

  return (
    <article
      className={`${s.ticket} ${wide ? s.ticketWide : ""} ${belt ? s.ticketBelt : ""}`}
      data-ticket=""
      data-open={wide ? expanded : undefined}
      tabIndex={wide ? 0 : undefined}
      onPointerEnter={wide ? () => setOpen(true) : undefined}
      onPointerLeave={wide ? () => setOpen(false) : undefined}
      onFocus={wide ? () => setOpen(true) : undefined}
      onBlur={wide ? () => setOpen(false) : undefined}
      aria-label={wide ? `${entry.name}. Hover or focus to run the filter.` : undefined}
      data-cursor={wide ? "OPEN" : undefined}
      style={{ "--fit": longest } as CSSProperties}
    >
      <div className={s.stub} aria-hidden="true">
        <span className={s.stubNo}>{number}</span>
        <span className={s.stubText}>Race log · {number} / {pad(total, 2)}</span>
      </div>

      <div className={s.main}>
        <div className={`label ${s.ticketTop}`}>
          <span>{entry.kind}</span>
          <span>TKT-{pad(index + 1, 4)}</span>
        </div>

        <div className={wide ? s.wideBody : undefined}>
          <div className={s.textCol}>
            <h3 className={`display ${s.ticketName}`}>
              <TextScramble text={entry.name} hoverRoot="[data-ticket]" />
            </h3>
            <p className={s.result}>
              {belt || wide ? entry.result : <>Result: {entry.result}.</>}
            </p>
            {entry.detail && <p className={s.detail}>{entry.detail}</p>}
          </div>

          {wide && (
            <div className={s.vizWrap}>
              <KalmanViz running={expanded} />
              <div className={`label ${s.vizLegend}`} aria-hidden="true">
                <span>
                  <i className={s.lgDot} /> Camera fix
                </span>
                <span>
                  <i className={s.lgEst} /> EKF estimate
                </span>
                <span>
                  <i className={s.lgTruth} /> Truth
                </span>
              </div>
              <div className={s.flap} aria-hidden="true">
                <span className="label">Hover to run the filter</span>
                <span className={s.flapArrow}>↗</span>
              </div>
            </div>
          )}
        </div>

        {belt && <Belt />}

        <div className={`label ${s.ticketFoot}`} aria-hidden="true">
          <span>Lap {number}</span>
          <span className={s.footRule} />
          <span>{belt ? "Dojo" : "Pit wall"}</span>
        </div>
      </div>
    </article>
  );
}
