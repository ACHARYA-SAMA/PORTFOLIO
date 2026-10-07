"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lenisStore, loaderDone, scrollToTarget } from "@/lib/store";
import { markGesture, restoreSoundPreference } from "@/lib/sound";

/**
 * Lenis driven by GSAP's ticker so ScrollTrigger and smooth scroll share one
 * clock. No scrollerProxy: Lenis scrolls the real window, which is what every
 * ScrollTrigger listens to. (The old proxy on <body> is why the globe never
 * flew in.)
 */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    restoreSoundPreference();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      if (!loaderDone.get() && document.documentElement.classList.contains("is-loading")) lenis.stop();
      lenisStore.set(lenis);
    }

    // Refresh every trigger once real fonts have replaced fallbacks. Pins carry a
    // refreshPriority (top of page first) so later triggers see their spacing.
    let cancelled = false;
    const refresh = () => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };

    const offLoader = loaderDone.subscribe(() => {
      if (!loaderDone.get()) return;
      document.documentElement.classList.remove("is-loading");
      lenis?.start();
      refresh();
    });

    document.fonts?.ready.then(() => {
      if (!cancelled) refresh();
    });
    const onLoad = () => refresh();
    window.addEventListener("load", onLoad);

    // In-page anchors go through Lenis.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (!link) return;
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = hash === "#top" ? 0 : document.querySelector<HTMLElement>(hash);
      if (target === null) return;
      e.preventDefault();
      scrollToTarget(target);
      history.replaceState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    const onGesture = () => markGesture();
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });

    return () => {
      cancelled = true;
      offLoader();
      window.removeEventListener("load", onLoad);
      document.removeEventListener("click", onClick);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenisStore.set(null);
    };
  }, []);

  return <>{children}</>;
}
