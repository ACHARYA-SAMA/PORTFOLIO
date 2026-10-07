"use client";

import { useRef, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import s from "./hero.module.css";

/** Glossy black pull knob. Squashes on press, springs back on release. */
export default function Knob({ onPull }: { onPull: () => void }) {
  const sphere = useRef<HTMLSpanElement>(null);

  const press = () => {
    if (prefersReducedMotion()) return;
    gsap.to(sphere.current, { scaleX: 1.14, scaleY: 0.76, y: 3, duration: 0.12, ease: "power2.out", overwrite: true });
  };

  const release = () => {
    if (prefersReducedMotion()) return;
    gsap.to(sphere.current, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      duration: 0.8,
      ease: "elastic.out(1.15, 0.32)",
      overwrite: true,
    });
  };

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Keyboard activation has no pointer events, so play the squash here.
    if (e.detail === 0) {
      press();
      window.setTimeout(release, 110);
    }
    onPull();
  };

  return (
    <div className={s.knobWrap}>
      <button
        type="button"
        className={s.knob}
        aria-label="Pull the knob: spin every drum to a random scene"
        data-cursor="PULL"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onClick={onClick}
      >
        <span className={s.knobWell} />
        <span className={s.knobShadow} data-shadow="" />
        <span ref={sphere} className={s.knobSphere}>
          <span className={s.knobSpec} />
        </span>
      </button>
      <span className={`label ${s.knobLabel}`} aria-hidden="true">
        Pull
      </span>
    </div>
  );
}
