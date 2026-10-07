"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const DARK_THEMES = new Set(["asphalt", "ink"]);

/**
 * One global cursor. Any element with data-cursor="LABEL" grows it into a
 * 74px disc with that label. Listening is delegated, so elements mounted
 * later work without wiring. Disabled on touch.
 */
export default function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const label = labelRef.current;
    if (!root || !label) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-cursor");

    let x = -200;
    let y = -200;
    let cx = x;
    let cy = y;
    let shown = false;
    let current: Element | null = null;

    const watcher = new MutationObserver(() => applyLabel(current));

    function applyLabel(el: Element | null) {
      const text = el?.getAttribute("data-cursor") ?? "";
      if (text) {
        label!.textContent = text;
        root!.classList.add("is-active");
      } else {
        root!.classList.remove("is-active");
      }
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        cx = x;
        cy = y;
        root.classList.add("is-visible");
      }
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      const next = target.closest("[data-cursor]");
      if (next !== current) {
        watcher.disconnect();
        current = next;
        if (next) watcher.observe(next, { attributes: true, attributeFilter: ["data-cursor"] });
        applyLabel(next);
      }
      const theme = target.closest("[data-theme]")?.getAttribute("data-theme") ?? "paper";
      root.dataset.tone = DARK_THEMES.has(theme) ? "light" : "dark";
      root.dataset.variant = target.closest("[data-cursor-variant]")?.getAttribute("data-cursor-variant") ?? "";
    };

    const onDown = () => root.classList.add("is-down");
    const onUp = () => root.classList.remove("is-down");
    const onLeave = () => root.classList.remove("is-visible");
    const onEnter = () => shown && root.classList.add("is-visible");

    const tick = () => {
      const k = reduced ? 1 : 0.22;
      cx += (x - cx) * k;
      cy += (y - cy) * k;
      root.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    gsap.ticker.add(tick);

    return () => {
      watcher.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      gsap.ticker.remove(tick);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  return (
    <div ref={rootRef} className="cursor" aria-hidden="true">
      <span className="cursor__dot" />
      <span ref={labelRef} className="cursor__label" />
    </div>
  );
}
