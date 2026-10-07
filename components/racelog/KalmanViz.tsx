"use client";

import { useEffect, useRef } from "react";
import { observeVisibility } from "@/lib/hooks";
import s from "./racelog.module.css";

/**
 * A real Extended Kalman Filter, drawn procedurally.
 * A "camera" in the corner measures range and bearing to a moving target
 * (a non-linear measurement model, hence the EKF). Noisy fixes scatter,
 * the filtered estimate stays smooth.
 */

const W = 520;
const H = 220;
const CAM = { x: 18, y: H - 16 };
const DT = 1 / 30;
const SIGMA_R = 12;
const SIGMA_B = 0.07;
const TRAIL = 170;
const DOTS = 26;

type Vec4 = [number, number, number, number];
type Mat4 = number[][];

const eye4 = (k = 1): Mat4 => [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? k : 0)));

const mul = (a: number[][], b: number[][]) =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));

const transpose = (a: number[][]) => a[0].map((_, j) => a.map((row) => row[j]));
const add = (a: number[][], b: number[][]) => a.map((row, i) => row.map((v, j) => v + b[i][j]));
const sub = (a: number[][], b: number[][]) => a.map((row, i) => row.map((v, j) => v - b[i][j]));

function inv2(m: number[][]) {
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return [
    [m[1][1] / det, -m[0][1] / det],
    [-m[1][0] / det, m[0][0] / det],
  ];
}

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function truth(t: number) {
  return {
    x: W * (0.56 + 0.36 * Math.sin(0.62 * t)),
    y: H * (0.46 + 0.3 * Math.sin(1.24 * t + 0.7)),
  };
}

function wrapAngle(a: number) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

function createFilter() {
  const start = truth(0);
  let x: Vec4 = [start.x, start.y, 0, 0];
  let P = eye4(400);
  const F: Mat4 = [
    [1, 0, DT, 0],
    [0, 1, 0, DT],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  // Tuned offline: estimate error ~9px against ~20px for the raw fixes.
  const q = 20000;
  const Q: Mat4 = [
    [(q * DT ** 4) / 4, 0, (q * DT ** 3) / 2, 0],
    [0, (q * DT ** 4) / 4, 0, (q * DT ** 3) / 2],
    [(q * DT ** 3) / 2, 0, q * DT ** 2, 0],
    [0, (q * DT ** 3) / 2, 0, q * DT ** 2],
  ];
  const R = [
    [SIGMA_R ** 2, 0],
    [0, SIGMA_B ** 2],
  ];

  return {
    step(z: [number, number]) {
      // Predict
      x = mul(F, x.map((v) => [v])).map((r) => r[0]) as Vec4;
      P = add(mul(mul(F, P), transpose(F)), Q);

      // Linearise the range/bearing model around the prediction
      const dx = x[0] - CAM.x;
      const dy = x[1] - CAM.y;
      const r2 = Math.max(dx * dx + dy * dy, 1e-6);
      const r = Math.sqrt(r2);
      const h = [r, Math.atan2(dy, dx)];
      const Hj = [
        [dx / r, dy / r, 0, 0],
        [-dy / r2, dx / r2, 0, 0],
      ];

      const y = [z[0] - h[0], wrapAngle(z[1] - h[1])];
      const S = add(mul(mul(Hj, P), transpose(Hj)), R);
      const K = mul(mul(P, transpose(Hj)), inv2(S));
      x = x.map((v, i) => v + K[i][0] * y[0] + K[i][1] * y[1]) as Vec4;
      P = mul(sub(eye4(), mul(K, Hj)), P);
      return { x: x[0], y: x[1] };
    },
  };
}

const toPath = (pts: Array<{ x: number; y: number }>) =>
  pts.length ? `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}` : "";

export default function KalmanViz({ running }: { running: boolean }) {
  const truthRef = useRef<SVGPathElement>(null);
  const estRef = useRef<SVGPathElement>(null);
  const rayRef = useRef<SVGLineElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const filter = createFilter();
    const trueTrail: Array<{ x: number; y: number }> = [];
    const estTrail: Array<{ x: number; y: number }> = [];
    const dots = Array.from(dotsRef.current?.children ?? []) as SVGCircleElement[];
    let dotIndex = 0;
    let t = 0;
    let frame = 0;
    let last = performance.now();
    let acc = 0;
    let visible = false;

    const svg = truthRef.current?.ownerSVGElement;
    const stopObserving = svg
      ? observeVisibility(svg, (v) => {
          visible = v;
          if (visible && !frame && !reduced) frame = requestAnimationFrame(loop);
        })
      : () => {};

    function simulate() {
      t += DT;
      const p = truth(t);
      const dx = p.x - CAM.x;
      const dy = p.y - CAM.y;
      const z: [number, number] = [Math.hypot(dx, dy) + gauss() * SIGMA_R, Math.atan2(dy, dx) + gauss() * SIGMA_B];
      const est = filter.step(z);

      trueTrail.push(p);
      estTrail.push(est);
      if (trueTrail.length > TRAIL) trueTrail.shift();
      if (estTrail.length > TRAIL) estTrail.shift();

      const mx = CAM.x + z[0] * Math.cos(z[1]);
      const my = CAM.y + z[0] * Math.sin(z[1]);
      const dot = dots[dotIndex++ % dots.length];
      if (dot) {
        dot.setAttribute("cx", mx.toFixed(1));
        dot.setAttribute("cy", my.toFixed(1));
      }
      dots.forEach((d, i) => {
        const age = (dotIndex - 1 - i + dots.length) % dots.length;
        d.style.opacity = String(Math.max(0, 1 - age / dots.length) * 0.9);
      });
      return { mx, my, est };
    }

    function draw(m: { mx: number; my: number; est: { x: number; y: number } }) {
      truthRef.current?.setAttribute("d", toPath(trueTrail));
      estRef.current?.setAttribute("d", toPath(estTrail));
      rayRef.current?.setAttribute("x2", m.mx.toFixed(1));
      rayRef.current?.setAttribute("y2", m.my.toFixed(1));
      headRef.current?.setAttribute("cx", m.est.x.toFixed(1));
      headRef.current?.setAttribute("cy", m.est.y.toFixed(1));
    }

    // Warm up so the first frame already shows a trail.
    let m = simulate();
    for (let i = 0; i < TRAIL; i++) m = simulate();
    draw(m);

    function loop() {
      frame = 0;
      if (!visible) return;
      const now = performance.now();
      acc += Math.min(0.1, (now - last) / 1000) * (runningRef.current ? 1 : 0.25);
      last = now;
      if (acc >= DT) {
        while (acc >= DT) {
          m = simulate();
          acc -= DT;
        }
        draw(m);
      }
      frame = requestAnimationFrame(loop);
    }

    return () => {
      stopObserving();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg className={s.kalman} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Extended Kalman Filter: noisy camera fixes and a smooth filtered track">
      <defs>
        <pattern id="kgrid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#kgrid)" />
      <line ref={rayRef} x1={CAM.x} y1={CAM.y} x2={CAM.x} y2={CAM.y} className={s.kRay} />
      <path ref={truthRef} className={s.kTruth} />
      <g ref={dotsRef}>
        {Array.from({ length: DOTS }, (_, i) => (
          <circle key={i} r="2.4" cx={-10} cy={-10} className={s.kDot} />
        ))}
      </g>
      <path ref={estRef} className={s.kEst} />
      <circle ref={headRef} r="5" cx={-10} cy={-10} className={s.kHead} />
      <g transform={`translate(${CAM.x} ${CAM.y})`} className={s.kCam}>
        <rect x="-7" y="-6" width="14" height="10" rx="2" />
        <circle cx="0" cy="-1" r="2.6" className={s.kLens} />
      </g>
    </svg>
  );
}
