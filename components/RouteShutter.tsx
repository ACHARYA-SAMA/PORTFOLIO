"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import OdometerDrums from "./OdometerDrums";
import { prefersReducedMotion } from "@/lib/hooks";
import s from "./routeShutter.module.css";

/**
 * The loader's red split panel, used between the two modes. It lives in the
 * root layout so it survives the route change: it closes over the world,
 * the route changes underneath, and it opens again on the Unmask hero.
 * Trigger with requestShutter(href).
 */

const EVENT = "aa:shutter";
const CLOSE_MS = 320;
const OPEN_MS = 420;

export function requestShutter(href: string, delayMs = 0) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { href, delayMs } }));
}

type Phase = "idle" | "closing" | "closed" | "opening" | "fade";

export default function RouteShutter() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const target = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const onRequest = (e: Event) => {
      const { href, delayMs } = (e as CustomEvent<{ href: string; delayMs: number }>).detail;
      target.current = href.split("#")[0] || "/";
      if (prefersReducedMotion()) {
        // Reduced motion: a plain quick fade, then the route.
        setPhase("fade");
        later(() => router.push(href), 160);
        return;
      }
      const close = () => {
        setPhase("closing");
        later(() => {
          setPhase("closed");
          router.push(href);
        }, CLOSE_MS);
      };
      if (delayMs > 0) later(close, delayMs);
      else close();
    };
    window.addEventListener(EVENT, onRequest);
    return () => {
      window.removeEventListener(EVENT, onRequest);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [router]);

  // The new route has mounted under the panel: give it two frames, then open.
  useEffect(() => {
    if (!target.current || pathname !== target.current) return;
    target.current = null;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        setPhase((p) => (p === "fade" ? "idle" : "opening"));
        timers.current.push(window.setTimeout(() => setPhase("idle"), OPEN_MS + 40));
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  if (phase === "idle") return null;
  if (phase === "fade") return <div className={s.fade} aria-hidden="true" />;

  return (
    <div className={s.shutter} data-phase={phase} aria-hidden="true">
      <div className={`loader__half loader__half--top ${s.top}`}>
        <div className="loader__inner">
          <Row />
        </div>
      </div>
      <div className={`loader__half loader__half--bottom ${s.bottom}`}>
        <div className="loader__inner">
          <Row />
        </div>
      </div>
    </div>
  );
}

function Row() {
  return (
    <div className="loader__row">
      <OdometerDrums count={5} initial="ARMAN" className="loader__drums" />
      <div className="loader__meta label">
        <span>Arman Acharya</span>
        <span>100%</span>
        <span>Hyderabad</span>
      </div>
    </div>
  );
}
