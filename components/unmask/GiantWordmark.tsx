"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import s from "./unmask.module.css";

export type WordmarkHandle = {
  /** Spotlight in stage px: letters inside it turn solid. */
  spot: (x: number, y: number, r: number) => void;
  readonly root: HTMLDivElement | null;
};

const LINES = ["ARMAN", "ACHARYA"];

function Lines({ solid }: { solid?: boolean }) {
  return (
    <>
      {LINES.map((line, i) => (
        <span key={line} className={`${s.wmLine} ${i === 0 ? s.wmTop : s.wmBottom}`} data-line={i}>
          {line.split("").map((ch, j) => (
            <span key={j} className={s.wmCharMask}>
              <span className={s.wmChar} data-char={solid ? undefined : ""}>
                {ch}
              </span>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

/**
 * ARMAN over ACHARYA, ~90% of the viewport wide. An outline copy sits under
 * a solid copy; the solid one is masked to the spotlight, so letters fill in
 * wherever the reveal passes.
 * TODO: add cutout (/public/images/arman-cutout.png) and move the wordmark
 * behind the subject for depth layering. Until then it sits in front with
 * mix-blend-mode: difference.
 */
export default function GiantWordmark({ subline, aka, ref }: { subline: string; aka: string; ref?: Ref<WordmarkHandle> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const solidRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    spot(x, y, r) {
      const el = solidRef.current;
      if (!el) return;
      const grad =
        r < 0.5
          ? "radial-gradient(circle 0px at 50% 50%, #000 0%, transparent 0%)"
          : `radial-gradient(circle ${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 0%, #000 58%, transparent 74%)`;
      el.style.webkitMaskImage = grad;
      el.style.maskImage = grad;
    },
    get root() {
      return rootRef.current;
    },
  }));

  return (
    <div ref={rootRef} className={s.wordmark} aria-hidden="true">
      <div className={`display ${s.wmLayer} ${s.wmOutline}`}>
        <Lines />
      </div>
      <div ref={solidRef} className={`display ${s.wmLayer} ${s.wmSolid}`}>
        <Lines solid />
      </div>
      <div className={s.subline} data-subline="">
        <span className="label">{subline}</span>
        <span className={s.aka}>{aka}</span>
      </div>
    </div>
  );
}
