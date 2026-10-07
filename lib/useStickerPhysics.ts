"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "./gsap";
import { prefersReducedMotion } from "./hooks";
import { playPop } from "./sound";

export type StickerPlacement = { x: number; y: number; r: number };

export type StickerBody = {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  base: number;
  w: number;
  h: number;
  drag: boolean;
};

type Options = {
  /** Board scale written to --s, from the board width. */
  scaleFor?: (width: number) => number;
  /** Called every frame while a sticker is held. */
  onDrag?: (body: StickerBody) => void;
  onRelease?: (body: StickerBody) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const RESTITUTION = 0.5;
const FRICTION = 0.94;

/**
 * Fling physics for absolutely positioned stickers inside a board: drag with
 * pointer capture, release with velocity, friction, soft bounces off the
 * edges, rotation that leans into the motion. Arrow keys nudge when focused.
 */
export function useStickerPhysics(
  boardRef: RefObject<HTMLElement | null>,
  elsRef: RefObject<Array<HTMLElement | null>>,
  placements: StickerPlacement[],
  options: Options = {},
) {
  const opts = useRef(options);
  opts.current = options;
  const bodiesRef = useRef<StickerBody[]>([]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const reduced = prefersReducedMotion();
    let W = 0;
    let H = 0;
    let running = false;
    let z = 10;

    const bodies: StickerBody[] = placements
      .map((p, i) => ({ p, el: elsRef.current?.[i] }))
      .filter((b): b is { p: StickerPlacement; el: HTMLElement } => Boolean(b.el))
      .map(({ p, el }) => ({ el, x: 0, y: 0, vx: 0, vy: 0, rot: p.r, vr: 0, base: p.r, w: 0, h: 0, drag: false }));
    bodiesRef.current = bodies;

    const apply = (b: StickerBody) => {
      b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.rot.toFixed(2)}deg)`;
    };

    const layout = (initial: boolean) => {
      W = board.clientWidth;
      H = board.clientHeight;
      const scale = opts.current.scaleFor?.(W);
      if (scale !== undefined) board.style.setProperty("--s", String(scale));
      bodies.forEach((b, i) => {
        b.w = b.el.offsetWidth;
        b.h = b.el.offsetHeight;
        if (initial) {
          b.x = placements[i].x * W - b.w / 2;
          b.y = placements[i].y * H - b.h / 2;
        }
        b.x = clamp(b.x, 0, Math.max(0, W - b.w));
        b.y = clamp(b.y, 0, Math.max(0, H - b.h));
        apply(b);
      });
    };

    const step = () => {
      let moving = false;
      for (const b of bodies) {
        if (b.drag) {
          moving = true;
          opts.current.onDrag?.(b);
          continue;
        }
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= FRICTION;
        b.vy *= FRICTION;
        const maxX = Math.max(0, W - b.w);
        const maxY = Math.max(0, H - b.h);
        if (b.x < 0 || b.x > maxX) {
          b.x = clamp(b.x, 0, maxX);
          b.vx = -b.vx * RESTITUTION;
          b.vr += b.vy * 0.05 * (b.x === 0 ? 1 : -1);
        }
        if (b.y < 0 || b.y > maxY) {
          b.y = clamp(b.y, 0, maxY);
          b.vy = -b.vy * RESTITUTION;
          b.vr += b.vx * 0.05 * (b.y === 0 ? -1 : 1);
        }
        b.vr = (b.vr + (b.base - b.rot) * 0.03) * 0.86;
        b.rot += b.vr;
        if (Math.abs(b.vx) + Math.abs(b.vy) > 0.04 || Math.abs(b.vr) > 0.01 || Math.abs(b.base - b.rot) > 0.05) moving = true;
        apply(b);
      }
      if (!moving) stop();
    };

    const start = () => {
      if (running) return;
      running = true;
      gsap.ticker.add(step);
    };
    const stop = () => {
      running = false;
      gsap.ticker.remove(step);
    };

    const cleanups = bodies.map((b) => {
      let ox = 0;
      let oy = 0;
      let lastX = 0;
      let lastY = 0;
      let lastT = 0;

      const down = (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = board.getBoundingClientRect();
        b.drag = true;
        ox = e.clientX - rect.left - b.x;
        oy = e.clientY - rect.top - b.y;
        lastX = b.x;
        lastY = b.y;
        lastT = performance.now();
        b.vx = b.vy = 0;
        b.el.style.zIndex = String(++z);
        b.el.setPointerCapture(e.pointerId);
        b.el.dataset.lifted = "true";
        playPop();
        start();
      };
      const move = (e: PointerEvent) => {
        if (!b.drag) return;
        const rect = board.getBoundingClientRect();
        const now = performance.now();
        const nx = clamp(e.clientX - rect.left - ox, -b.w * 0.2, W - b.w * 0.8);
        const ny = clamp(e.clientY - rect.top - oy, -b.h * 0.2, H - b.h * 0.8);
        const dt = Math.max(1, now - lastT);
        // px per 60fps frame, smoothed
        b.vx = b.vx * 0.5 + ((nx - lastX) / dt) * 16.7 * 0.5;
        b.vy = b.vy * 0.5 + ((ny - lastY) / dt) * 16.7 * 0.5;
        lastX = b.x = nx;
        lastY = b.y = ny;
        lastT = now;
        b.rot = b.base + clamp(b.vx * 1.4, -22, 22);
        apply(b);
      };
      const up = (e: PointerEvent) => {
        if (!b.drag) return;
        b.drag = false;
        b.el.releasePointerCapture(e.pointerId);
        b.el.dataset.lifted = "false";
        if (reduced || performance.now() - lastT > 90) b.vx = b.vy = 0;
        b.vx = clamp(b.vx, -60, 60);
        b.vy = clamp(b.vy, -60, 60);
        opts.current.onRelease?.(b);
        start();
      };
      const key = (e: KeyboardEvent) => {
        const d = e.shiftKey ? 60 : 24;
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [-d, 0],
          ArrowRight: [d, 0],
          ArrowUp: [0, -d],
          ArrowDown: [0, d],
        };
        const m = moves[e.key];
        if (!m) return;
        e.preventDefault();
        e.stopPropagation();
        b.x = clamp(b.x + m[0], 0, Math.max(0, W - b.w));
        b.y = clamp(b.y + m[1], 0, Math.max(0, H - b.h));
        apply(b);
      };

      b.el.addEventListener("pointerdown", down);
      b.el.addEventListener("pointermove", move);
      b.el.addEventListener("pointerup", up);
      b.el.addEventListener("pointercancel", up);
      b.el.addEventListener("keydown", key);
      return () => {
        b.el.removeEventListener("pointerdown", down);
        b.el.removeEventListener("pointermove", move);
        b.el.removeEventListener("pointerup", up);
        b.el.removeEventListener("pointercancel", up);
        b.el.removeEventListener("keydown", key);
      };
    });

    layout(true);
    const ro = new ResizeObserver(() => layout(false));
    ro.observe(board);

    return () => {
      stop();
      ro.disconnect();
      cleanups.forEach((c) => c());
    };
    // Placements are static per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return bodiesRef;
}
