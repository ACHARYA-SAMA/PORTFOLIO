"use client";

import { useEffect, useRef } from "react";
import s from "./entry.module.css";

/**
 * VISIT PORTFOLIO →, styled as the site's Let's-talk pill: ink, mono,
 * pulsing signal dot, cream and a little larger on hover, magnetic.
 * Plain rAF magnetism here so the entry bundle stays tiny.
 */
export default function VisitPortfolio({ onGo, prominent = false }: { onGo: () => void; prominent?: boolean }) {
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(pointer: fine)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      tx = (e.clientX - (b.left + b.width / 2)) * 0.3;
      ty = (e.clientY - (b.top + b.height / 2)) * 0.3;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <span ref={wrap} className={s.magnet}>
      <a
        href="/portfolio"
        className={`label ${s.pill} ${prominent ? s.pillBig : ""}`}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onGo();
        }}
        aria-keyshortcuts="P"
      >
        <span className={s.live} aria-hidden="true" />
        <span>Visit portfolio</span>
        <span aria-hidden="true">→</span>
      </a>
    </span>
  );
}
