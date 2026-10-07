"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createPass, createTexture, prefersLightweight, SIMPLEX_3D, type GLPass } from "@/lib/gl";
import { FACE, IMAGE, REACTOR, imageToStage } from "./cover";
import s from "./unmask.module.css";

export type SpotState = {
  /** Spotlight centre, stage px. */
  x: number;
  y: number;
  /** Radius, stage px. */
  r: number;
  /** Velocity of the eased spotlight, px per frame. */
  vx: number;
  vy: number;
  time: number;
  /** 0 = free edge, 1 = locked (calm edge). */
  lock: number;
  /** Chest reactor brightness, 0..1. */
  power: number;
  /** Scroll story desaturation, 0..1. */
  desat: number;
  /** Entry ripple origin (stage px) and age in seconds; age < 0 means none. */
  ripple: [number, number, number];
};

export type SpotlightHandle = {
  update: (state: SpotState) => void;
  readonly mode: "webgl" | "css";
};

type Props = {
  portrait: string;
  armour: string;
  posY: number;
  onMode?: (mode: "webgl" | "css") => void;
  ref?: Ref<SpotlightHandle>;
};

const FRAG = `
precision highp float;
uniform sampler2D uBase;
uniform sampler2D uArmor;
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uImg;
uniform vec2 uPos;
uniform vec2 uMouse;
uniform float uRadius;
uniform vec2 uVel;
uniform float uTime;
uniform float uLock;
uniform float uPower;
uniform float uDesat;
uniform vec3 uRipple;
uniform vec2 uReactor;
uniform vec2 uFace;
${SIMPLEX_3D}

float coverS(vec2 res) { return max(res.x / uImg.x, res.y / uImg.y); }
vec2 toImage(vec2 p, vec2 res) {
  vec2 disp = uImg * coverS(res);
  return (p - (res - disp) * uPos) / disp;
}
vec2 toStage(vec2 uv, vec2 res) {
  vec2 disp = uImg * coverS(res);
  return (res - disp) * uPos + uv * disp;
}

void main() {
  vec2 res = uRes / uDpr;
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float sc = coverS(res);
  vec3 arc = vec3(0.498, 0.847, 1.0);

  // Refraction ripple travelling out from where the pointer entered.
  vec2 rp = p;
  if (uRipple.z >= 0.0 && uRipple.z < 2.5) {
    vec2 d = p - uRipple.xy;
    float dist = length(d);
    float front = uRipple.z * 720.0;
    float band = exp(-pow((dist - front) / 42.0, 2.0)) * exp(-uRipple.z * 1.8);
    rp += (d / max(dist, 0.001)) * band * 10.0;
  }

  // Distance to the spotlight, stretched along the direction of travel.
  vec2 off = p - uMouse;
  float speed = length(uVel);
  if (speed > 0.05) {
    vec2 dir = uVel / speed;
    float stretch = 1.0 + min(speed * 0.04, 0.8);
    float along = dot(off, dir);
    vec2 perp = off - along * dir;
    off = dir * (along / stretch) + perp * mix(1.0, sqrt(stretch), 0.7);
  }
  float d = length(off);

  // Organic, slowly drifting edge.
  float ang = atan(off.y, off.x);
  vec2 ring = vec2(cos(ang), sin(ang));
  float n = snoise(vec3(ring * 1.25, uTime * 0.22)) * 0.08 + snoise(vec3(ring * 3.2 + 7.0, uTime * 0.41)) * 0.03;
  float r = uRadius * (1.0 + n * (1.0 - uLock * 0.75));

  // Prototype curve: clear to 62% of the radius, fully armour at 100%.
  float armourMask = uRadius < 0.5 ? 1.0 : smoothstep(r * 0.62, r, d);

  float rim = uRadius < 0.5 ? 0.0 : exp(-pow((d - r * 0.84) / (r * 0.045 + 1.5), 2.0));
  vec2 dirN = d > 0.001 ? off / d : vec2(0.0);
  float splitPx = (1.0 + min(speed * 0.14, 1.6)) * rim;
  vec2 ca = dirN * splitPx / (uImg * sc);

  vec2 uv = toImage(rp, res);
  vec3 base = vec3(texture2D(uBase, uv + ca).r, texture2D(uBase, uv).g, texture2D(uBase, uv - ca).b);
  vec3 armor = vec3(texture2D(uArmor, uv + ca).r, texture2D(uArmor, uv).g, texture2D(uArmor, uv - ca).b);

  // Chest reactor: soft pulsing glow that powers down when the person is revealed.
  vec2 rs = toStage(uReactor, res);
  float rd = length(p - rs) / sc;
  float pulse = 0.72 + 0.28 * sin(uTime * 2.3);
  float glow = exp(-rd * rd / (2.0 * 80.0 * 80.0)) * 0.5 + exp(-rd * rd / (2.0 * 24.0 * 24.0)) * 0.7;
  armor += arc * glow * pulse * uPower;

  vec3 col = mix(base, armor, armourMask);

  // Faint scanline sweep where the reveal crosses the face.
  vec2 fs = toStage(uFace, res);
  float faceR = 0.17 * uImg.x * sc;
  float onFace = (1.0 - smoothstep(faceR * 0.55, faceR, length(p - fs))) * (1.0 - armourMask);
  float sweepY = fs.y - faceR + fract(uTime * 0.32) * faceR * 2.0;
  float sweep = exp(-pow((p.y - sweepY) / 3.5, 2.0));
  float lines = 0.5 + 0.5 * sin(p.y * 2.4);
  col += arc * onFace * (sweep * 0.16 + lines * 0.022);

  // Thin bright rim.
  col += mix(vec3(1.0), arc, 0.55) * rim * 0.5;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(lum * 0.96), uDesat);
  gl_FragColor = vec4(col, 1.0);
}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Two pixel-aligned layers (portrait under armour). With WebGL, one fragment
 * shader draws the reveal. Without it (reduced motion, weak device, no GL),
 * the armour <img> gets the prototype's CSS radial-gradient mask instead.
 */
export default function SpotlightShader({ portrait, armour, posY, onMode, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const armourRef = useRef<HTMLImageElement>(null);
  const reactorRef = useRef<HTMLDivElement>(null);
  const passRef = useRef<GLPass | null>(null);
  const modeRef = useRef<"webgl" | "css">("css");
  const posRef = useRef(posY);
  posRef.current = posY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersLightweight()) {
      onMode?.("css");
      return;
    }
    let disposed = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const [base, arm] = await Promise.all([loadImage(portrait), loadImage(armour)]);
        if (disposed) return;
        const pass = createPass(canvas, FRAG);
        if (!pass) throw new Error("no webgl");
        const { gl } = pass;
        createTexture(gl, 0, base);
        createTexture(gl, 1, arm);
        gl.uniform1i(pass.uniform("uBase"), 0);
        gl.uniform1i(pass.uniform("uArmor"), 1);
        gl.uniform2f(pass.uniform("uImg"), IMAGE.w, IMAGE.h);
        gl.uniform2f(pass.uniform("uReactor"), REACTOR.u, REACTOR.v);
        gl.uniform2f(pass.uniform("uFace"), FACE.u, FACE.v);

        const resize = () => {
          // Full-screen pass: cap DPR at 1.5 to keep fill-rate sane on 4K.
          const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (!w || !h) return;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform2f(pass.uniform("uRes"), canvas.width, canvas.height);
          gl.uniform1f(pass.uniform("uDpr"), dpr);
        };
        resize();
        ro = new ResizeObserver(resize);
        ro.observe(canvas);

        passRef.current = pass;
        modeRef.current = "webgl";
        canvas.dataset.ready = "true";
        onMode?.("webgl");
      } catch {
        modeRef.current = "css";
        onMode?.("css");
      }
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      passRef.current?.dispose();
      passRef.current = null;
    };
    // Sources are fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    get mode() {
      return modeRef.current;
    },
    update(st) {
      const pass = passRef.current;
      if (pass) {
        const { gl } = pass;
        gl.uniform2f(pass.uniform("uPos"), 0.5, posRef.current);
        gl.uniform2f(pass.uniform("uMouse"), st.x, st.y);
        gl.uniform1f(pass.uniform("uRadius"), Math.max(0, st.r));
        gl.uniform2f(pass.uniform("uVel"), st.vx, st.vy);
        gl.uniform1f(pass.uniform("uTime"), st.time);
        gl.uniform1f(pass.uniform("uLock"), st.lock);
        gl.uniform1f(pass.uniform("uPower"), st.power);
        gl.uniform1f(pass.uniform("uDesat"), st.desat);
        gl.uniform3f(pass.uniform("uRipple"), st.ripple[0], st.ripple[1], st.ripple[2]);
        pass.draw();
        return;
      }

      // CSS fallback: exactly the prototype's mask.
      const img = armourRef.current;
      const stage = img?.parentElement;
      if (!img || !stage) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const r = Math.max(0, st.r);
      const grad =
        r < 0.5
          ? "none"
          : `radial-gradient(circle ${r.toFixed(1)}px at ${((st.x / w) * 100).toFixed(3)}% ${((st.y / h) * 100).toFixed(3)}%, transparent 0%, transparent 62%, black 100%)`;
      img.style.webkitMaskImage = grad;
      img.style.maskImage = grad;
      img.style.filter = st.desat > 0.01 ? `grayscale(${st.desat.toFixed(3)})` : "";
      if (img.previousElementSibling instanceof HTMLElement) img.previousElementSibling.style.filter = img.style.filter;

      const reactor = reactorRef.current;
      if (reactor) {
        const pt = imageToStage(REACTOR.u, REACTOR.v, w, h, 0.5, posRef.current);
        const covered = Math.hypot(pt.x - st.x, pt.y - st.y) < r * 0.75;
        reactor.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) scale(${pt.scale.toFixed(3)})`;
        reactor.style.opacity = covered ? "0" : String(st.power);
      }
    },
  }));

  return (
    <>
      {/* Plain <img> so both layers share one cover crop and stay pixel-aligned. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portrait} alt="Arman Acharya in a suit" className={s.layer} fetchPriority="high" decoding="async" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={armourRef} src={armour} alt="Arman Acharya in an Iron Man armour composite" className={`${s.layer} ${s.armour}`} fetchPriority="high" decoding="async" />
      <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      <div ref={reactorRef} className={s.reactor} aria-hidden="true" />
    </>
  );
}
