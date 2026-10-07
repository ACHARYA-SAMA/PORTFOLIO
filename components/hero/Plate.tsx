"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/format";
import s from "./hero.module.css";

export type PlateHandle = { show: (index: number) => void };

const label = (index: number, total: number) => `NO. ${pad(index + 1, 3)} / ${pad(total, 3)}`;

/** Glossy black plate with an LED readout that flips on every scene change. */
export default function Plate({ total, ref }: { total: number; ref?: Ref<PlateHandle> }) {
  const text = useRef<HTMLSpanElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useImperativeHandle(ref, () => ({
    show(index) {
      const el = text.current;
      if (!el) return;
      const next = label(index, total);
      if (el.textContent === next && !tl.current?.isActive()) return;
      tl.current?.kill();
      if (prefersReducedMotion()) {
        el.textContent = next;
        return;
      }
      tl.current = gsap
        .timeline()
        .to(el, { rotationX: -90, yPercent: -30, duration: 0.15, ease: "power2.in" })
        .call(() => void (el.textContent = next))
        .fromTo(
          el,
          { rotationX: 90, yPercent: 30 },
          { rotationX: 0, yPercent: 0, duration: 0.55, ease: "back.out(2.4)" },
        );
    },
  }));

  return (
    <div className={s.plateWrap}>
      <div className={s.plateShadow} data-shadow="" />
      <div className={s.plate} data-cursor="HELLO">
        <i className={s.rivet} />
        <span className={s.plateScreen}>
          <span ref={text} className={s.plateText}>
            {label(0, total)}
          </span>
        </span>
        <i className={s.rivet} />
      </div>
    </div>
  );
}
