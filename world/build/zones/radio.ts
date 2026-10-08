import * as THREE from "three";
import { FLYERS, RADIO } from "@/lib/content";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { canvasTexture, lambert, track } from "../../engine/materials";
import { FONTS, makeCanvas } from "../../engine/textures";
import { block, sign } from "../common";
import type { ZoneHooks } from "./index";

const COLS = 4;
const ROWS = 3;
const PW = 2;
const PH = 1.6;

/** A façade of destructible panels; `face(c, r)` gives each panel's front material. */
function facade(game: Game, x: number, z: number, outward: 1 | -1, face: (c: number, r: number) => THREE.Material, onBreak?: () => void) {
  const yaw = outward > 0 ? Math.PI / 2 : -Math.PI / 2;
  const plaster = lambert("#d9d1c4");
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const geo = new THREE.BoxGeometry(PW, PH, 0.25);
      // Front face (+z) samples this panel's slice of a shared canvas.
      const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
      const start = geo.groups[4].start;
      const index = geo.index!;
      for (let k = 0; k < geo.groups[4].count; k++) {
        const i = index.getX(start + k);
        uv.setXY(i, (c + uv.getX(i)) / COLS, (r + uv.getY(i)) / ROWS);
      }
      const mesh = new THREE.Mesh(geo, [plaster, plaster, plaster, plaster, face(c, r), plaster]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const lx = (c - (COLS - 1) / 2) * (PW + 0.01);
      // Local x runs along the façade: +x local is −z world when facing +x, +z world when facing −x.
      const wz = z - lx * outward;
      game.destruction.spawn("panel", x, PH / 2 + r * (PH + 0.004) + 0.002, wz, yaw, {
        object: mesh,
        group: "radio",
        onBreak: (info) => {
          if (info.kind === "topple") return;
          game.particles.emit("paper", info.pos.x, info.pos.y, info.pos.z, 14, 3.5);
          onBreak?.();
        },
      });
    }
  }
}

function core(game: Game, x: number, z: number) {
  const ctx = game.ctx;
  block(ctx, 10, 7, 10, x, 3.5, z, "#3b3534");
  game.physics.box(x, 3.5, z, 5, 3.5, 5);
  block(ctx, 10.4, 0.4, 10.4, x, 7.2, z, PALETTE.ink);
}

/* ── SQUAD: one terminal spread across the whole façade ── */

function terminal() {
  const canvas = makeCanvas(1024, 600);
  const g = canvas.getContext("2d")!;
  const tex = track(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  const squad = RADIO.find((r) => r.org === "SQUAD") ?? RADIO[0];
  const lines = [`$ whoami`, `> ${squad.org.toUpperCase()} · ${squad.orgDetail}`, `> ${squad.role}`, `> ${squad.text}`];
  const full = lines.join("\n");
  let shown = -1;
  const draw = (n: number, cursor: boolean) => {
    g.fillStyle = "#070a06";
    g.fillRect(0, 0, 1024, 600);
    // Scanlines.
    g.fillStyle = "rgba(200,255,46,0.035)";
    for (let y = 0; y < 600; y += 4) g.fillRect(0, y, 1024, 1);
    g.fillStyle = PALETTE.signal;
    g.font = `500 30px ${FONTS.mono}`;
    g.textBaseline = "top";
    const text = full.slice(0, n);
    let y = 48;
    for (const raw of text.split("\n")) {
      // Wrap long lines.
      let line = "";
      for (const word of raw.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (g.measureText(next).width > 920) {
          g.fillText(line, 52, y);
          y += 44;
          line = word;
        } else line = next;
      }
      g.fillText(line, 52, y);
      y += 52;
    }
    if (cursor) g.fillRect(52 + g.measureText(text.split("\n").pop() ?? "").width % 920 + 6, y - 52, 18, 32);
    tex.needsUpdate = true;
  };
  draw(0, true);
  return {
    material: new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    update: (t: number) => {
      // Type at ~22 chars/s, hold, clear, repeat.
      const cycle = full.length / 22 + 5;
      const local = t % cycle;
      const n = Math.min(full.length, Math.floor(local * 22));
      const cursor = Math.floor(t * 2.2) % 2 === 0;
      const key = n * 2 + (cursor ? 1 : 0);
      if (key !== shown) {
        shown = key;
        draw(n, cursor);
      }
    },
  };
}

/* ── Club Literati: placeholder flyers (TODO: add real flyer images) ── */

function flyerTexture() {
  const canvas = makeCanvas(1024, 600);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#d9d1c4";
  g.fillRect(0, 0, 1024, 600);
  const styles = [
    [PALETTE.red, PALETTE.cream],
    [PALETTE.ink, PALETTE.signal],
    [PALETTE.paper, PALETTE.ink],
    [PALETTE.signal, PALETTE.ink],
  ];
  const cw = 1024 / COLS;
  const rh = 600 / ROWS;
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 3 === 2) continue; // bare plaster between posters
      const [bg, fg] = styles[k % styles.length];
      const name = FLYERS[k % FLYERS.length];
      k++;
      const x = c * cw + 26 + ((k * 13) % 14);
      const y = (ROWS - 1 - r) * rh + 18;
      const w = cw - 52;
      const h = rh - 36;
      g.save();
      g.translate(x + w / 2, y + h / 2);
      g.rotate(((k % 5) - 2) * 0.025);
      g.fillStyle = bg;
      g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = fg;
      g.textAlign = "center";
      g.textBaseline = "middle";
      let size = 52;
      g.font = `900 ${size}px ${FONTS.display}`;
      while (g.measureText(name.toUpperCase()).width > w - 30 && size > 18) {
        size -= 2;
        g.font = `900 ${size}px ${FONTS.display}`;
      }
      g.fillText(name.toUpperCase(), 0, -10);
      g.font = `600 13px ${FONTS.mono}`;
      g.fillText("FLYER PLACEHOLDER", 0, h / 2 - 22);
      g.restore();
    }
  }
  return canvasTexture(canvas);
}

export function buildRadio(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const squadX = -17;
  const litX = 17;
  const z = -84;
  core(game, squadX - 1.5, z);
  core(game, litX + 1.5, z);
  const term = terminal();
  facade(game, squadX + 3.65, z, 1, () => term.material);
  const flyers = lambert("#ffffff", { map: flyerTexture() });
  facade(game, litX - 3.65, z, -1, () => flyers);
  const squad = RADIO.find((r) => r.org === "SQUAD");
  const lit = RADIO.find((r) => r.org === "Club Literati");
  sign(ctx, squad?.org.toUpperCase() ?? "SQUAD", squadX + 3.55, 6.4, z, Math.PI / 2, 7, 1.3, { bg: PALETTE.ink, fg: PALETTE.signal, emissive: true, sub: squad?.channel });
  sign(ctx, lit?.org.toUpperCase() ?? "CLUB LITERATI", litX - 3.55, 6.4, z, -Math.PI / 2, 7, 1.3, { bg: PALETTE.red, fg: PALETTE.cream, emissive: true, sub: lit?.channel });

  // Paper in the wind by the Literati wall.
  let next = 0;
  ctx.addUpdate((_, t) => {
    term.update(t);
    if (t > next) {
      next = t + 0.5 + Math.random() * 0.6;
      game.particles.emit("paper", litX - 6 + Math.random() * 3, 3 + Math.random() * 3, z - 6 + Math.random() * 12, 1, 0.6, -1.2, 0.2, 0.4, 0.4);
    }
  });
  return {};
}
