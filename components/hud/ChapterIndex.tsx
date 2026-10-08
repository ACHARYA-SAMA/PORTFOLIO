"use client";

import { useEffect, useState } from "react";
import { CHAPTERS, chapterNo } from "@/lib/content";
import { ScrollTrigger } from "@/lib/gsap";
import { scrollToTarget } from "@/lib/store";
import TransitionLink from "@/components/TransitionLink";
import { PORTFOLIO } from "@/lib/routes";
import s from "./hud.module.css";

/** Fixed mono index, 01 UNMASK to 12 FOOTER. Collapsed to the current chapter; opens on hover or focus. */
export default function ChapterIndex() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const triggers = CHAPTERS.map((c, i) => {
      const el = document.getElementById(c.id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => self.isActive && setCurrent(i),
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  const now = CHAPTERS[current];

  return (
    <nav className={s.chapters} aria-label="Chapters">
      <ol className={s.chapterList}>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              className={`label ${s.chapter}`}
              aria-current={i === current ? "step" : undefined}
              onClick={() => scrollToTarget(c.id === "unmask" ? 0 : `#${c.id}`)}
            >
              <span>{chapterNo(c.id)}</span>
              {c.label}
            </button>
          </li>
        ))}
        {/* Pages beyond the scroll: the CV, and the world this site sits inside. */}
        <li className={s.chapterSep} aria-hidden="true" />
        <li>
          <TransitionLink href={`${PORTFOLIO}/cv`} label="CV" className={`label ${s.chapter}`}>
            <span>CV</span>
            Printable CV
          </TransitionLink>
        </li>
        <li>
          <a href="/?world=1" className={`label ${s.chapter}`}>
            <span>↗</span>
            Back to world
          </a>
        </li>
      </ol>
      <span className={`label ${s.chapterNow}`} aria-hidden="true">
        <b>{chapterNo(now.id)}</b> / {String(CHAPTERS.length).padStart(2, "0")} · {now.label}
      </span>
    </nav>
  );
}
