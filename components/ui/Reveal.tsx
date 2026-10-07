"use client";

import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { useGsap } from "@/lib/hooks";

type Props = {
  as?: ElementType;
  type?: "lines" | "words" | "chars";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  delay?: number;
  stagger?: number;
  start?: string;
  id?: string;
};

/** Mask reveal: lines, words or chars slide up out of their own overflow. Nothing just fades. */
export default function Reveal({
  as: Tag = "div",
  type = "lines",
  className,
  style,
  children,
  delay = 0,
  stagger,
  start = "top 86%",
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGsap(ref, (reduced) => {
    const el = ref.current;
    if (!el || reduced) return;
    const split = SplitText.create(el, {
      type,
      mask: type,
      autoSplit: true,
      onSplit(self) {
        const targets = type === "lines" ? self.lines : type === "words" ? self.words : self.chars;
        return gsap.from(targets, {
          yPercent: 118,
          duration: 1.15,
          ease: "expo.out",
          stagger: stagger ?? (type === "chars" ? 0.022 : type === "words" ? 0.04 : 0.09),
          delay,
          scrollTrigger: { trigger: el, start, once: true },
        });
      },
    });
    return () => split.revert();
  });

  return (
    <Tag ref={ref} className={className} style={style} id={id}>
      {children}
    </Tag>
  );
}
