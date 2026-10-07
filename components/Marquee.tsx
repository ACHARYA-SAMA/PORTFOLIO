"use client";

import { Fragment, useEffect, useRef } from "react";
import { MARQUEE_BOTTOM, MARQUEE_TOP } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { observeVisibility, prefersReducedMotion } from "@/lib/hooks";
import { lenisStore } from "@/lib/store";
import VelocitySkew from "@/components/ui/VelocitySkew";
import s from "./marquee.module.css";

function Star() {
  return (
    <svg className={s.star} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 0c1.6 10.4 9.6 18.4 20 20-10.4 1.6-18.4 9.6-20 20-1.6-10.4-9.6-18.4-20-20C10.4 18.4 18.4 10.4 20 0Z" />
    </svg>
  );
}

const COPIES = 3;

/**
 * Two rows running in opposite directions. Speed follows scroll velocity
 * and eases back. Hovering pauses and flips the colour scheme.
 */
export default function Marquee() {
  const rootRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const rows = [topRef.current, bottomRef.current];
    if (!root || rows.some((r) => !r) || prefersReducedMotion()) return;

    const state = rows.map((row, i) => ({
      row: row!,
      x: 0,
      width: 0,
      base: i === 0 ? -70 : 52, // px per second, opposite directions
    }));
    let boost = 0;
    let hover = 0;
    let hoverTarget = 1;
    let visible = false;

    const measure = () =>
      state.forEach((st) => {
        st.width = (st.row.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);

    const stopObserving = observeVisibility(root, (v) => (visible = v));

    const onEnter = () => (hoverTarget = 0);
    const onLeave = () => (hoverTarget = 1);
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;

      const velocity = lenisStore.get()?.velocity ?? 0;
      // Scrolling down speeds the rows up; scrolling up slows and then reverses them.
      const target = Math.max(-5, Math.min(velocity * 0.32, 8));
      boost += (target - boost) * 0.08;
      hover += (hoverTarget - hover) * 0.1;

      state.forEach((st) => {
        if (!st.width) return;
        const speed = st.base * (1 + boost) * hover;
        st.x = (((st.x + speed * dt) % st.width) - st.width) % st.width;
        st.row.style.transform = `translate3d(${st.x.toFixed(2)}px,0,0)`;
      });
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      stopObserving();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section ref={rootRef} id="marquee" className={s.marquee} data-theme="ink" aria-label="What I do">
      <p className="sr-only">
        {MARQUEE_TOP.join(", ")}. {MARQUEE_BOTTOM.join(", ")}.
      </p>
      <VelocitySkew max={4}>
      <div className={s.lane} aria-hidden="true">
        <div ref={topRef} className={s.track}>
          {Array.from({ length: COPIES }, (_, c) => (
            <div key={c} className={`display ${s.groupTop}`}>
              {MARQUEE_TOP.map((w) => (
                <Fragment key={w}>
                  <span>{w}</span>
                  <Star />
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={`${s.lane} ${s.laneBottom}`} aria-hidden="true">
        <div ref={bottomRef} className={s.track}>
          {Array.from({ length: COPIES }, (_, c) => (
            <div key={c} className={s.groupBottom}>
              {MARQUEE_BOTTOM.map((w) => (
                <Fragment key={w}>
                  <span>{w}</span>
                  <i className={s.sep}>·</i>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      </VelocitySkew>
    </section>
  );
}
