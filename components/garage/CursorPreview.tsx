"use client";

import { useEffect, useRef, useState } from "react";
import WebGLImageDistortion, { type DistortionHandle } from "./WebGLImageDistortion";
import type { Project } from "@/lib/content";
import { gsap } from "@/lib/gsap";
import { hasFinePointer, prefersReducedMotion } from "@/lib/hooks";
import { pad } from "@/lib/format";
import s from "./garage.module.css";

/** Honest placeholder art, painted for the WebGL texture. TODO: add media and pass its URL instead. */
function paintPlaceholder(index: number, title: string) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,246,238,0.07)";
    ctx.lineWidth = Math.max(1, w / 400);
    for (let x = -h; x < w; x += w / 26) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#ff2a17";
    ctx.font = `900 ${Math.round(h * 0.34)}px ${getComputedStyle(document.body).getPropertyValue("--font-archivo") || "sans-serif"}`;
    ctx.textBaseline = "top";
    ctx.fillText(pad(index + 1), w * 0.05, h * 0.05);
    ctx.fillStyle = "rgba(255,246,238,0.9)";
    ctx.font = `600 ${Math.round(h * 0.045)}px ${getComputedStyle(document.body).getPropertyValue("--font-jetbrains") || "monospace"}`;
    ctx.fillText(`MEDIA SLOT · ${title.toUpperCase()}`.slice(0, 44), w * 0.05, h * 0.78);
    ctx.fillStyle = "rgba(255,246,238,0.55)";
    ctx.fillText("TODO: ADD MEDIA", w * 0.05, h * 0.86);
  };
}

/** Floating media card that trails the cursor with inertia and leans into its velocity. */
export default function CursorPreview({ projects, active }: { projects: Project[]; active: number | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gl = useRef<DistortionHandle>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [glReady, setGlReady] = useState(false);

  useEffect(() => {
    if (active === null) {
      gl.current?.setActive(false);
      return;
    }
    gl.current?.setActive(true);
    gl.current?.show(paintPlaceholder(active, projects[active].title));
  }, [active, glReady, projects]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !hasFinePointer()) return;
    const reduced = prefersReducedMotion();

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let x = mx;
    let y = my;
    let rot = 0;
    let scale = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const tick = () => {
      const on = activeRef.current !== null;
      const k = reduced ? 1 : 0.13;
      const px = x;
      const py = y;
      x += (mx - x) * k;
      y += (my - y) * k;
      const vx = x - px;
      gl.current?.velocity(vx, y - py);
      rot += (Math.max(-14, Math.min(14, vx * 0.55)) - rot) * 0.12;
      scale += ((on ? 1 : 0) - scale) * (reduced ? 1 : 0.16);
      if (scale < 0.002 && !on) {
        root.style.visibility = "hidden";
        return;
      }
      root.style.visibility = "visible";
      root.style.transform = `translate3d(${(x + 28).toFixed(1)}px, ${(y - 120).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <div ref={rootRef} className={s.preview} aria-hidden="true">
      <WebGLImageDistortion ref={gl} className={s.previewCanvas} onReady={setGlReady} />
      {!glReady &&
        projects.map((p, i) => (
          // TODO: add media (screenshot or short loop) for each project.
          <div key={p.id} className={`placeholder ${s.previewFrame}`} data-on={i === active}>
            <span className={`display ${s.previewIndex}`}>{pad(i + 1)}</span>
            <span className="placeholder__tag">
              Media slot · {p.title}
              <br />
              TODO: add media
            </span>
          </div>
        ))}
    </div>
  );
}
