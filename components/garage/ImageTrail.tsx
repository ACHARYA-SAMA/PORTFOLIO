"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/format";
import s from "./garage.module.css";

const POOL = 8;
const SPACING = 90;

/**
 * Moving across the Garage title leaves a short trail of project frames.
 * They are labelled placeholders until real thumbnails exist.
 * TODO: add media (swap the frame contents for project thumbnails).
 */
export default function ImageTrail({ projects }: { projects: Project[] }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const area = root?.parentElement;
    if (!root || !area || prefersReducedMotion() || !hasFinePointer()) return;
    const frames = Array.from(root.children) as HTMLElement[];
    let next = 0;
    let lastX = 0;
    let lastY = 0;
    let primed = false;

    const onMove = (e: PointerEvent) => {
      const b = area.getBoundingClientRect();
      const x = e.clientX - b.left;
      const y = e.clientY - b.top;
      if (!primed) {
        primed = true;
        lastX = x;
        lastY = y;
        return;
      }
      if (Math.hypot(x - lastX, y - lastY) < SPACING) return;
      const angle = Math.atan2(y - lastY, x - lastX);
      lastX = x;
      lastY = y;

      const frame = frames[next % frames.length];
      frame.style.zIndex = String(next);
      next++;
      gsap.killTweensOf(frame);
      gsap
        .timeline()
        .set(frame, { x, y, xPercent: -50, yPercent: -50, rotation: (angle * 180) / Math.PI / 8, scale: 0.6, autoAlpha: 1 })
        .to(frame, { scale: 1, duration: 0.45, ease: "back.out(2)" })
        .to(frame, { y: y + 70, autoAlpha: 0, scale: 0.85, duration: 0.6, ease: "power2.in" }, "+=0.35");
    };
    const onLeave = () => {
      primed = false;
    };

    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    return () => {
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(frames);
    };
  }, []);

  return (
    <div ref={rootRef} className={s.trail} aria-hidden="true">
      {Array.from({ length: POOL }, (_, i) => {
        const p = projects[i % projects.length];
        return (
          <div key={i} className={`placeholder ${s.trailFrame}`}>
            <span className={`display ${s.trailIndex}`}>{pad((i % projects.length) + 1)}</span>
            <span className="placeholder__tag">{p.title}</span>
          </div>
        );
      })}
    </div>
  );
}
