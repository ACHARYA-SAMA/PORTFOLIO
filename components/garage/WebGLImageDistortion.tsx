"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createPass, createTexture, prefersLightweight, type GLPass } from "@/lib/gl";

export type DistortionHandle = {
  /** Show a source: an image URL, or a function that paints a placeholder onto a 2D canvas. */
  show: (source: string | ((ctx: CanvasRenderingContext2D, w: number, h: number) => void)) => void;
  /** Pointer velocity in px per frame; drives the ripple. */
  velocity: (vx: number, vy: number) => void;
  /** Render only while the preview is showing. */
  setActive: (active: boolean) => void;
};

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uVel;
uniform float uPulse;
void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float speed = clamp(length(uVel) * 0.03, 0.0, 1.0);
  float wave = sin(uv.y * 14.0 + uTime * 7.0) * 0.012 * speed + sin(uv.x * 9.0 - uTime * 5.0) * 0.006 * speed;
  vec2 c = uv - 0.5;
  float d = length(c);
  float ring = sin(d * 38.0 - uPulse * 22.0) * exp(-d * 4.0) * (1.0 - uPulse) * 0.025;
  vec2 dir = d > 0.0 ? c / d : vec2(0.0);
  vec2 duv = uv + vec2(wave, wave * 0.4) + dir * ring;
  float split = 0.004 * speed;
  vec3 col = vec3(texture2D(uTex, duv + vec2(split, 0.0)).r, texture2D(uTex, duv).g, texture2D(uTex, duv - vec2(split, 0.0)).b);
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * Hover ripple for project previews: one quad, one texture, a velocity-
 * driven wave and a ring that pulses outward whenever the source changes.
 * Returns null-safe: if WebGL is unavailable the caller keeps its CSS frame.
 */
export default function WebGLImageDistortion({
  className,
  onReady,
  ref,
}: {
  className?: string;
  onReady?: (ok: boolean) => void;
  ref?: Ref<DistortionHandle>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    pass: null as GLPass | null,
    tex: null as WebGLTexture | null,
    vel: [0, 0],
    pulseStart: -10,
    start: 0,
    frame: 0,
    active: false,
    paint: null as HTMLCanvasElement | null,
    loop: () => {},
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const st = state.current;
    if (!canvas || prefersLightweight()) {
      onReady?.(false);
      return;
    }
    try {
      const pass = createPass(canvas, FRAG);
      if (!pass) throw new Error("no webgl");
      st.pass = pass;
      st.paint = document.createElement("canvas");
      st.start = performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr) || 640;
      canvas.height = Math.round(canvas.clientHeight * dpr) || 480;
      pass.gl.viewport(0, 0, canvas.width, canvas.height);
      onReady?.(true);
    } catch {
      onReady?.(false);
    }

    const loop = () => {
      st.frame = 0;
      const pass = st.pass;
      if (!st.active) return;
      if (pass) {
        const t = (performance.now() - st.start) / 1000;
        const pulse = Math.min(1, (t - st.pulseStart) / 0.9);
        pass.gl.uniform1f(pass.uniform("uTime"), t);
        pass.gl.uniform2f(pass.uniform("uVel"), st.vel[0], st.vel[1]);
        pass.gl.uniform1f(pass.uniform("uPulse"), pulse);
        pass.draw();
      }
      st.frame = requestAnimationFrame(loop);
    };
    st.loop = loop;

    return () => {
      cancelAnimationFrame(st.frame);
      st.pass?.dispose();
      st.pass = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    show(source) {
      const st = state.current;
      const pass = st.pass;
      if (!pass || !st.paint) return;
      const upload = (img: TexImageSource) => {
        const { gl } = pass;
        if (!st.tex) {
          st.tex = createTexture(gl, 0, img);
          gl.uniform1i(pass.uniform("uTex"), 0);
        } else {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, st.tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        }
        st.pulseStart = (performance.now() - st.start) / 1000;
      };
      if (typeof source === "string") {
        const img = new Image();
        img.onload = () => upload(img);
        img.src = source;
        return;
      }
      const w = canvasRef.current?.width ?? 640;
      const h = canvasRef.current?.height ?? 480;
      st.paint.width = w;
      st.paint.height = h;
      const ctx = st.paint.getContext("2d");
      if (!ctx) return;
      source(ctx, w, h);
      upload(st.paint);
    },
    velocity(vx, vy) {
      state.current.vel = [vx, vy];
    },
    setActive(active) {
      const st = state.current;
      st.active = active;
      if (active && !st.frame) st.frame = requestAnimationFrame(st.loop);
    },
  }));

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
