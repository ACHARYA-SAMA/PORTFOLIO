"use client";

import { useEffect, useState } from "react";
import ChapterIndex from "./ChapterIndex";
import SectorBar from "./SectorBar";
import ScrollSpeedo from "./ScrollSpeedo";
import { ScrollTrigger } from "@/lib/gsap";
import s from "./hud.module.css";

// Scenes that own the bottom edge with their own rails stay clear of the HUD.
const QUIET = ["#unmask", "#machine", "#race-log", "#footer"];

/** Pit-wall HUD for desktop: chapter + sector timing bottom-left, speedo bottom-right. */
export default function Hud() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const active = new Set<string>();
    const triggers = QUIET.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: "top bottom-=80",
        end: "bottom bottom-=80",
        onToggle: (self) => {
          if (self.isActive) active.add(sel);
          else active.delete(sel);
          setHidden(active.size > 0);
        },
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);

  return (
    <div className={s.hud} data-hidden={hidden} aria-hidden={hidden} inert={hidden}>
      <div className={s.left} data-theme="ink">
        <ChapterIndex />
        <SectorBar />
      </div>
      <div className={s.right} data-theme="ink">
        <ScrollSpeedo />
      </div>
    </div>
  );
}
