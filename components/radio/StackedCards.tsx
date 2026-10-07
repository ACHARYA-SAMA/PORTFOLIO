"use client";

import { Children, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useGsap } from "@/lib/hooks";
import s from "./radio.module.css";

/**
 * Sticky cards: each one pins near the top and, as the next slides over it,
 * scales back and dims. Reduced motion gets a plain stack.
 */
export default function StackedCards({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  useGsap(rootRef, (reduced) => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]", root);
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const depth = cards.length - 1 - i;
      gsap.to(card.firstElementChild, {
        scale: 1 - 0.05 * depth,
        yPercent: -2 * depth,
        ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: "top 18%", scrub: true },
      });
      gsap.to(card.querySelector("[data-stack-shade]"), {
        opacity: 0.45,
        ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: "top 18%", scrub: true },
      });
    });
  });

  return (
    <div ref={rootRef} className={s.stack}>
      {items.map((child, i) => (
        <div key={i} className={s.stackCard} data-stack-card="" style={{ top: `calc(14vh + ${i * 18}px)` }}>
          <div className={s.stackInner}>
            {child}
            <span className={s.stackShade} data-stack-shade="" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}
