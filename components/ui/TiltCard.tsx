"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/hooks";

type Props = {
  children: ReactNode;
  /** Max tilt in degrees around each axis. */
  max?: number;
  className?: string;
  innerClassName?: string;
  sheenClassName?: string;
};

/** 3D tilt that follows the pointer, plus a light sheen that slides across. */
export default function TiltCard({ children, max = 9, className, innerClassName, sheenClassName }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const sheen = sheenRef.current;
    if (!wrap || !inner || !sheen || prefersReducedMotion() || !hasFinePointer()) return;

    const rx = gsap.quickTo(inner, "rotationX", { duration: 0.7, ease: "power3.out" });
    const ry = gsap.quickTo(inner, "rotationY", { duration: 0.7, ease: "power3.out" });
    const sx = gsap.quickTo(sheen, "xPercent", { duration: 0.6, ease: "power3.out" });
    const so = gsap.quickTo(sheen, "opacity", { duration: 0.4, ease: "power2.out" });

    const onMove = (e: PointerEvent) => {
      const b = inner.getBoundingClientRect();
      const nx = (e.clientX - b.left) / b.width - 0.5;
      const ny = (e.clientY - b.top) / b.height - 0.5;
      rx(-ny * max * 1.6);
      ry(nx * max * 2);
      sx(nx * 120);
      so(0.9);
    };
    const onLeave = () => {
      rx(0);
      ry(0);
      so(0);
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [max]);

  return (
    <div ref={wrapRef} className={className} style={{ perspective: 1100 }}>
      <div ref={innerRef} className={innerClassName} style={{ transformStyle: "preserve-3d", position: "relative", overflow: "hidden" }}>
        {children}
        <span ref={sheenRef} className={sheenClassName} aria-hidden="true" />
      </div>
    </div>
  );
}
