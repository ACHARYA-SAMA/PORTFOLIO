"use client";

import { useEffect, useRef } from "react";
import type * as THREE_NS from "three";
import { observeVisibility } from "@/lib/hooks";
import s from "./garage.module.css";

type Pin = { label: string; title: string };

type Props = {
  pins: Pin[];
  active: number | null;
  onPick: (index: number) => void;
};

/*
 * Rebuilt from the old R3F globe. Why the old one showed nothing: its
 * fly-in ScrollTrigger never fired (Lenis was proxied onto <body> while
 * triggers listened to window), so the group sat at y = -15, off camera,
 * at 12% opacity. This version is plain three.js: lat/long LineSegments
 * over a paper-coloured occluder, an explicit camera near/far, DPR capped
 * at 2, sized from a ResizeObserver so the canvas is never 0×0, rendering
 * only while on screen, and everything disposed on unmount.
 */

const R = 2.4;
// Abstract pin placements on a blank globe. Not geography.
const PIN_COORDS: Array<[number, number]> = [
  [16, -38],
  [-14, 74],
  [30, 168],
];

const INK = 0x0d0d0d;
const RED = 0xe3170a;
const PAPER = 0xf3f1ec;

function latLng(THREE: typeof THREE_NS, lat: number, lon: number, radius: number) {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)).multiplyScalar(radius);
}

function gridGeometry(THREE: typeof THREE_NS) {
  const pts: number[] = [];
  const seg = 120;
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let i = 0; i < seg; i++) {
      const a = latLng(THREE, lat, (i / seg) * 360, R);
      const b = latLng(THREE, lat, ((i + 1) / seg) * 360, R);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let lon = 0; lon < 360; lon += 15) {
    for (let i = 0; i < seg / 2; i++) {
      const a = latLng(THREE, -90 + (i / (seg / 2)) * 180, lon, R);
      const b = latLng(THREE, -90 + ((i + 1) / (seg / 2)) * 180, lon, R);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d;
};

export default function ProjectGlobe({ pins, active, onPick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const focusRef = useRef<(index: number | null) => void>(() => {});
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let disposed = false;
    let teardown = () => {};

    const lazy = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        lazy.disconnect();
        const THREE = await import("three");
        if (!disposed) teardown = init(THREE);
      },
      { rootMargin: "600px" },
    );
    lazy.observe(wrap);

    function init(THREE: typeof THREE_NS) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ canvas: canvas!, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0, 10.6);

      const globe = new THREE.Group();
      globe.rotation.order = "XYZ";
      scene.add(globe);

      const occluderGeo = new THREE.SphereGeometry(R * 0.994, 64, 48);
      const occluderMat = new THREE.MeshBasicMaterial({ color: PAPER });
      const occluder = new THREE.Mesh(occluderGeo, occluderMat);
      occluder.renderOrder = 0;
      globe.add(occluder);

      const grid = gridGeometry(THREE);
      const frontMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.62 });
      const backMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.09, depthTest: false });
      const front = new THREE.LineSegments(grid, frontMat);
      const back = new THREE.LineSegments(grid, backMat);
      front.renderOrder = 1;
      back.renderOrder = 2;
      globe.add(front, back);

      // A coarser triangulated shell, wireframe: true, gives the grid its "machined" weave.
      const shellGeo = new THREE.IcosahedronGeometry(R * 1.001, 3);
      const shellMat = new THREE.MeshBasicMaterial({ color: INK, wireframe: true, transparent: true, opacity: 0.07 });
      const shell = new THREE.Mesh(shellGeo, shellMat);
      shell.renderOrder = 1;
      globe.add(shell);

      // Equator ring, slightly outside the sphere
      const ringGeo = new THREE.TorusGeometry(R * 1.12, 0.006, 6, 180);
      const ringMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.35 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + 0.32;
      ring.rotation.y = 0.18;
      scene.add(ring);

      const headGeo = new THREE.SphereGeometry(0.085, 20, 16);
      const headMat = new THREE.MeshBasicMaterial({ color: RED });
      const pulseGeo = new THREE.RingGeometry(0.12, 0.15, 40);
      const stalkMat = new THREE.LineBasicMaterial({ color: RED });
      const pulseMats: THREE_NS.MeshBasicMaterial[] = [];
      const stalkGeos: THREE_NS.BufferGeometry[] = [];

      const pinObjs = PIN_COORDS.map(([lat, lon]) => {
        const base = latLng(THREE, lat, lon, R);
        const tip = latLng(THREE, lat, lon, R * 1.16);
        const stalkGeo = new THREE.BufferGeometry().setFromPoints([base, tip]);
        stalkGeos.push(stalkGeo);
        const stalk = new THREE.Line(stalkGeo, stalkMat);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.copy(tip);
        const pulseMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        pulseMats.push(pulseMat);
        const pulse = new THREE.Mesh(pulseGeo, pulseMat);
        pulse.position.copy(base.clone().multiplyScalar(1.002));
        pulse.lookAt(base.clone().multiplyScalar(2));
        globe.add(stalk, head, pulse);
        return { head, pulse, tip, lat, lon };
      });

      /* ── state ── */
      const rot = { x: 0.32, y: 0.6, vx: 0, vy: 0.0018 };
      let target: { x: number; y: number } | null = null;
      let activeIndex: number | null = null;
      let dragging = false;
      let moved = 0;
      let lastX = 0;
      let lastY = 0;
      let visible = false;
      let frame = 0;
      let w = 0;
      let h = 0;
      const start = performance.now();

      const resize = () => {
        w = wrap!.clientWidth;
        h = wrap!.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        render();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(wrap!);

      focusRef.current = (index) => {
        activeIndex = index;
        if (index === null) {
          target = null;
          return;
        }
        const [lat, lon] = PIN_COORDS[index];
        target = { x: (lat * Math.PI) / 180, y: shortestAngle(rot.y, (-lon * Math.PI) / 180) };
        rot.vx = 0;
        rot.vy = 0;
        wake();
      };

      /* ── pointer: drag to rotate, click a pin to open ── */
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const heads: THREE_NS.Object3D[] = pinObjs.map((p) => p.head);

      const pinAt = (e: PointerEvent) => {
        const b = canvas!.getBoundingClientRect();
        ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        raycaster.params.Line = { threshold: 0.1 };
        const hit = raycaster.intersectObjects(heads, false)[0];
        if (!hit) return -1;
        const index = heads.indexOf(hit.object);
        // ignore pins on the far side
        const world = pinObjs[index].tip.clone().applyMatrix4(globe.matrixWorld);
        return world.z > 0 ? index : -1;
      };

      const onDown = (e: PointerEvent) => {
        dragging = true;
        moved = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas!.setPointerCapture(e.pointerId);
        target = null;
        wake();
      };
      const onMove = (e: PointerEvent) => {
        if (dragging) {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          moved += Math.abs(dx) + Math.abs(dy);
          rot.vy = dx * 0.006;
          rot.vx = dy * 0.004;
          rot.y += rot.vy;
          rot.x = Math.max(-1.1, Math.min(1.1, rot.x + rot.vx));
          wake();
        } else if (e.pointerType === "mouse") {
          wrap!.dataset.cursor = pinAt(e) >= 0 ? "OPEN" : "DRAG";
        }
      };
      const onUp = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        canvas!.releasePointerCapture(e.pointerId);
        if (moved < 6) {
          const index = pinAt(e);
          if (index >= 0) pickRef.current(index);
        }
      };
      canvas!.addEventListener("pointerdown", onDown);
      canvas!.addEventListener("pointermove", onMove);
      canvas!.addEventListener("pointerup", onUp);
      canvas!.addEventListener("pointercancel", onUp);

      /* ── render loop, only while visible ── */
      const v3 = new THREE.Vector3();
      function render() {
        if (!w || !h) return;
        const t = (performance.now() - start) / 1000;
        globe.rotation.set(rot.x, rot.y, 0);
        globe.updateMatrixWorld();

        pinObjs.forEach((p, i) => {
          const on = i === activeIndex;
          const k = reduced ? 0.5 : (t * 0.8 + i * 0.33) % 1;
          p.pulse.scale.setScalar(1 + k * (on ? 3.2 : 2));
          pulseMats[i].opacity = (1 - k) * (on ? 0.85 : 0.45);
          p.head.scale.setScalar(on ? 1.5 : 1);

          const label = labelRefs.current[i];
          if (label) {
            v3.copy(p.tip).applyMatrix4(globe.matrixWorld);
            const facing = v3.z > 0.2;
            v3.project(camera);
            const x = (v3.x * 0.5 + 0.5) * w;
            const y = (-v3.y * 0.5 + 0.5) * h;
            label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            label.style.opacity = facing ? "1" : "0";
            label.dataset.active = String(on);
          }
        });
        renderer.render(scene, camera);
      }

      function loop() {
        frame = 0;
        if (!visible) return;
        if (target) {
          const k = reduced ? 1 : 0.09;
          rot.x += (target.x - rot.x) * k;
          rot.y += (target.y - rot.y) * k;
        } else if (!dragging) {
          rot.vx *= 0.92;
          rot.vy = rot.vy * 0.95 + (reduced ? 0 : 0.0016) * 0.05;
          rot.y += rot.vy;
          rot.x = Math.max(-1.1, Math.min(1.1, rot.x + rot.vx));
        }
        render();
        frame = requestAnimationFrame(loop);
      }

      function wake() {
        if (visible && !frame) frame = requestAnimationFrame(loop);
      }

      const stopObserving = observeVisibility(wrap!, (v) => {
        visible = v && !document.hidden;
        if (visible) wake();
      });
      const onVis = () => {
        visible = !document.hidden && visible;
        if (!document.hidden) wake();
      };
      document.addEventListener("visibilitychange", onVis);

      resize();

      return () => {
        cancelAnimationFrame(frame);
        stopObserving();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        canvas!.removeEventListener("pointerdown", onDown);
        canvas!.removeEventListener("pointermove", onMove);
        canvas!.removeEventListener("pointerup", onUp);
        canvas!.removeEventListener("pointercancel", onUp);
        [occluderGeo, grid, shellGeo, ringGeo, headGeo, pulseGeo, ...stalkGeos].forEach((g) => g.dispose());
        [occluderMat, frontMat, backMat, shellMat, ringMat, headMat, stalkMat, ...pulseMats].forEach((m) => m.dispose());
        renderer.dispose();
        focusRef.current = () => {};
      };
    }

    return () => {
      disposed = true;
      lazy.disconnect();
      teardown();
    };
  }, []);

  useEffect(() => {
    focusRef.current(active);
  }, [active]);

  return (
    <div ref={wrapRef} className={s.globe} data-cursor="DRAG">
      <canvas ref={canvasRef} className={s.globeCanvas} aria-label="Wireframe globe with one pin per flagship project. Drag to rotate." role="img" />
      {pins.map((p, i) => (
        <span
          key={p.label}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className={s.pinLabel}
          aria-hidden="true"
        >
          <b>{p.label}</b>
          <span>{p.title}</span>
        </span>
      ))}
      <span className={`label ${s.globeHint}`} aria-hidden="true">
        Drag to rotate · {pins.length} pins
      </span>
    </div>
  );
}
