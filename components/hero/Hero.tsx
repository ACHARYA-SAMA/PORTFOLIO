"use client";

import { useEffect, useRef, useState } from "react";
import type { DrumsHandle } from "@/components/OdometerDrums";
import type { PlateHandle } from "./Plate";
import Machine from "./Machine";
import HeroRail from "./HeroRail";
import { SCENES, parseCaption } from "@/lib/content";
import type { RollOptions, RollOrder } from "@/lib/drums";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { hasFinePointer, observeVisibility, prefersReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/format";
import { on } from "@/lib/events";
import { playThunk } from "@/lib/sound";
import s from "./hero.module.css";

const CYCLE_MS = 3800;
const WHEEL_THROTTLE_MS = 650;
const ORDERS: RollOrder[] = ["ltr", "rtl", "center"];
const SCENE_COUNT = SCENES.length;

type Phase = "scene" | "SCROLL" | "DOWN";

const wrap = (n: number) => ((n % SCENE_COUNT) + SCENE_COUNT) % SCENE_COUNT;

function sceneText(index: number) {
  const drums = SCENES[index].drums;
  if (drums !== "DATE") return drums;
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function captionHtml(index: number) {
  return parseCaption(SCENES[index].caption)
    .map(
      (w, i) =>
        `${i > 0 && !w.glue ? " " : ""}<span class="${s.cw}"><span class="${s.cwi}${w.em ? ` ${s.em}` : ""}">${escapeHtml(w.text)}</span></span>`,
    )
    .join("");
}

const INITIAL_CAPTION = captionHtml(0);

type Controller = {
  next: () => void;
  pull: () => void;
  jump: (index: number) => void;
  togglePause: () => void;
  setCounterFocus: (focused: boolean) => void;
};

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const slatsRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const drums = useRef<DrumsHandle>(null);
  const plate = useRef<PlateHandle>(null);
  const ctl = useRef<Controller | null>(null);

  const [scene, setScene] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const counter = counterRef.current;
    const caption = captionRef.current;
    if (!section || !counter || !caption) return;

    const reduced = prefersReducedMotion();
    const v = {
      scene: 0,
      order: 0,
      started: false,
      inView: true,
      docHidden: document.hidden,
      userPaused: false,
      focused: false,
      phase: "scene" as Phase,
      timer: 0,
      startedAt: 0,
      remaining: CYCLE_MS,
      lastWheel: 0,
      captionTl: null as gsap.core.Timeline | null,
    };

    /* ── auto-cycle timer, with pause/resume that keeps the rail in sync ── */
    const canRun = () => v.started && v.inView && !v.docHidden && !v.userPaused && !v.focused && v.phase === "scene";

    const stopTimer = () => {
      if (!v.timer) return;
      clearTimeout(v.timer);
      v.timer = 0;
      v.remaining = Math.max(0, v.remaining - (performance.now() - v.startedAt));
    };

    const startTimer = () => {
      if (v.timer || !canRun()) return;
      v.startedAt = performance.now();
      v.timer = window.setTimeout(() => {
        v.timer = 0;
        go(wrap(v.scene + 1));
      }, v.remaining);
    };

    const syncTimer = () => {
      if (canRun()) startTimer();
      else stopTimer();
      setRunning(canRun());
    };

    /* ── caption: words slide up out of their masks ── */
    const showCaption = (index: number, intro = false) => {
      v.captionTl?.kill();
      if (reduced) {
        caption.innerHTML = captionHtml(index);
        return;
      }
      const tl = gsap.timeline();
      if (!intro) {
        tl.to(caption.querySelectorAll(`.${s.cwi}`), {
          yPercent: -110,
          duration: 0.3,
          stagger: 0.012,
          ease: "power3.in",
        });
        tl.call(() => void (caption.innerHTML = captionHtml(index)));
      }
      tl.add(() => {
        tl.add(
          gsap.fromTo(
            caption.querySelectorAll(`.${s.cwi}`),
            { yPercent: 110 },
            { yPercent: 0, duration: 0.95, stagger: 0.034, ease: "expo.out" },
          ),
        );
      });
      v.captionTl = tl;
    };

    /* ── scene change ── */
    const go = (
      index: number,
      opts: { extra?: RollOptions["extraTurns"]; stagger?: number; order?: RollOrder } = {},
    ) => {
      v.scene = index;
      if (v.timer) {
        clearTimeout(v.timer);
        v.timer = 0;
      }
      v.remaining = CYCLE_MS;
      setScene(index);
      setCycleKey((k) => k + 1);

      if (v.phase === "scene") {
        void drums.current?.roll(sceneText(index), {
          order: opts.order ?? ORDERS[v.order++ % ORDERS.length],
          stagger: opts.stagger ?? 75,
          extraTurns: opts.extra ?? (Math.random() < 0.3 ? 1 : 0),
        });
      }
      plate.current?.show(index);
      showCaption(index);
      syncTimer();
    };

    ctl.current = {
      next: () => go(wrap(v.scene + 1), { extra: 1 }),
      pull: () => {
        let index = v.scene;
        while (index === v.scene) index = Math.floor(Math.random() * SCENE_COUNT);
        playThunk();
        go(index, { extra: () => 1 + Math.floor(Math.random() * 3), stagger: 120, order: "ltr" });
      },
      jump: (index) => go(index),
      togglePause: () => {
        v.userPaused = !v.userPaused;
        setPaused(v.userPaused);
        syncTimer();
      },
      setCounterFocus: (focused) => {
        v.focused = focused;
        syncTimer();
      },
    };

    /* ── wheel over the counter steps scenes; page scroll elsewhere is untouched ── */
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 2 && Math.abs(e.deltaX) < 2) return;
      e.preventDefault();
      const now = performance.now();
      if (now - v.lastWheel < WHEEL_THROTTLE_MS) return;
      v.lastWheel = now;
      const dir = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) > 0 ? 1 : -1;
      go(wrap(v.scene + dir));
    };
    counter.addEventListener("wheel", onWheel, { passive: false });

    const onVisibility = () => {
      v.docHidden = document.hidden;
      syncTimer();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const stopObserving = observeVisibility(section, (visible) => {
      v.inView = visible;
      syncTimer();
    });

    /* ── GSAP: tilt, light, intro, exit ── */
    const ctx = gsap.context(() => {
      if (!reduced && hasFinePointer()) {
        const machine = machineRef.current!;
        const light = lightRef.current!;
        const shadows = machine.querySelectorAll("[data-shadow]");
        const rx = gsap.quickTo(machine, "rotationX", { duration: 0.9, ease: "power3.out" });
        const ry = gsap.quickTo(machine, "rotationY", { duration: 0.9, ease: "power3.out" });
        const lx = gsap.quickTo(light, "x", { duration: 1.1, ease: "power3.out" });
        const ly = gsap.quickTo(light, "y", { duration: 1.1, ease: "power3.out" });
        const sx = gsap.quickTo(shadows, "x", { duration: 0.9, ease: "power3.out" });
        const sy = gsap.quickTo(shadows, "y", { duration: 0.9, ease: "power3.out" });

        gsap.set(light, { x: window.innerWidth / 2, y: window.innerHeight * 0.42 });

        const onMove = (e: PointerEvent) => {
          if (!v.inView) return;
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          rx(-ny * 8);
          ry(nx * 9);
          const top = section.getBoundingClientRect().top;
          lx(e.clientX);
          ly(e.clientY - top);
          sx(-nx * 16);
          sy(-ny * 10);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
      }
    }, section);

    // Exit: pin ~60vh, shrink to 0.92, drums read SCROLL then DOWN, then the panel lifts like a shutter.
    const exitCtx = gsap.context(() => {
      if (reduced) return;
      const pinST = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=60%",
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        refreshPriority: 9,
        onUpdate: (self) => {
          const p = self.progress;
          const phase: Phase = p < 0.16 ? "scene" : p < 0.56 ? "SCROLL" : "DOWN";
          if (phase === v.phase) return;
          v.phase = phase;
          if (v.started) {
            if (phase === "scene") void drums.current?.roll(sceneText(v.scene), { order: "rtl", stagger: 55 });
            else void drums.current?.roll(phase, { order: phase === "SCROLL" ? "ltr" : "center", stagger: 55 });
          }
          syncTimer();
        },
      });

      gsap.to(stageRef.current, {
        scale: 0.92,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "+=60%", scrub: 0.4 },
      });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: () => pinST.end,
            end: () => pinST.end + section.offsetHeight,
            scrub: true,
          },
        })
        .to(stageRef.current, { yPercent: 26, ease: "none" }, 0)
        .to(slatsRef.current, { opacity: 1, ease: "power1.in" }, 0)
        .to(shadeRef.current, { opacity: 0.32, ease: "power1.in" }, 0);
    }, section);

    /* ── intro: the machine wipes up over Act I and starts when it arrives ── */
    let alive = true;
    const startIntro = async () => {
      if (!alive || v.started) return;
      section.dataset.intro = "done";
      if (reduced) {
        drums.current?.set(sceneText(0));
        v.started = true;
        syncTimer();
        return;
      }
      gsap.from(section.querySelectorAll("[data-rail] > *"), {
        y: 26,
        opacity: 0,
        duration: 0.9,
        stagger: 0.09,
        delay: 0.45,
        ease: "expo.out",
      });
      plate.current?.show(0);
      showCaption(0, true);
      drums.current?.scramble();
      await drums.current?.roll(sceneText(0), { extraTurns: 2, order: "ltr", stagger: 75 });
      if (!alive) return;
      v.started = true;
      syncTimer();
    };
    const introST = ScrollTrigger.create({ trigger: section, start: "top 55%", once: true, onEnter: () => void startIntro() });

    /* ── Konami: the odometer spells RAJ, then goes back to its scene ── */
    let konamiTimer = 0;
    const offKonami = on("konami", () => {
      if (!v.started) return;
      stopTimer();
      void drums.current?.roll("RAJ", { extraTurns: 2, order: "center", stagger: 90 });
      clearTimeout(konamiTimer);
      konamiTimer = window.setTimeout(() => go(v.scene, { extra: 1 }), 3200);
    });

    return () => {
      alive = false;
      introST.kill();
      offKonami();
      clearTimeout(konamiTimer);
      stopTimer();
      v.captionTl?.kill();
      counter.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVisibility);
      stopObserving();
      ctx.revert();
      exitCtx.revert();
      ctl.current = null;
    };
  }, []);

  return (
    <section ref={sectionRef} id="machine" className={s.hero} data-theme="red" data-intro="pending" aria-labelledby="machine-title">
      <h2 id="machine-title" className="sr-only">
        The machine: a rolling counter of things Arman does
      </h2>
      <div ref={lightRef} className={s.light} aria-hidden="true" />
      <div className={s.vignette} aria-hidden="true" />

      <div className={s.stageWrap}>
        <div ref={stageRef} className={s.stage}>
          <Machine
            machineRef={machineRef}
            counterRef={counterRef}
            captionRef={captionRef}
            drumsRef={drums}
            plateRef={plate}
            initialCaption={INITIAL_CAPTION}
            sceneCount={SCENE_COUNT}
            onNext={() => ctl.current?.next()}
            onPull={() => ctl.current?.pull()}
            onCounterFocus={(f) => ctl.current?.setCounterFocus(f)}
          />
        </div>
      </div>

      <HeroRail
        scene={scene}
        cycleKey={cycleKey}
        running={running}
        paused={paused}
        cycleMs={CYCLE_MS}
        onJump={(i) => ctl.current?.jump(i)}
        onTogglePause={() => ctl.current?.togglePause()}
      />

      <div ref={slatsRef} className={s.slats} aria-hidden="true" />
      <div ref={shadeRef} className={s.shade} aria-hidden="true" />
      <div className={s.lip} aria-hidden="true" />
    </section>
  );
}
