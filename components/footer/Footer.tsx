"use client";

import { useEffect, useRef } from "react";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import FooterWordmark from "./FooterWordmark";
import TrophyCabinet from "./TrophyCabinet";
import { istParts } from "@/components/nav/LiveClock";
import { scrollToTarget } from "@/lib/store";
import s from "./footer.module.css";

const HOLD_MS = 3200;
const SECRET = "raj";

/** Ink footer: Hyderabad time on drums, back-to-top that spins them to TOP, and the "raj" easter egg. */
export default function Footer() {
  const drums = useRef<DrumsHandle>(null);
  const override = useRef<number>(0);

  useEffect(() => {
    const timeText = () => {
      const { hh, mm } = istParts();
      return `${hh}:${mm}`;
    };
    drums.current?.set(timeText());

    const tick = () => {
      if (override.current) return;
      const t = timeText();
      if (drums.current && drums.current.text !== t) void drums.current.roll(t, { stagger: 70 });
    };
    const interval = window.setInterval(tick, 1000);

    // Type r-a-j anywhere.
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) {
        buffer = "";
        show("RAJ", 2);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", onKey);
      clearTimeout(override.current);
    };
  }, []);

  function show(word: string, turns: number) {
    clearTimeout(override.current);
    void drums.current?.roll(word, { extraTurns: turns, order: "center", stagger: 90 });
    override.current = window.setTimeout(() => {
      override.current = 0;
      const { hh, mm } = istParts();
      void drums.current?.roll(`${hh}:${mm}`, { stagger: 70, order: "rtl" });
    }, HOLD_MS);
  }

  const backToTop = () => {
    show("TOP", 1);
    window.setTimeout(() => scrollToTarget(0), 420);
  };

  return (
    <footer id="footer" className={s.footer} data-theme="ink">
      <TrophyCabinet />
      <div className={s.top}>
        <div className={s.time}>
          <span className={`label ${s.key}`}>Hyderabad · IST</span>
          <OdometerDrums ref={drums} count={5} initial="00:00" sound className={s.drums} />
        </div>

        <div className={`label ${s.meta}`}>
          <span>© 2026</span>
          <span>Built by Raj</span>
        </div>

        <button type="button" className={`label ${s.toTop}`} onClick={backToTop} data-cursor="TOP">
          Back to top <span aria-hidden="true">↑</span>
        </button>
      </div>

      <FooterWordmark />
    </footer>
  );
}
