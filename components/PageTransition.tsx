"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lenisStore, scrollToTarget, transition, useStore } from "@/lib/store";

/**
 * Shutter wipe between routes: a red panel rises with the destination's
 * name in giant Archivo, the route changes underneath, then the panel lifts.
 */
export default function PageTransition() {
  const state = useStore(transition, { label: "", phase: "idle" });
  const router = useRouter();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState("");
  const covering = useRef(false);
  const lastPath = useRef(pathname);

  // Cover, then navigate.
  useEffect(() => {
    if (state.phase !== "cover" || !state.href || covering.current) return;
    const href = state.href;
    covering.current = true;
    setLabel(state.label);
    lenisStore.get()?.stop();
    const panel = panelRef.current;
    const word = wordRef.current;
    // Own y and yPercent explicitly so no stale pixel offset survives between runs.
    gsap.set(panel, { y: 0, yPercent: 100, visibility: "visible" });
    gsap.set(word, { y: 0, yPercent: 110 });
    gsap
      .timeline({
        onComplete: () => {
          const [path, hash] = href.split("#");
          const target = path || "/";
          if (target === lastPath.current) {
            // Same route: just jump and reveal.
            if (hash) scrollToTarget(`#${hash}`);
            transition.set({ label: state.label, phase: "reveal" });
          } else {
            router.push(href);
          }
        },
      })
      .to(word, { yPercent: 0, duration: 0.7, ease: "expo.out" }, 0.2)
      .to(panel, { yPercent: 0, duration: 0.6, ease: "expo.inOut" }, 0);
  }, [state, router]);

  // Route changed underneath the shutter: reset scroll, then lift it.
  useEffect(() => {
    const changed = pathname !== lastPath.current;
    lastPath.current = pathname;
    if (!changed && state.phase !== "reveal") return;
    if (!covering.current) return;
    const hash = state.href?.split("#")[1];
    const lenis = lenisStore.get();
    lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    // The new page mounted its triggers while hidden; measure again before lifting.
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });

    const panel = panelRef.current;
    const word = wordRef.current;
    const tl = gsap.timeline({
      delay: 0.15,
      onComplete: () => {
        covering.current = false;
        gsap.set(panel, { visibility: "hidden" });
        lenis?.start();
        if (hash) window.setTimeout(() => scrollToTarget(`#${hash}`), 60);
        transition.set({ label: "", phase: "idle" });
      },
    });
    tl.to(word, { yPercent: -110, duration: 0.45, ease: "power3.in" }, 0).to(panel, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, 0.15);
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, state.phase]);

  return (
    <div ref={panelRef} className="shutter" aria-hidden="true">
      <span className="shutter__mask">
        <span ref={wordRef} className="shutter__word display">
          {label}
        </span>
      </span>
      <span className="shutter__meta label">Arman Acharya · Pit wall</span>
    </div>
  );
}
