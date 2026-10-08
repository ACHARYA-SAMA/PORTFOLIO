"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PORTFOLIO } from "@/lib/routes";
import s from "./notfound.module.css";

/** Side view of the world's red buggy: rounded chassis, roll cage, fat tyres, the ARMAN plate. */
function Buggy() {
  return (
    <svg viewBox="0 0 220 120" className={s.buggySvg} aria-hidden="true">
      <path d="M48 34h70l18 22H40z" fill="none" stroke="#1b1b1b" strokeWidth="6" strokeLinejoin="round" />
      <path d="M78 34v22" stroke="#1b1b1b" strokeWidth="5" />
      <rect x="18" y="52" width="184" height="36" rx="14" fill="#e3170a" />
      <rect x="18" y="52" width="184" height="10" rx="5" fill="#ff2a17" />
      <rect x="150" y="60" width="44" height="16" rx="3" fill="#0d0d0d" />
      <text x="172" y="72" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fontWeight="700" fill="#fff6ee" letterSpacing="1">
        ARMAN
      </text>
      <rect x="196" y="58" width="8" height="10" rx="2" fill="#fff6ee" />
      <rect x="14" y="60" width="6" height="10" rx="2" fill="#b80f05" />
      <g className={s.wheel}>
        <circle cx="56" cy="90" r="24" fill="#0d0d0d" />
        <circle cx="56" cy="90" r="10" fill="#3a3a3a" />
        <path d="M56 70v40M36 90h40" stroke="#222" strokeWidth="4" />
      </g>
      <g className={s.wheel}>
        <circle cx="166" cy="90" r="24" fill="#0d0d0d" />
        <circle cx="166" cy="90" r="10" fill="#3a3a3a" />
        <path d="M166 70v40M146 90h40" stroke="#222" strokeWidth="4" />
      </g>
    </svg>
  );
}

/** 404 as a tiny scene: three drums, one buggy, no survivors (until they drop back in). */
export default function NotFoundScene() {
  const [run, setRun] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Time each drum's knock to the moment the buggy's front bumper reaches it (linear drive).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const buggy = stage?.querySelector<HTMLElement>("[data-buggy]");
    if (!stage || !buggy) return;
    const style = getComputedStyle(buggy);
    const duration = parseFloat(style.animationDuration);
    const delay = parseFloat(style.animationDelay);
    const left = stage.getBoundingClientRect().left;
    const distance = stage.clientWidth + buggy.offsetWidth;
    stage.querySelectorAll<HTMLElement>("[data-drum]").forEach((drum) => {
      const x = drum.getBoundingClientRect().left - left;
      drum.style.animationDelay = `${(delay + (duration * x) / distance).toFixed(3)}s`;
    });
  }, [run]);

  return (
    <section className={s.scene} data-theme="red" aria-labelledby="nf-title">
      <h1 id="nf-title" className="sr-only">
        404: page not found
      </h1>

      <div key={run} ref={stageRef} className={s.stage} aria-hidden="true">
        <div className={s.drums}>
          {["4", "0", "4"].map((d, i) => (
            <span key={i} className={s.drum} data-drum="" style={{ "--i": i } as React.CSSProperties}>
              <span className={`display ${s.digit}`}>{d}</span>
            </span>
          ))}
        </div>
        <div className={s.buggy} data-buggy="">
          <Buggy />
        </div>
        <div className={s.dust} />
      </div>

      <p className={`label ${s.code}`}>Error 404 · road not found</p>
      <p className={s.line}>Wrong turn. This road doesn’t exist.</p>

      <div className={s.actions}>
        <a href="/?world=1" className={`label ${s.pill}`}>
          <span className={s.dot} aria-hidden="true" />
          Back to world
        </a>
        <a href={PORTFOLIO} className={`label ${s.pill} ${s.pillAlt}`}>
          Visit portfolio →
        </a>
        <button type="button" className={`label ${s.again}`} onClick={() => setRun((r) => r + 1)}>
          Again
        </button>
      </div>
    </section>
  );
}
