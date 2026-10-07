"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/gsap";

export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        el.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      },
    });
    return () => st.kill();
  }, []);

  return <div ref={bar} className="scroll-progress" aria-hidden="true" />;
}
