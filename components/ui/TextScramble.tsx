"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/hooks";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+-&";

type Props = {
  text: string;
  /** CSS selector of the ancestor whose hover starts the decode. Defaults to the text itself. */
  hoverRoot?: string;
  className?: string;
};

/**
 * Headline decode on hover, using the drum character set. Each word keeps
 * its measured width while scrambling so lines never re-wrap mid-effect.
 */
export default function TextScramble({ text, hoverRoot, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const root = (hoverRoot ? el.closest(hoverRoot) : el) as HTMLElement | null;
    if (!root) return;
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-word]"));
    const originals = words.map((w) => w.textContent ?? "");
    let frame = 0;

    const run = () => {
      cancelAnimationFrame(frame);
      words.forEach((w) => (w.style.width = `${w.getBoundingClientRect().width}px`));
      const start = performance.now();
      const resolveAt: number[][] = originals.map((word, wi) =>
        word.split("").map((_, ci) => 90 + (wi * 4 + ci) * 26 + Math.random() * 140),
      );
      let lastSwap = 0;
      const step = () => {
        const t = performance.now() - start;
        const swap = t - lastSwap > 45;
        if (swap) lastSwap = t;
        let done = true;
        words.forEach((w, wi) => {
          const word = originals[wi];
          if (!swap) return;
          let out = "";
          for (let ci = 0; ci < word.length; ci++) {
            if (t >= resolveAt[wi][ci] || word[ci] === " ") out += word[ci];
            else {
              out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
              done = false;
            }
          }
          w.textContent = out;
        });
        if (!swap) done = false;
        if (!done) frame = requestAnimationFrame(step);
        else
          words.forEach((w, wi) => {
            w.textContent = originals[wi];
            w.style.width = "";
          });
      };
      frame = requestAnimationFrame(step);
    };

    root.addEventListener("pointerenter", run);
    root.addEventListener("focus", run);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointerenter", run);
      root.removeEventListener("focus", run);
      words.forEach((w, wi) => {
        w.textContent = originals[wi];
        w.style.width = "";
      });
    };
  }, [hoverRoot, text]);

  const parts = text.split(" ");
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {parts.map((word, i) => (
          <span key={i}>
            <span data-word="" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
              {word}
            </span>
            {i < parts.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}
