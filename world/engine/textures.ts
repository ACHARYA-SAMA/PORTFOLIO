import * as THREE from "three";
import { CHARSET, FACE_OFFSETS, backOut, charAt, padText } from "@/lib/drums";
import { canvasTexture } from "./materials";
import { PALETTE } from "./config";

/* ── Fonts: the site's own faces, by the family names next/font registered ── */

const fontVar = (name: string, fallback: string) => {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export const FONTS = {
  get display() {
    return fontVar("--font-archivo", "Arial Narrow, sans-serif");
  },
  get mono() {
    return fontVar("--font-jetbrains", "ui-monospace, monospace");
  },
  get serif() {
    return fontVar("--font-instrument", "Georgia, serif");
  },
};

/** Wait for the faces canvas text needs (they are already on the page via next/font). */
export async function loadCanvasFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`900 64px ${FONTS.display}`),
      document.fonts.load(`500 32px ${FONTS.mono}`),
      document.fonts.load(`italic 400 32px ${FONTS.serif}`),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
}

function ctx2d(canvas: HTMLCanvasElement) {
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2d canvas unavailable");
  return c;
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function condensed(c: CanvasRenderingContext2D) {
  // Archivo's width axis; Chrome/Safari honour fontStretch on canvas.
  try {
    (c as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = "condensed";
  } catch {
    /* unsupported */
  }
}

/* ── Labels ───────────────────────────────────────────────── */

type LabelOpts = { bg?: string; fg?: string; width?: number; height?: number; size?: number; font?: "mono" | "display" | "serif"; border?: string; sub?: string; subColor?: string; align?: "center" | "left"; padding?: number; radius?: number };

/** A plate of text: mono label, display word or serif line, with an optional sub line. */
export function labelTexture(text: string, o: LabelOpts = {}) {
  const w = o.width ?? 512;
  const h = o.height ?? 128;
  const canvas = makeCanvas(w, h);
  const c = ctx2d(canvas);
  if (o.bg) {
    c.fillStyle = o.bg;
    const r = o.radius ?? 0;
    c.beginPath();
    c.roundRect(0, 0, w, h, r);
    c.fill();
  }
  if (o.border) {
    c.strokeStyle = o.border;
    c.lineWidth = Math.max(4, h * 0.04);
    c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, w - c.lineWidth, h - c.lineWidth);
  }
  const font = o.font ?? "mono";
  let size = o.size ?? (font === "display" ? h * 0.72 : h * 0.34);
  const face =
    font === "display" ? `900 ${size}px ${FONTS.display}` : font === "serif" ? `italic 400 ${size}px ${FONTS.serif}` : `600 ${size}px ${FONTS.mono}`;
  c.font = face;
  if (font === "display") condensed(c);
  const pad = o.padding ?? w * 0.06;
  const shown = font === "serif" ? text : text.toUpperCase();
  // Shrink to fit.
  while (c.measureText(shown).width > w - pad * 2 && size > 8) {
    size *= 0.92;
    c.font = font === "display" ? `900 ${size}px ${FONTS.display}` : font === "serif" ? `italic 400 ${size}px ${FONTS.serif}` : `600 ${size}px ${FONTS.mono}`;
  }
  c.fillStyle = o.fg ?? PALETTE.ink;
  c.textAlign = o.align === "left" ? "left" : "center";
  c.textBaseline = "middle";
  if (font === "mono") (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(size * 0.14)}px`;
  const x = o.align === "left" ? pad : w / 2;
  const y = o.sub ? h * 0.4 : h * 0.52;
  c.fillText(shown, x, y);
  if (o.sub) {
    const s = size * 0.42;
    c.font = `500 ${s}px ${FONTS.mono}`;
    (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(s * 0.12)}px`;
    c.fillStyle = o.subColor ?? o.fg ?? PALETTE.ink;
    c.globalAlpha = 0.75;
    c.fillText(o.sub.toUpperCase(), x, h * 0.76);
    c.globalAlpha = 1;
  }
  return canvasTexture(canvas);
}

/** Word-wrapped serif or mono copy on a plate (signs, plaques, terminal). */
export function paragraphTexture(lines: string[], o: { width?: number; height?: number; bg?: string; fg?: string; font?: "serif" | "mono"; size?: number; title?: string; titleColor?: string } = {}) {
  const w = o.width ?? 1024;
  const h = o.height ?? 512;
  const canvas = makeCanvas(w, h);
  const c = ctx2d(canvas);
  c.fillStyle = o.bg ?? PALETTE.paper;
  c.fillRect(0, 0, w, h);
  const pad = w * 0.06;
  let y = pad;
  if (o.title) {
    c.fillStyle = o.titleColor ?? PALETTE.red;
    c.font = `600 ${h * 0.06}px ${FONTS.mono}`;
    (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(h * 0.01)}px`;
    c.textBaseline = "top";
    c.fillText(o.title.toUpperCase(), pad, y);
    y += h * 0.12;
    (c as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  }
  const size = o.size ?? h * 0.075;
  c.font = o.font === "mono" ? `500 ${size}px ${FONTS.mono}` : `400 ${size}px ${FONTS.serif}`;
  c.fillStyle = o.fg ?? PALETTE.ink;
  c.textBaseline = "top";
  for (const para of lines) {
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (c.measureText(next).width > w - pad * 2 && line) {
        c.fillText(line, pad, y);
        y += size * 1.25;
        line = word;
      } else line = next;
    }
    if (line) {
      c.fillText(line, pad, y);
      y += size * 1.25;
    }
    y += size * 0.5;
  }
  return canvasTexture(canvas);
}

/* ── Canvas drums: the site's odometer, drawn for 3D ─────────────
   Same model as lib/drums.ts: a face at offset `o` from the drum's float
   position sits at a = (o − frac)·34°, moved by R·sin(a), squashed by cos(a),
   R = h / (2·sin 17°). Rolls always go forward with the same back-out ease. */

const STEP_RAD = (34 * Math.PI) / 180;
const RADIUS = 1 / (2 * Math.sin((17 * Math.PI) / 180));

type DrumTween = { from: number; to: number; start: number; duration: number };

export class CanvasDrums {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private c: CanvasRenderingContext2D;
  private pos: number[];
  private tweens: Array<DrumTween | null>;
  private dirty = true;
  private charset: string;

  constructor(
    readonly count: number,
    initial = "",
    opts: { cell?: number; charset?: string; face?: string; ink?: string; housing?: string } = {},
  ) {
    const cell = opts.cell ?? 96;
    this.charset = opts.charset ?? CHARSET;
    this.face = opts.face ?? PALETTE.paper;
    this.ink = opts.ink ?? PALETTE.ink;
    this.housing = opts.housing ?? "#050505";
    this.cellW = Math.round(cell * 0.74);
    this.cellH = Math.round(cell * 1.62);
    this.faceH = cell;
    this.gap = Math.max(2, Math.round(cell * 0.04));
    this.canvas = makeCanvas(this.count * (this.cellW + this.gap) + this.gap, this.cellH + this.gap * 2);
    this.c = ctx2d(this.canvas);
    this.texture = canvasTexture(this.canvas);
    const padded = padText(initial, count);
    this.pos = padded.split("").map((ch) => Math.max(0, this.charset.indexOf(ch)));
    this.tweens = new Array(count).fill(null);
    this.draw();
  }

  private face: string;
  private ink: string;
  private housing: string;
  private cellW: number;
  private cellH: number;
  private faceH: number;
  private gap: number;

  get text() {
    return this.pos.map((p) => charAt(this.charset, Math.round(p))).join("");
  }

  set(text: string) {
    const padded = padText(text, this.count);
    this.pos = padded.split("").map((ch) => Math.max(0, this.charset.indexOf(ch)));
    this.tweens.fill(null);
    this.dirty = true;
  }

  /** Forward roll to `text`, staggered left to right. `now` in seconds. */
  roll(text: string, now: number, stagger = 0.07, extraTurns = 0) {
    const padded = padText(text, this.count);
    const n = this.charset.length;
    for (let i = 0; i < this.count; i++) {
      const target = Math.max(0, this.charset.indexOf(padded[i]));
      const from = this.pos[i];
      const base = Math.ceil(from - 0.001);
      const to = base + (((target - base) % n) + n) % n + extraTurns * n;
      if (to - from < 0.001) continue;
      const distance = to - from;
      this.tweens[i] = { from, to, start: now + i * stagger, duration: Math.min(0.6 + 0.022 * distance, 2.2) };
    }
  }

  /** Advance tweens; redraws the canvas only when something moved. */
  update(now: number) {
    let moving = false;
    for (let i = 0; i < this.count; i++) {
      const tw = this.tweens[i];
      if (!tw) continue;
      const t = (now - tw.start) / tw.duration;
      if (t >= 1) {
        this.pos[i] = tw.to % this.charset.length;
        this.tweens[i] = null;
      } else if (t > 0) {
        this.pos[i] = tw.from + (tw.to - tw.from) * backOut(t, 1.35);
      }
      moving = true;
      this.dirty = true;
    }
    if (this.dirty) {
      this.draw();
      this.dirty = false;
      this.texture.needsUpdate = true;
    }
    return moving;
  }

  private draw() {
    const c = this.c;
    const { cellW, cellH, faceH, gap } = this;
    c.fillStyle = this.housing;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const fontSize = faceH * 0.9;
    for (let i = 0; i < this.count; i++) {
      const x = gap + i * (cellW + gap);
      const y = gap;
      c.save();
      c.beginPath();
      c.rect(x, y, cellW, cellH);
      c.clip();
      c.fillStyle = this.face;
      c.fillRect(x, y, cellW, cellH);
      const p = this.pos[i];
      const whole = Math.floor(p);
      const frac = p - whole;
      c.fillStyle = this.ink;
      c.font = `900 ${fontSize}px ${FONTS.display}`;
      condensed(c);
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (const o of FACE_OFFSETS) {
        const a = (o - frac) * STEP_RAD;
        if (Math.abs(a) >= Math.PI / 2) continue;
        const cy = y + cellH / 2 + RADIUS * Math.sin(a) * faceH;
        const sy = Math.cos(a);
        c.save();
        c.translate(x + cellW / 2, cy);
        c.scale(1, sy);
        c.fillText(charAt(this.charset, whole + o), 0, faceH * 0.04);
        c.restore();
      }
      // The cylinder's shading, as in .drum__shade.
      const g = c.createLinearGradient(0, y, 0, y + cellH);
      g.addColorStop(0, "rgba(0,0,0,0.62)");
      g.addColorStop(0.17, "rgba(0,0,0,0.22)");
      g.addColorStop(0.36, "rgba(0,0,0,0.02)");
      g.addColorStop(0.47, "rgba(255,255,255,0.2)");
      g.addColorStop(0.55, "rgba(255,255,255,0.04)");
      g.addColorStop(0.66, "rgba(0,0,0,0.03)");
      g.addColorStop(0.83, "rgba(0,0,0,0.24)");
      g.addColorStop(1, "rgba(0,0,0,0.68)");
      c.fillStyle = g;
      c.fillRect(x, y, cellW, cellH);
      c.restore();
    }
  }
}
