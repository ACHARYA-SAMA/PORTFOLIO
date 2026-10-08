import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONTACT, CONTACT_STATUS } from "@/lib/content";
import { mailtoHref } from "@/lib/contact";
import { PORTFOLIO } from "@/lib/routes";
import { requestShutter } from "@/components/RouteShutter";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { lambert } from "../../engine/materials";
import { pushToast } from "../../engine/store";
import { block, contentPad, floatingLabel, sign } from "../common";
import type { ZoneHooks } from "./index";

type Part = { x: number; y: number; z: number; hx: number; hy: number; hz: number; rz?: number };

const S = 0.225; // half stroke
const H = 1.2; // half height
const W = 0.75; // half width
const D = 0.25; // half depth

/** A chunky block alphabet, just the letters LET'S TALK needs. */
const GLYPHS: Record<string, { w: number; parts: Part[] }> = {
  L: { w: W * 2, parts: [{ x: -W + S, y: 0, z: 0, hx: S, hy: H, hz: D }, { x: 0, y: -H + S, z: 0, hx: W, hy: S, hz: D }] },
  E: {
    w: W * 2,
    parts: [
      { x: -W + S, y: 0, z: 0, hx: S, hy: H, hz: D },
      { x: 0, y: H - S, z: 0, hx: W, hy: S, hz: D },
      { x: -0.08, y: 0, z: 0, hx: W - 0.08, hy: S, hz: D },
      { x: 0, y: -H + S, z: 0, hx: W, hy: S, hz: D },
    ],
  },
  T: { w: W * 2, parts: [{ x: 0, y: H - S, z: 0, hx: W, hy: S, hz: D }, { x: 0, y: -S, z: 0, hx: S, hy: H - S, hz: D }] },
  "'": { w: 0.5, parts: [{ x: 0, y: H - 0.5, z: 0, hx: 0.16, hy: 0.5, hz: D }] },
  S: {
    w: W * 2,
    parts: [
      { x: 0, y: H - S, z: 0, hx: W, hy: S, hz: D },
      { x: 0, y: 0, z: 0, hx: W, hy: S, hz: D },
      { x: 0, y: -H + S, z: 0, hx: W, hy: S, hz: D },
      { x: -W + S, y: (H - S) / 2, z: 0, hx: S, hy: (H - S) / 2, hz: D },
      { x: W - S, y: -(H - S) / 2, z: 0, hx: S, hy: (H - S) / 2, hz: D },
    ],
  },
  A: {
    w: W * 2,
    parts: [
      { x: -W + S, y: 0, z: 0, hx: S, hy: H, hz: D },
      { x: W - S, y: 0, z: 0, hx: S, hy: H, hz: D },
      { x: 0, y: H - S, z: 0, hx: W, hy: S, hz: D },
      { x: 0, y: 0, z: 0, hx: W - S, hy: S, hz: D },
    ],
  },
  K: {
    w: W * 2,
    parts: [
      { x: -W + S, y: 0, z: 0, hx: S, hy: H, hz: D },
      { x: 0.12, y: 0.58, z: 0, hx: 0.68, hy: S * 0.95, hz: D, rz: 0.82 },
      { x: 0.12, y: -0.58, z: 0, hx: 0.68, hy: S * 0.95, hz: D, rz: -0.82 },
    ],
  },
};

function glyphGeometry(parts: Part[]) {
  return mergeGeometries(
    parts.map((p) => {
      const g = new THREE.BoxGeometry(p.hx * 2, p.hy * 2, p.hz * 2);
      if (p.rz) g.rotateZ(p.rz);
      g.translate(p.x, p.y, p.z);
      return g;
    }),
  );
}

/** The bank card from the hero, standing up: red, chip, AA. */
function cvCard(game: Game, x: number, z: number, yaw: number) {
  const ctx = game.ctx;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const card = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.15, 0.14), lambert(PALETTE.red));
  card.position.y = 1.6;
  card.castShadow = true;
  g.add(card);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.38, 0.02), lambert("#d6b25a"));
  chip.position.set(-1.1, 1.85, 0.08);
  g.add(chip);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.6), lambert(PALETTE.ink));
  stand.position.y = 0.25;
  g.add(stand);
  ctx.group.add(g);
  game.physics.box(x, 1.4, z, 1.7, 1.4, 0.3, { y: yaw });
  // Same words as the hero card.
  sign(ctx, "AA", x + Math.cos(yaw) * 1.05 + Math.sin(yaw) * 0.08, 2.2, z - Math.sin(yaw) * 1.05 + Math.cos(yaw) * 0.08, yaw, 0.9, 0.6, { bg: PALETTE.red, fg: PALETTE.cream, font: "display" });
  sign(ctx, "ARMAN ACHARYA", x + Math.sin(yaw) * 0.08, 1.05, z + Math.cos(yaw) * 0.08, yaw, 3, 0.36, { bg: PALETTE.red, fg: PALETTE.cream, font: "mono", sub: "CSE (DS)" });
}

export function buildPitExit(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const d = game.destruction;

  // LET'S TALK, standing, knockable.
  const words = ["LET'S", "TALK"];
  const gap = 0.32;
  const z0 = 82;
  let cursor = 0;
  const layout: Array<{ ch: string; x: number; word: number }> = [];
  words.forEach((w, wi) => {
    for (const ch of w) {
      const g = GLYPHS[ch];
      layout.push({ ch, x: cursor + g.w / 2, word: wi });
      cursor += g.w + gap;
    }
    cursor += 1.1;
  });
  const total = cursor - 1.1 - gap;
  // Facing north (towards the email sign), so the word runs east to west in world x.
  const right = 60 + total / 2;
  for (const l of layout) {
    const glyph = GLYPHS[l.ch];
    const mesh = new THREE.Mesh(glyphGeometry(glyph.parts), lambert(l.word === 0 ? PALETTE.red : PALETTE.paper));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    d.spawn("letter", right - l.x, H + 0.003, z0, Math.PI, { object: mesh, compound: glyph.parts, group: "letters" });
  }

  // The email sign: drive into its apron and the address is copied.
  const sx = 60;
  const sz = 64;
  block(ctx, 9, 2.2, 0.4, sx, 2.1, sz, PALETTE.ink);
  for (const s of [-1, 1]) block(ctx, 0.3, 1.2, 0.3, sx + s * 4, 0.6, sz, PALETTE.ink);
  game.physics.box(sx, 1.6, sz, 4.5, 1.6, 0.2);
  sign(ctx, CONTACT.email, sx, 2.35, sz + 0.21, 0, 8.4, 1.0, { bg: PALETTE.ink, fg: PALETTE.cream, font: "mono", emissive: true });
  sign(ctx, "Drive in to copy", sx, 1.55, sz + 0.21, 0, 8.4, 0.4, { bg: PALETTE.ink, fg: PALETTE.signal, font: "mono", emissive: true });
  sign(ctx, CONTACT_STATUS, sx, 3.6, sz + 0.21, 0, 9, 0.5, { bg: PALETTE.paper, fg: PALETTE.ink, font: "serif" });
  let armed = true;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.email);
      pushToast({ kind: "label", meta: "Copied", title: CONTACT.email, body: "Paste it anywhere." }, 3000);
      game.audio.play("tick");
    } catch {
      pushToast({ kind: "info", title: "Couldn’t reach the clipboard", body: "Press E here to write an email instead." }, 3000);
    }
  };
  ctx.addUpdate(() => {
    const p = game.car.group.position;
    const inApron = Math.abs(p.x - sx) < 4.6 && p.z > sz && p.z < sz + 3.4;
    if (inApron && armed) {
      armed = false;
      void copy();
    } else if (!inApron && p.z > sz + 6) armed = true;
  });
  game.contexts.push({ x: sx, z: sz + 2, r: 3.4, label: "Write an email", run: () => window.location.assign(mailtoHref()) });

  // LinkedIn and GitHub as drivable pads; E opens them (inside the key press, so pop-up blockers allow it).
  const links: Array<[string, string, number]> = [
    ["LinkedIn ↗", CONTACT.linkedin.href, 54],
    ["GitHub ↗", CONTACT.github.href, 66],
  ];
  for (const [label, href, x] of links) {
    const z = 72;
    const pad = contentPad(ctx, x, z, 2.6, PALETTE.paper);
    floatingLabel(ctx, label, x, 3, z, { width: 4, sub: "Press E", fg: PALETTE.paper });
    ctx.addUpdate(() => {
      const p = game.car.group.position;
      pad.setActive(Math.hypot(p.x - x, p.z - z) < 2.6);
    });
    game.contexts.push({ x, z, r: 2.6, label: `Open ${label}`, run: () => window.open(href, "_blank", "noopener,noreferrer") });
  }

  // The CV card.
  cvCard(game, 45, 76, Math.PI / 2);
  game.contexts.push({
    x: 48,
    z: 76,
    r: 3.2,
    label: "Open the CV",
    run: () => {
      window.dispatchEvent(new CustomEvent("aa:world-leave"));
      requestShutter(`${PORTFOLIO}/cv`, 200);
    },
  });
  return {};
}
