"use client";

import { useEffect, useRef } from "react";
import { ZONES } from "@/lib/zones";
import { ISLAND, PALETTE } from "../engine/config";
import { telemetry, useUI } from "../engine/store";
import { paintRoads } from "../build/island";
import { REBUILD_PAD, RUSH_PAD, ZONE_LAYOUT } from "../build/layout";
import s from "./hud.module.css";

const SIZE = 168;
const RANGE = 75; // metres from the centre to the rim

/** Circular minimap: roads, zone pins with labels, heading-up, the car as an arrow. */
export default function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  const bolts = useUI((st) => st.bolts);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const c = canvas.getContext("2d")!;
    // Roads, painted once at map scale.
    const mapPx = 1024;
    const map = document.createElement("canvas");
    map.width = mapPx;
    map.height = mapPx;
    const m = map.getContext("2d")!;
    m.fillStyle = "#1b1514";
    m.fillRect(0, 0, mapPx, mapPx);
    paintRoads(m, mapPx, { detail: false });
    const scale = (SIZE / 2 / RANGE) * dpr; // px per metre
    const mapScale = mapPx / (ISLAND.half * 2);
    const monoFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains") || "monospace";
    let raf = 0;
    let frame = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (frame++ % 2) return;
      const { x, z, heading } = telemetry;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.beginPath();
      c.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - dpr, 0, Math.PI * 2);
      c.clip();
      c.fillStyle = PALETTE.water;
      c.fillRect(0, 0, canvas.width, canvas.height);
      // World → map: car at the centre, heading up (car faces +z at yaw 0, so rotate by heading + π).
      c.translate(canvas.width / 2, canvas.height / 2);
      c.rotate(heading + Math.PI);
      c.scale(scale / mapScale, scale / mapScale);
      c.translate(-(x + ISLAND.half) * mapScale, -(z + ISLAND.half) * mapScale);
      c.drawImage(map, 0, 0);
      c.restore();

      // Pins (drawn upright).
      const pin = (px: number, pz: number, color: string, label?: string) => {
        const dx = px - x;
        const dz = pz - z;
        const a = -(heading + Math.PI);
        let rx = (dx * Math.cos(a) + dz * Math.sin(a)) * scale;
        let ry = (-dx * Math.sin(a) + dz * Math.cos(a)) * scale;
        const r = Math.hypot(rx, ry);
        const max = canvas.width / 2 - 8 * dpr;
        const edge = r > max;
        if (edge) {
          rx = (rx / r) * max;
          ry = (ry / r) * max;
        }
        c.setTransform(1, 0, 0, 1, canvas.width / 2 + rx, canvas.height / 2 + ry);
        c.fillStyle = color;
        c.beginPath();
        c.arc(0, 0, (edge ? 3.2 : 4.4) * dpr, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = PALETTE.ink;
        c.lineWidth = 1.5 * dpr;
        c.stroke();
        if (label && !edge) {
          c.font = `600 ${8 * dpr}px ${monoFamily}`;
          c.fillStyle = PALETTE.cream;
          c.textAlign = "center";
          c.fillText(label, 0, -7 * dpr);
        }
      };
      for (const z0 of ZONE_LAYOUT) {
        const lbl = ZONES.find((q) => q.id === z0.id)?.label.replace(/^The /, "").toUpperCase();
        pin(z0.pad.x, z0.pad.z, PALETTE.signal, lbl);
      }
      pin(REBUILD_PAD.x, REBUILD_PAD.z, PALETTE.paper);
      pin(RUSH_PAD.x, RUSH_PAD.z, PALETTE.red);

      // The car: an arrow pointing up.
      c.setTransform(1, 0, 0, 1, canvas.width / 2, canvas.height / 2);
      c.fillStyle = PALETTE.red;
      c.strokeStyle = PALETTE.cream;
      c.lineWidth = 1.6 * dpr;
      c.beginPath();
      c.moveTo(0, -8 * dpr);
      c.lineTo(5.5 * dpr, 6 * dpr);
      c.lineTo(0, 3 * dpr);
      c.lineTo(-5.5 * dpr, 6 * dpr);
      c.closePath();
      c.fill();
      c.stroke();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={s.minimap}>
      <canvas ref={ref} className={s.mapCanvas} style={{ width: SIZE, height: SIZE }} role="img" aria-label="Minimap: zone pins around the island, your car in the centre, heading up." />
      <span className={`label ${s.bolts}`}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill={PALETTE.signal} />
          <circle cx="12" cy="12" r="3.6" fill={PALETTE.ink} />
        </svg>
        {bolts} / 40 bolts
      </span>
    </div>
  );
}
