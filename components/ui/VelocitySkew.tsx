"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { lenisStore } from "@/lib/store";

/*
 * Everything registered here leans a few degrees with scroll velocity and
 * eases back. One ticker for all instances. Only wrap leaf content (titles,
 * marquee lanes): a transform on an ancestor of a pinned element breaks the pin.
 */

const items = new Map<HTMLElement, number>();
let skew = 0;
let running = false;

function tick() {
  const v = lenisStore.get()?.velocity ?? 0;
  skew += (Math.max(-1, Math.min(1, v / 40)) - skew) * 0.1;
  if (Math.abs(skew) < 0.0005) skew = 0;
  items.forEach((max, el) => {
    el.style.transform = skew === 0 ? "" : `skewY(${(skew * max).toFixed(3)}deg)`;
  });
}

function register(el: HTMLElement, max: number) {
  items.set(el, max);
  if (!running) {
    running = true;
    gsap.ticker.add(tick);
  }
  return () => {
    items.delete(el);
    el.style.transform = "";
    if (items.size === 0 && running) {
      running = false;
      gsap.ticker.remove(tick);
    }
  };
}

export default function VelocitySkew({ children, max = 3, className }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    return register(ref.current, max);
  }, [max]);
  return (
    <div ref={ref} className={className} style={{ transformOrigin: "0 50%" }}>
      {children}
    </div>
  );
}
