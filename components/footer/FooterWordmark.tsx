"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/hooks";
import s from "./footer.module.css";

const WORD = "ARMAN ACHARYA";

/**
 * Fills the width. Letters near the cursor lose weight and lean, each in a
 * fixed-width cell so the line never reflows.
 */
export default function FooterWordmark() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    if (!root || !line) return;
    const letters = Array.from(line.querySelectorAll<HTMLSpanElement>("[data-l]"));
    const glyphs = letters.map((l) => l.firstElementChild as HTMLSpanElement);
    // Letter centres relative to the line, cached so the frame loop reads layout once.
    let centers: number[] = [];
    let midY = 0;

    const fit = () => {
      letters.forEach((l) => (l.style.width = ""));
      line.style.fontSize = "100px";
      const ratio = root.clientWidth / line.scrollWidth;
      line.style.fontSize = `${(100 * ratio).toFixed(2)}px`;
      letters.forEach((l) => (l.style.width = `${l.getBoundingClientRect().width.toFixed(2)}px`));
      centers = letters.map((l) => l.offsetLeft + l.offsetWidth / 2);
      midY = line.offsetHeight / 2;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(root);

    if (prefersReducedMotion() || !hasFinePointer()) return () => ro.disconnect();

    const influence = letters.map(() => 0);
    let px = -9999;
    let py = -9999;
    let active = false;

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      active = true;
    };
    const onLeave = () => {
      px = -9999;
      py = -9999;
    };

    const tick = () => {
      if (!active) return;
      const radius = Math.max(220, window.innerWidth * 0.22);
      const box = line.getBoundingClientRect();
      let settled = true;
      letters.forEach((_, i) => {
        const d = Math.hypot(px - (box.left + centers[i]), (py - (box.top + midY)) * 0.6);
        const target = Math.max(0, 1 - d / radius);
        influence[i] += (target - influence[i]) * 0.14;
        if (Math.abs(target - influence[i]) > 0.002) settled = false;
        const k = influence[i];
        glyphs[i].style.fontVariationSettings = `"wght" ${Math.round(900 - 680 * k)}, "wdth" ${Math.round(78 - 10 * k)}`;
        glyphs[i].style.transform = `skewX(${(-14 * k).toFixed(2)}deg)`;
      });
      if (settled && px < -9000) active = false;
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);
    return () => {
      ro.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={rootRef} className={s.wordmark} aria-hidden="true">
      <div ref={lineRef} className={s.wordLine}>
        {WORD.split("").map((ch, i) => (
          <span key={i} className={s.letter} data-l="">
            <span className={s.glyph}>{ch === " " ? " " : ch}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
