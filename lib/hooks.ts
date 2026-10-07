"use client";

import { useEffect, useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";
import { gsap } from "./gsap";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * gsap.context scoped to an element, reverted on unmount or when deps change.
 * The callback may return a cleanup for non-GSAP listeners.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (reduced: boolean) => void | (() => void),
  deps: DependencyList = [],
) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useIsoLayoutEffect(() => {
    if (!scope.current) return;
    let cleanup: void | (() => void);
    const ctx = gsap.context(() => {
      cleanup = setupRef.current(prefersReducedMotion());
    }, scope.current);
    return () => {
      cleanup?.();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}


/**
 * IntersectionObserver can deliver several queued entries at once (a jump plus a
 * reflow). Only the newest one describes the element now.
 */
export function observeVisibility(el: Element, onChange: (visible: boolean) => void, rootMargin = "0px") {
  const io = new IntersectionObserver((entries) => onChange(entries[entries.length - 1].isIntersecting), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}
