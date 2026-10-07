"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { preload } from "react-dom";
import SpotlightShader, { type SpotlightHandle, type SpotState } from "./SpotlightShader";
import Reticle, { type ReticleHandle } from "./Reticle";
import GiantWordmark, { type WordmarkHandle } from "./GiantWordmark";
import StickerLayer from "./StickerLayer";
import UnmaskToggle from "./UnmaskToggle";
import { FACE, imageToStage } from "./cover";
import { UNMASK } from "@/lib/content";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { observeVisibility, prefersReducedMotion } from "@/lib/hooks";
import { on } from "@/lib/events";
import { whenLoaderDone } from "@/lib/store";
import { playSwitch, servoStop, servoUpdate } from "@/lib/sound";
import s from "./unmask.module.css";

const PORTRAIT = "/images/arman-portrait.jpg";
const ARMOUR = "/images/arman-ironman.jpg";

/* Prototype constants, kept exactly. */
const EASE = 0.13;
const RADIUS = 260;

const IDLE_AFTER_MS = 3500;
const IDLE_RADIUS = 220;
const PULSE_RADIUS = 200;
const STATIC_RADIUS = 210;

type Mode = "intro" | "pointer" | "idle" | "keys";

export default function UnmaskHero() {
  preload(PORTRAIT, { as: "image", fetchPriority: "high" });
  preload(ARMOUR, { as: "image", fetchPriority: "high" });

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const shader = useRef<SpotlightHandle>(null);
  const reticle = useRef<ReticleHandle>(null);
  const wordmark = useRef<WordmarkHandle>(null);
  const spot = useRef({ x: 0, y: 0, r: 0 });
  const api = useRef<{ toggleLock: () => void } | null>(null);
  const [locked, setLocked] = useState(false);
  const [posY, setPosY] = useState(0.15);

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 4/5)");
    const update = () => setPosY(mq.matches ? 0.1 : 0.15);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const reduced = prefersReducedMotion();

    const st = {
      mode: "intro" as Mode,
      tx: FACE.u,
      ty: FACE.v,
      cx: 0,
      cy: 0,
      tr: 0,
      cr: 0,
      rv: 0,
      spring: false,
      burst: 0,
      vx: 0,
      vy: 0,
      locked: false,
      lock: 0,
      lastInput: performance.now(),
      pointerOn: false,
      touchDown: false,
      ripple: [-1, -1, -1] as [number, number, number],
      rippleAt: 0,
      visible: true,
      story: { reveal: 0, desat: 0 },
      introDone: false,
    };

    const size = () => ({ w: stage.clientWidth, h: stage.clientHeight });
    const portraitCrop = window.matchMedia("(max-aspect-ratio: 4/5)");
    /** Face centre as a fraction of the stage, using the same cover crop as the images. */
    const face = () => {
      const { w, h } = size();
      const p = imageToStage(FACE.u, FACE.v, w, h, 0.5, portraitCrop.matches ? 0.1 : 0.15);
      return { x: p.x / w, y: p.y / h, scale: p.scale };
    };

    const f0 = face();
    st.tx = st.cx = f0.x;
    st.ty = st.cy = f0.y;

    const markInput = (mode: Mode) => {
      st.lastInput = performance.now();
      if (st.mode === "intro") introTl?.kill();
      st.mode = mode;
      st.introDone = true;
    };

    /* ── pointer ── */
    const toStage = (e: PointerEvent) => {
      const b = stage.getBoundingClientRect();
      return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height, px: e.clientX - b.left, py: e.clientY - b.top };
    };
    const onEnter = (e: PointerEvent) => {
      const p = toStage(e);
      st.ripple = [p.px, p.py, 0];
      st.rippleAt = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !st.touchDown) return;
      const p = toStage(e);
      st.tx = p.x;
      st.ty = p.y;
      st.pointerOn = true;
      markInput("pointer");
      if (!st.locked) st.tr = RADIUS;
    };
    const onLeave = () => {
      st.pointerOn = false;
      if (!st.locked) st.tr = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      st.touchDown = true;
      onEnter(e);
      onMove(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      st.touchDown = false;
      st.pointerOn = false;
      // Touch: back to the idle sweep straight away.
      st.lastInput = performance.now() - IDLE_AFTER_MS;
    };

    stage.addEventListener("pointerenter", onEnter);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    // A touch that turns into a page scroll ends with pointercancel, not pointerup.
    window.addEventListener("pointercancel", onUp);

    /* ── lock ── */
    const setLock = (value: boolean) => {
      st.locked = value;
      setLocked(value);
      playSwitch();
      st.spring = true;
      if (value) {
        const { w, h } = size();
        st.tr = Math.max(w, h) * 0.34;
      } else {
        st.tr = st.pointerOn ? RADIUS : 0;
      }
    };
    api.current = { toggleLock: () => setLock(!st.locked) };

    /* ── keyboard (exposed via onKeyDown on the stage) ── */
    keyHandler.current = (e) => {
      const step = e.shiftKey ? 0.08 : 0.03;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (e.key === " ") {
        e.preventDefault();
        setLock(!st.locked);
        return;
      }
      const m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      if (st.mode !== "keys") {
        st.tx = st.cx;
        st.ty = st.cy;
      }
      st.tx = Math.min(1, Math.max(0, st.tx + m[0]));
      st.ty = Math.min(1, Math.max(0, st.ty + m[1]));
      markInput("keys");
      if (!st.locked) st.tr = RADIUS;
    };

    /* ── reduced motion: static half-open reveal, nothing moves ── */
    if (reduced) {
      const draw = () => {
        const { w, h } = size();
        const f = face();
        const state: SpotState = { x: f.x * w, y: f.y * h, r: STATIC_RADIUS, vx: 0, vy: 0, time: 0, lock: 1, power: 0.6, desat: 0, ripple: [-1, -1, -1] };
        spot.current = { x: state.x, y: state.y, r: state.r };
        shader.current?.update(state);
        wordmark.current?.spot(state.x, state.y, state.r);
      };
      draw();
      const ro = new ResizeObserver(draw);
      ro.observe(stage);
      if (eyebrowRef.current) eyebrowRef.current.textContent = UNMASK.eyebrow;
      return () => {
        ro.disconnect();
        stage.removeEventListener("pointerenter", onEnter);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        stage.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }

    /* ── frame loop ── */
    const t0 = performance.now();
    let prevX = 0;
    let prevY = 0;

    const tick = () => {
      if (!st.visible) return;
      const now = performance.now();
      const time = (now - t0) / 1000;
      const { w, h } = size();
      if (!w || !h) return;

      // Idle: a slow figure-eight across the face after 3.5s without input.
      const idleFor = now - st.lastInput;
      if (st.introDone && !st.locked && !st.touchDown && idleFor > IDLE_AFTER_MS) {
        if (st.mode !== "idle") st.mode = "idle";
        const f = face();
        const k = (idleFor - IDLE_AFTER_MS) / 1000;
        const ax = Math.min(0.16, (0.15 * f.scale * 1152) / w);
        const ay = Math.min(0.14, (0.11 * f.scale * 1536) / h);
        const a = k * 0.55;
        st.tx = f.x + ax * Math.sin(a);
        st.ty = f.y + ay * Math.sin(a) * Math.cos(a) * 1.6;
        st.tr = IDLE_RADIUS;
      }

      // Prototype easing.
      st.cx += (st.tx - st.cx) * EASE;
      st.cy += (st.ty - st.cy) * EASE;

      const px = st.cx * w;
      const py = st.cy * h;
      const vx = px - prevX;
      const vy = py - prevY;
      prevX = px;
      prevY = py;
      st.vx += (vx - st.vx) * 0.25;
      st.vy += (vy - st.vy) * 0.25;
      const speed = Math.hypot(st.vx, st.vy);

      // A quick flick briefly opens the radius.
      const burstTarget = st.mode === "pointer" ? Math.min(speed * 5, 150) : 0;
      st.burst += (burstTarget - st.burst) * (burstTarget > st.burst ? 0.3 : 0.05);

      const target = st.tr + (st.locked ? 0 : st.burst);
      if (st.spring) {
        // Springy open/close for the lock switch.
        st.rv = st.rv * 0.82 + (target - st.cr) * 0.075;
        st.cr += st.rv;
        if (Math.abs(target - st.cr) < 0.5 && Math.abs(st.rv) < 0.5) st.spring = false;
      } else {
        st.cr += (target - st.cr) * EASE;
      }
      st.lock += ((st.locked ? 1 : 0) - st.lock) * 0.08;

      // Scroll story: reveal grows to swallow the frame and drifts to the face.
      const f = face();
      const reveal = st.story.reveal;
      const ease = reveal * reveal * (3 - 2 * reveal);
      const diag = Math.hypot(w, h) * 1.25;
      const x = px + (f.x * w - px) * ease;
      const y = py + (f.y * h - py) * ease;
      const r = Math.max(0, st.cr) + (diag - Math.max(0, st.cr)) * ease;

      const rippleAge = st.ripple[2] >= 0 ? (now - st.rippleAt) / 1000 : -1;
      const power = Math.max(0, 1 - r / 520) * (1 - ease);

      const state: SpotState = {
        x,
        y,
        r,
        vx: st.vx,
        vy: st.vy,
        time,
        lock: st.lock,
        power,
        desat: st.story.desat,
        ripple: [st.ripple[0], st.ripple[1], rippleAge > 2.5 ? -1 : rippleAge],
      };
      spot.current = { x, y, r };
      shader.current?.update(state);
      wordmark.current?.spot(x, y, r);
      reticle.current?.update(px, py, Math.max(0, st.cr), st.cx, st.cy);
      reticle.current?.hide(reveal > 0.04);
      servoUpdate(Math.min(1, r / 600 + speed / 60) * (1 - ease));
    };
    gsap.ticker.add(tick);

    const stopObserving = observeVisibility(section, (v) => {
      st.visible = v;
      if (!v) servoStop();
    });

    /* ── intro: letters rise, a pulse teaches the reveal, the eyebrow types ── */
    let introTl: gsap.core.Timeline | null = null;
    // The pre-hydration CSS hides the letters with translateY(110%); GSAP reads that as a
    // pixel y when it first touches them, so own both properties explicitly.
    gsap.set(section.querySelectorAll(`.${s.wmChar}`), { y: 0, yPercent: 110 });
    let alive = true;
    whenLoaderDone().then(() => {
      if (!alive) return;
      section.dataset.intro = "done";
      const f = face();
      st.tx = st.cx = f.x;
      st.ty = st.cy = f.y;
      // Letters always finish rising; input only cancels the teaching pulse.
      gsap.to(section.querySelectorAll(`.${s.wmChar}`), { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.05, delay: 0.1 });
      introTl = gsap
        .timeline({ onInterrupt: () => typeEyebrow() })
        .to(st, { tr: PULSE_RADIUS, duration: 0.9, ease: "expo.out" }, 0.75)
        .to(st, { tr: 0, duration: 0.7, ease: "power3.inOut" }, "+=0.6")
        .call(() => typeEyebrow(), [], "-=0.2");
    });

    let typing = 0;
    let typed = false;
    function typeEyebrow() {
      const el = eyebrowRef.current;
      if (!el || typed) return;
      typed = true;
      const text = UNMASK.eyebrow;
      const start = performance.now();
      const step = () => {
        const n = Math.min(text.length, Math.floor((performance.now() - start) / 45));
        el.textContent = text.slice(0, n);
        if (n < text.length) typing = requestAnimationFrame(step);
        else if (st.mode === "intro") {
          st.introDone = true;
          st.lastInput = performance.now() - IDLE_AFTER_MS;
        }
      };
      typing = requestAnimationFrame(step);
    }

    /* ── Konami: fire the full armour reveal ── */
    const offKonami = on("unmask:reveal", () => {
      const { w, h } = size();
      markInput("pointer");
      gsap
        .timeline()
        .to(st, { tr: Math.hypot(w, h), duration: 0.9, ease: "expo.out" })
        .to(st, { tr: st.locked ? Math.max(w, h) * 0.34 : 0, duration: 0.8, ease: "power3.inOut" }, "+=1.2");
    });

    /* ── scroll story: pin, swallow the frame, split the name, scale and desaturate ── */
    const storyCtx = gsap.context(() => {
      // Story runs until the machine starts to rise; the last screen of scroll is the wipe.
      const story = () => section.offsetHeight - window.innerHeight;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom top",
        pin: stage,
        pinSpacing: false,
        refreshPriority: 10,
      });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top top", end: () => `+=${Math.max(1, story())}`, scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to(st.story, { reveal: 1, ease: "none", duration: 0.55 }, 0)
        .to(section.querySelectorAll("[data-fade]"), { autoAlpha: 0, y: -20, ease: "power2.in", duration: 0.2 }, 0.02)
        .to(section.querySelectorAll("[data-stickers]"), { autoAlpha: 0, scale: 1.08, ease: "power2.in", duration: 0.22 }, 0.04)
        .to(section.querySelectorAll('[data-line="0"]'), { xPercent: -70, ease: "power2.in", duration: 0.5 }, 0.2)
        .to(section.querySelectorAll('[data-line="1"]'), { xPercent: 70, ease: "power2.in", duration: 0.5 }, 0.2)
        .to(section.querySelectorAll("[data-subline]"), { autoAlpha: 0, duration: 0.15 }, 0.2)
        .to(frameRef.current, { scale: 0.8, ease: "power2.inOut", duration: 0.55 }, 0.4)
        .to(st.story, { desat: 1, ease: "none", duration: 0.5 }, 0.45);
    }, section);

    return () => {
      alive = false;
      introTl?.kill();
      cancelAnimationFrame(typing);
      gsap.ticker.remove(tick);
      stopObserving();
      offKonami();
      storyCtx.revert();
      servoStop();
      stage.removeEventListener("pointerenter", onEnter);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const keyHandler = useRef<(e: KeyboardEvent<HTMLDivElement>) => void>(() => {});

  return (
    <section ref={sectionRef} id="unmask" className={s.unmask} data-theme="ink" data-intro="pending" aria-labelledby="unmask-title">
      <h1 id="unmask-title" className="sr-only">
        Arman Acharya, Frontend Developer and Designer
      </h1>

      <div
        ref={stageRef}
        className={s.stage}
        tabIndex={0}
        role="group"
        aria-roledescription="interactive portrait"
        aria-label="Portrait of Arman in armour. Move the pointer, or use the arrow keys, to unmask. Space locks the reveal open."
        data-cursor-variant="glow"
        onKeyDown={(e) => keyHandler.current(e)}
      >
        <div ref={frameRef} className={s.frame}>
          <SpotlightShader ref={shader} portrait={PORTRAIT} armour={ARMOUR} posY={posY} />
          <div className={s.vignette} aria-hidden="true" />
          <div className={s.grainLocal} aria-hidden="true" />
        </div>

        <GiantWordmark ref={wordmark} subline={UNMASK.subline} aka={UNMASK.aka} />

        <div className={s.hint} data-fade="">
          <span ref={eyebrowRef} className={`label ${s.eyebrow}`} aria-hidden="true" />
          <span className={s.rule} aria-hidden="true" />
        </div>

        <Reticle ref={reticle} />
        {/* Wrapper exists from the first render, so the story timeline can fade it. */}
        <div className={s.stickerWrap} data-stickers="">
          <StickerLayer spot={spot} />
        </div>

        <div className={s.toggleWrap} data-fade="">
          <UnmaskToggle locked={locked} onToggle={() => api.current?.toggleLock()} />
        </div>

        <span className={`label ${s.scrollCue}`} data-fade="" aria-hidden="true">
          Scroll: the mask comes off
        </span>
      </div>
    </section>
  );
}
