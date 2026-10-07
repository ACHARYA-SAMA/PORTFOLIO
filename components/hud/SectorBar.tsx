"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import s from "./hud.module.css";

const fmt = (ms: number) => {
  const m = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const milli = Math.floor(ms % 1000);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
};

/**
 * F1-style timing bar: S1 / S2 / S3 are the page's thirds. The current
 * sector fills as you scroll; finished sectors go signal green. The lap
 * time is simply how long you've been on the site.
 */
export default function SectorBar() {
  const fills = useRef<Array<HTMLSpanElement | null>>([]);
  const segs = useRef<Array<HTMLSpanElement | null>>([]);
  const lap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      if (lap.current) lap.current.textContent = fmt(performance.now() - start);
    }, 87);

    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const p = self.progress * 3;
        fills.current.forEach((f, i) => {
          const k = Math.max(0, Math.min(1, p - i));
          if (f) f.style.transform = `scaleX(${k.toFixed(3)})`;
          segs.current[i]?.toggleAttribute("data-done", k >= 1);
        });
      },
    });
    return () => {
      clearInterval(timer);
      st.kill();
    };
  }, []);

  return (
    <div className={s.sector}>
      <div className={s.sectorTop}>
        <span className="label">Lap</span>
        <span ref={lap} className={`label ${s.lap}`}>
          00:00.000
        </span>
      </div>
      <div className={s.segments}>
        {["S1", "S2", "S3"].map((name, i) => (
          <span
            key={name}
            ref={(el) => {
              segs.current[i] = el;
            }}
            className={s.seg}
          >
            <span className="label">{name}</span>
            <span className={s.segTrack}>
              <span
                ref={(el) => {
                  fills.current[i] = el;
                }}
                className={s.segFill}
              />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
