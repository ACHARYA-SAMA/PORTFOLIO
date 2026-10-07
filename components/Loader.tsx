"use client";

import { useEffect, useRef, useState } from "react";
import OdometerDrums, { type DrumsHandle } from "./OdometerDrums";
import { CHARSET } from "@/lib/drums";
import { gsap } from "@/lib/gsap";
import { loaderDone } from "@/lib/store";

const COUNT_CHARSET = " 0123456789";
// 000 → 100, easing into the top like a real progress count. Times in ms from mount.
// Budget: count ends 1.12s, word lands ~1.7s, split done ~2.3s (brief: under 2.4s).
const STEPS: Array<[number, number]> = [
  [200, 4], [280, 12], [360, 21], [440, 31], [520, 42], [600, 54], [680, 65],
  [760, 75], [840, 84], [920, 91], [1000, 96], [1060, 99], [1120, 100],
];
const WORD_AT = 1190;
const SPLIT_AT = 1760;
const SPLIT_S = 0.54;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const countText = (n: number) => ` ${String(n).padStart(3, "0")} `;

export default function Loader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const drums = useRef<DrumsHandle>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("is-loading")) {
      setGone(true);
      loaderDone.set(true);
      return;
    }

    let cancelled = false;
    const start = performance.now();
    const at = (ms: number) => sleep(Math.max(0, ms - (performance.now() - start)));

    (async () => {
      const d = drums.current;
      if (!d) return;

      // Scramble first, then count on a digits-only wheel so 9 → 0 is one step.
      d.scramble();
      await d.roll("     ", { duration: 0.18, stagger: 14, order: "random" });
      if (cancelled) return;
      d.setCharset(COUNT_CHARSET);
      for (const [ms, n] of STEPS) {
        await at(ms);
        if (cancelled) return;
        void d.roll(countText(n), { duration: 0.16, stagger: 0 });
        if (pctRef.current) pctRef.current.textContent = `${String(n).padStart(3, "0")}%`;
      }

      await at(WORD_AT);
      if (cancelled) return;
      d.setCharset(CHARSET);
      void d.roll("ARMAN", {
        stagger: 35,
        order: "center",
        duration: (dist) => Math.min(0.36 + 0.008 * dist, 0.5),
      });

      // Split as the last drum lands; the settle reads fine while the halves part.
      await at(SPLIT_AT);
      if (cancelled) return;

      // Split: clone the landed row into both halves so the cut runs through the drums.
      const live = liveRef.current;
      const row = live?.firstElementChild;
      if (row && topRef.current && bottomRef.current) {
        topRef.current.appendChild(row.cloneNode(true));
        bottomRef.current.appendChild(row.cloneNode(true));
        live.style.visibility = "hidden";
      }

      const halves = rootRef.current?.querySelectorAll(".loader__half");
      if (!halves) return;
      const tl = gsap.timeline({
        onComplete: () => {
          try {
            sessionStorage.setItem("aa-loaded", "1");
          } catch {
            /* storage blocked */
          }
          setGone(true);
        },
      });
      tl.to(halves[0], { yPercent: -100, duration: SPLIT_S, ease: "expo.inOut" }, 0)
        .to(halves[1], { yPercent: 100, duration: SPLIT_S, ease: "expo.inOut" }, 0)
        .call(() => loaderDone.set(true), [], SPLIT_S * 0.35);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className="loader" aria-hidden="true">
      <div className="loader__half loader__half--top">
        <div ref={topRef} className="loader__inner" />
      </div>
      <div className="loader__half loader__half--bottom">
        <div ref={bottomRef} className="loader__inner" />
      </div>
      <div ref={liveRef} className="loader__live">
        <div className="loader__row">
          <OdometerDrums ref={drums} count={5} initial="     " className="loader__drums" />
          <div className="loader__meta label">
            <span>Arman Acharya</span>
            <span ref={pctRef}>000%</span>
            <span>Hyderabad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
