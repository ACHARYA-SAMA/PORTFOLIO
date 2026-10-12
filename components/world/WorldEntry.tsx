"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OdometerDrums, { type DrumsHandle } from "@/components/OdometerDrums";
import { requestShutter } from "@/components/RouteShutter";
import { CONTACT } from "@/lib/content";
import { KEYS, readFlag } from "@/lib/progress";
import { PORTFOLIO } from "@/lib/routes";
import { useUI } from "@/world/engine/store";
import VisitPortfolio from "./VisitPortfolio";
import s from "./entry.module.css";

// The world (three, physics WASM, HUD) is its own chunk, client only, loaded on `/` alone.
const WorldApp = dynamic(() => import("@/world/ui/WorldApp"), { ssr: false });

type Gate = "checking" | "go" | "fallback" | "redirect";

/** Reasons not to start the engine at all. The portfolio is always one click away. */
function capabilityProblem(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return "This browser doesn’t offer WebGL2, so the world can’t start here.";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    return "WebGL isn’t available here, so the world can’t start.";
  }
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return "Data saver is on, so the world stays parked. Nothing heavy was downloaded.";
  if ((nav.hardwareConcurrency || 4) <= 2 || (nav.deviceMemory ?? 4) < 1) return "This device is light on power, so the world stays parked.";
  return null;
}

export default function WorldEntry() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [reason, setReason] = useState("");
  const phase = useUI((st) => st.phase);
  const progress = useUI((st) => st.loadProgress);
  const lateFallback = useUI((st) => st.fallback);
  const showFallback = gate === "fallback" || phase === "fallback";
  const leaving = useRef(false);

  const go = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    // The game (if running) pulls its camera up and out; the shutter closes over it.
    window.dispatchEvent(new CustomEvent("aa:world-leave"));
    requestShutter(PORTFOLIO);
    window.setTimeout(() => (leaving.current = false), 2500);
  }, [gate, phase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("world") !== "1" && readFlag(KEYS.skipIntro)) {
      setGate("redirect");
      router.replace(PORTFOLIO);
      return;
    }
    const problem = capabilityProblem();
    if (problem) {
      setReason(problem);
      setGate("fallback");
      useUI.setState({ phase: "fallback", fallback: problem });
      return;
    }
    setGate("go");
  }, [router]);

  // Prefetch the portfolio while the world idles, so Visit Portfolio is instant.
  useEffect(() => {
    if (gate !== "go" || phase !== "title") return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const run = () => router.prefetch(PORTFOLIO);
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
    else window.setTimeout(run, 1500);
  }, [gate, phase, router]);

  // P before the game has loaded (the game handles it afterwards).
  useEffect(() => {
    if (gate === "go" && phase !== "loading") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyP") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gate, phase, go]);

  // The game asks to leave (P key, pause menu, Pit Exit).
  useEffect(() => {
    const onAsk = () => go();
    window.addEventListener("aa:visit-portfolio", onAsk);
    return () => window.removeEventListener("aa:visit-portfolio", onAsk);
  }, [go]);

  return (
    <div className={s.root}>
      <a href={PORTFOLIO} className={`label ${s.skip}`}>
        Skip to portfolio
      </a>
      <div className={s.visit}>
        <VisitPortfolio onGo={go} prominent={showFallback} />
      </div>

      {gate === "go" && phase !== "fallback" ? <WorldApp /> : null}

      {showFallback ? (
        <div className={s.fallback} role="status">
          <OdometerDrums count={5} initial="ARMAN" className={s.fallbackDrums} />
          <p className={s.fallbackLine}>{reason || lateFallback}</p>
          <p className={`label ${s.fallbackLinks}`}>
            <a href={PORTFOLIO}>Portfolio</a>
            <a href={CONTACT.github.href} rel="noopener noreferrer">
              GitHub ↗
            </a>
            <a href={CONTACT.linkedin.href} rel="noopener noreferrer">
              LinkedIn ↗
            </a>
          </p>
        </div>
      ) : null}

      {!showFallback && gate !== "redirect" ? <WorldLoader progress={progress} done={phase !== "loading"} /> : null}
    </div>
  );
}

/* ── First paint: the loader's drum counter, driven by real build progress ── */

const COUNT = " 0123456789";

function WorldLoader({ progress, done }: { progress: number; done: boolean }) {
  const drums = useRef<DrumsHandle>(null);
  const [gone, setGone] = useState(false);
  const shown = useRef(-1);

  useEffect(() => {
    drums.current?.setCharset(COUNT);
  }, []);

  useEffect(() => {
    const n = Math.min(100, Math.round(progress * 100));
    if (n === shown.current) return;
    shown.current = n;
    void drums.current?.roll(` ${String(n).padStart(3, "0")} `, { duration: 0.16, stagger: 0 });
  }, [progress]);

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 760);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  return (
    <div className={s.loader} data-done={done} aria-hidden="true">
      <div className={`${s.half} ${s.halfTop}`} />
      <div className={`${s.half} ${s.halfBottom}`} />
      <div className={s.loaderRow}>
        <OdometerDrums ref={drums} count={5} initial=" 000 " className="loader__drums" />
        <div className="loader__meta label">
          <span>Arman Acharya</span>
          <span>{String(Math.min(100, Math.round(progress * 100))).padStart(3, "0")}%</span>
          <span>Hyderabad</span>
        </div>
      </div>
    </div>
  );
}
