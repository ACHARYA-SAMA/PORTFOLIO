"use client";

import { useEffect, useRef } from "react";
import { FACE_OFFSETS, charAt, faceTransform } from "@/lib/drums";

/**
 * The site's drums (same markup and CSS, same projection from lib/drums),
 * but able to roll both ways: a speedometer goes down as well as up.
 * Reads its value from a getter on its own rAF, so React never re-renders.
 */

type Props = { count: number; read: () => string; charset?: string; className?: string; bare?: boolean };

export default function HudDrums({ count, read, charset = " 0123456789", className = "", bare = false }: Props) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-drum]"));
    const faces = cells.map((c) => Array.from(c.querySelectorAll<HTMLElement>("[data-face]")));
    const n = charset.length;
    const pos = new Array(count).fill(0);
    const base = new Array(count).fill(NaN);
    const frac = new Array(count).fill(NaN);
    let raf = 0;
    const tick = () => {
      const text = read().padStart(count, " ").slice(-count);
      for (let i = 0; i < count; i++) {
        const target = Math.max(0, charset.indexOf(text[i]));
        // Shortest way round the wheel.
        let d = target - (((pos[i] % n) + n) % n);
        if (d > n / 2) d -= n;
        if (d < -n / 2) d += n;
        if (Math.abs(d) < 0.002) pos[i] += d;
        else pos[i] += d * 0.22;
        const p = pos[i];
        const whole = Math.floor(p);
        const f = p - whole;
        if (whole !== base[i]) {
          base[i] = whole;
          for (let k = 0; k < FACE_OFFSETS.length; k++) faces[i][k].textContent = charAt(charset, whole + FACE_OFFSETS[k]);
        }
        if (f !== frac[i]) {
          frac[i] = f;
          for (let k = 0; k < FACE_OFFSETS.length; k++) {
            const t = faceTransform(FACE_OFFSETS[k], f);
            const st = faces[i][k].style;
            if (t === null) st.opacity = "0";
            else {
              st.opacity = "1";
              st.transform = t;
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, read, charset]);

  return (
    <span ref={root} className={`drums${bare ? " drums--bare" : ""} ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="drum" data-drum="">
          {FACE_OFFSETS.map((o, k) => {
            const t = faceTransform(o);
            return (
              <span key={k} className="drum__face" data-face="" style={t ? { transform: t } : { opacity: 0 }}>
                {charAt(charset, o)}
              </span>
            );
          })}
          {!bare && <span className="drum__shade" />}
        </span>
      ))}
    </span>
  );
}
