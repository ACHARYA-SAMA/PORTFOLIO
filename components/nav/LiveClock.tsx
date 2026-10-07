"use client";

import { useEffect, useRef } from "react";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import { DIGITS } from "@/lib/drums";

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function istParts(date = new Date()) {
  const parts = Object.fromEntries(IST.formatToParts(date).map((p) => [p.type, p.value]));
  return { hh: parts.hour ?? "00", mm: parts.minute ?? "00", ss: parts.second ?? "00" };
}

type Props = { className?: string; colonClassName?: string; tzClassName?: string; seconds?: boolean };

/** HH:MM:SS in Hyderabad, on the same drums as the hero, ticking every second. */
export default function LiveClock({ className = "", colonClassName = "", tzClassName = "", seconds = true }: Props) {
  const h = useRef<DrumsHandle>(null);
  const m = useRef<DrumsHandle>(null);
  const sec = useRef<DrumsHandle>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let timeout = 0;
    let interval = 0;
    const roll = { duration: 0.55, stagger: 60 };

    const tick = (first = false) => {
      const { hh, mm, ss } = istParts();
      if (first) {
        h.current?.set(hh);
        m.current?.set(mm);
        sec.current?.set(ss);
      } else {
        void h.current?.roll(hh, roll);
        void m.current?.roll(mm, roll);
        void sec.current?.roll(ss, roll);
      }
      if (label.current) label.current.textContent = `${hh}:${mm} IST`;
    };

    tick(true);
    timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 1000);
    }, 1000 - (Date.now() % 1000));

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <span className={className}>
      <span ref={label} className="sr-only">
        Local time in Hyderabad
      </span>
      <OdometerDrums ref={h} count={2} initial="00" charset={DIGITS} bare />
      <span className={colonClassName} aria-hidden="true">:</span>
      <OdometerDrums ref={m} count={2} initial="00" charset={DIGITS} bare />
      {seconds && (
        <>
          <span className={colonClassName} aria-hidden="true">:</span>
          <OdometerDrums ref={sec} count={2} initial="00" charset={DIGITS} bare />
        </>
      )}
      <span className={`label ${tzClassName}`} aria-hidden="true">
        IST
      </span>
    </span>
  );
}
