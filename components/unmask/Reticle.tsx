"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import s from "./unmask.module.css";

export type ReticleHandle = { update: (x: number, y: number, r: number, nx: number, ny: number) => void; hide: (hidden: boolean) => void };

const BASE = 100;

/**
 * HUD that trails the spotlight with its own lag: a fine ring with ticks,
 * a rotating dashed arc and live X / Y / R readouts. Arc-reactor blue is
 * used here and on the chest glow only.
 */
export default function Reticle({ ref }: { ref?: Ref<ReticleHandle> }) {
  const ringRef = useRef<HTMLDivElement>(null);
  const readRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);
  const rRef = useRef<HTMLSpanElement>(null);
  const lag = useRef({ x: -999, y: -999, r: 0 });

  useImperativeHandle(ref, () => ({
    update(x, y, r, nx, ny) {
      const l = lag.current;
      if (l.x < -900) {
        l.x = x;
        l.y = y;
      }
      l.x += (x - l.x) * 0.085;
      l.y += (y - l.y) * 0.085;
      l.r += (r - l.r) * 0.1;
      const scale = Math.max(0.22, (l.r * 1.08) / BASE);
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      }
      if (readRef.current) {
        const off = Math.max(28, l.r * 0.78);
        readRef.current.style.transform = `translate3d(${(l.x + off).toFixed(1)}px, ${(l.y + off).toFixed(1)}px, 0)`;
      }
      if (xRef.current) xRef.current.textContent = nx.toFixed(3);
      if (yRef.current) yRef.current.textContent = ny.toFixed(3);
      if (rRef.current) rRef.current.textContent = String(Math.round(r));
    },
    hide(hidden) {
      ringRef.current?.parentElement?.toggleAttribute("data-hidden", hidden);
    },
  }));

  return (
    <div className={s.reticle} aria-hidden="true">
      <div ref={ringRef} className={s.ring}>
        <svg viewBox="-100 -100 200 200" width={BASE * 2} height={BASE * 2}>
          <circle r="100" className={s.ringLine} />
          <circle r="92" className={s.ringDash} />
          <g className={s.ringSpin}>
            <path d="M0 -84 A84 84 0 0 1 72.7 42" className={s.ringArc} />
          </g>
          {Array.from({ length: 24 }, (_, i) => (
            <line key={i} x1="0" y1="-100" x2="0" y2={i % 6 === 0 ? -88 : -94} transform={`rotate(${i * 15})`} className={s.ringTick} />
          ))}
          <path d="M-6 0H6M0 -6V6" className={s.ringTick} />
        </svg>
      </div>
      <div ref={readRef} className={s.readout}>
        <span>
          X <b ref={xRef}>0.500</b>
        </span>
        <span>
          Y <b ref={yRef}>0.300</b>
        </span>
        <span>
          R <b ref={rRef}>0</b>
        </span>
      </div>
    </div>
  );
}
