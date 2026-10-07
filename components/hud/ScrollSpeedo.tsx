"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { lenisStore } from "@/lib/store";
import s from "./hud.module.css";

const SWEEP = 240;
const MAX = 60;

/** Small dial in the corner. The needle follows scroll velocity. */
export default function ScrollSpeedo() {
  const needle = useRef<SVGGElement>(null);
  const read = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let v = 0;
    let shown = -1;
    const tick = () => {
      const target = Math.min(MAX, Math.abs(lenisStore.get()?.velocity ?? 0));
      v += (target - v) * 0.12;
      if (needle.current) needle.current.style.transform = `rotate(${(-SWEEP / 2 + (v / MAX) * SWEEP).toFixed(2)}deg)`;
      const val = Math.round(v * 10);
      if (val !== shown && read.current) {
        shown = val;
        read.current.textContent = String(val).padStart(3, "0");
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className={s.speedo}>
      <svg viewBox="-50 -50 100 100" className={s.dial}>
        <path d="M-35.4 35.4A50 50 0 1 1 35.4 35.4" className={s.dialArc} transform="scale(0.86)" />
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1="0" y1="-43" x2="0" y2={i % 3 === 0 ? -35 : -39} transform={`rotate(${-SWEEP / 2 + (i * SWEEP) / 12})`} className={s.dialTick} />
        ))}
        <g ref={needle} className={s.needle}>
          <line x1="0" y1="6" x2="0" y2="-38" />
        </g>
        <circle r="4" className={s.hub} />
      </svg>
      <div className={s.speedoRead}>
        <span ref={read} className="label">
          000
        </span>
        <span className={`label ${s.unit}`}>Scroll</span>
      </div>
    </div>
  );
}
