"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import s from "./stats.module.css";

export type StatDialHandle = { run: (delay: number) => void };

type Props = { value: string; from: string; label: string; index: number; ref?: Ref<StatDialHandle> };

const R = 47;
const CIRC = 2 * Math.PI * R;

/** One odometer counter with a hairline arc that fills as it counts. */
export default function StatDial({ value, from, label, index, ref }: Props) {
  const drums = useRef<DrumsHandle>(null);
  const arc = useRef<SVGCircleElement>(null);
  const numeric = /\d/.test(value) && !/[A-Z]/.test(value);

  useImperativeHandle(ref, () => ({
    run(delay) {
      if (prefersReducedMotion()) {
        gsap.set(arc.current, { strokeDashoffset: 0 });
        drums.current?.set(value);
        return;
      }
      gsap.fromTo(
        arc.current,
        { strokeDashoffset: CIRC },
        { strokeDashoffset: 0, duration: 1.9, delay: delay / 1000, ease: "power2.inOut" },
      );
      void drums.current?.roll(value, {
        delay,
        stagger: 110,
        order: "ltr",
        extraTurns: numeric ? 1 : 0,
      });
    },
  }));

  return (
    <li className={s.dial}>
      <div className={s.face}>
        <svg className={s.arc} viewBox="0 0 100 100" aria-hidden="true">
          <circle className={s.arcTrack} cx="50" cy="50" r={R} />
          <circle
            ref={arc}
            className={s.arcFill}
            cx="50"
            cy="50"
            r={R}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
          />
        </svg>
        <span className={`label ${s.dialIndex}`} aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <OdometerDrums ref={drums} count={value.length} initial={from} sound className={s.drums} />
      </div>
      <p className={`label ${s.dialLabel}`}>
        <span className="sr-only">{value} </span>
        {label}
      </p>
    </li>
  );
}
