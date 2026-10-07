"use client";

import { useEffect, useRef } from "react";
import StatDial, { type StatDialHandle } from "./StatDial";
import { STATS } from "@/lib/content";
import { ScrollTrigger } from "@/lib/gsap";
import s from "./stats.module.css";

export default function StatDials() {
  const listRef = useRef<HTMLUListElement>(null);
  const dials = useRef<Array<StatDialHandle | null>>([]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const st = ScrollTrigger.create({
      trigger: list,
      start: "top 82%",
      once: true,
      onEnter: () => dials.current.forEach((d, i) => d?.run(i * 180)),
    });
    return () => st.kill();
  }, []);

  return (
    <div id="stats" className={s.stats}>
      <ul ref={listRef} className={s.list} aria-label="Numbers">
        {STATS.map((stat, i) => (
          <StatDial
            key={stat.label}
            ref={(h) => {
              dials.current[i] = h;
            }}
            index={i}
            {...stat}
          />
        ))}
      </ul>
    </div>
  );
}
