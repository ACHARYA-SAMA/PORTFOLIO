import type { Game } from "../engine/game";
import type { Destruction } from "../engine/destruction";
import { PALETTE } from "../engine/config";
import { rng } from "../engine/fracture";
import { block } from "./common";
import { BRICK_TONES } from "./archetypes";
import { RING } from "./layout";

/**
 * Street furniture and things to drive through. Everything here is
 * destructible except the shelters' roofs and posts.
 */

/** A staggered brick wall. Bricks start asleep: the wall costs nothing until hit. */
export function brickWall(d: Destruction, x: number, z: number, yaw: number, cols: number, rows: number, seed = 1) {
  const r = rng(seed);
  const bw = 0.7;
  const bh = 0.35;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    const n = row % 2 === 0 ? cols : cols - 1;
    for (let c = 0; c < n; c++) {
      const lx = (c - (cols - 1) / 2) * (bw + 0.004) + offset;
      d.spawn("brick", x + lx * cos, bh / 2 + row * (bh + 0.004) + 0.002, z - lx * sin, yaw, { color: BRICK_TONES[(r() * BRICK_TONES.length) | 0], group: "wall" });
    }
  }
}

export function stack(d: Destruction, arch: string, x: number, z: number, size: number, levels: number, seed = 3) {
  const r = rng(seed);
  for (let l = 0; l < levels; l++) {
    const n = levels - l;
    for (let i = 0; i < n; i++) {
      const lx = (i - (n - 1) / 2) * (size + 0.02);
      d.spawn(arch, x + lx, size / 2 + l * (size + 0.01) + 0.003, z, (r() - 0.5) * 0.08);
    }
  }
}

function lampsAlongRing(d: Destruction) {
  const o = RING.half + RING.width / 2 + 1.6;
  for (const t of [-60, -30, 0, 30, 60]) {
    d.spawn("lamp", o, 2.6, t, -Math.PI / 2);
    d.spawn("lamp", -o, 2.6, t, Math.PI / 2);
    d.spawn("lamp", t, 2.6, -o, 0);
    d.spawn("lamp", t, 2.6, o, Math.PI);
  }
  // Spine.
  for (const z of [-84, -50]) {
    d.spawn("lamp", 8.4, 2.6, z, -Math.PI / 2);
    d.spawn("lamp", -8.4, 2.6, z, Math.PI / 2);
  }
}

function shelter(game: Game, x: number, z: number, yaw: number) {
  const d = game.destruction;
  const ctx = game.ctx;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const at = (lx: number, lz: number): [number, number] => [x + lx * cos + lz * sin, z - lx * sin + lz * cos];
  // Glass back and sides; roof and posts are solid.
  for (const lx of [-1.65, 0, 1.65]) {
    const [px, pz] = at(lx, -0.9);
    d.spawn("glass", px, 0.95, pz, yaw);
  }
  const roof = block(ctx, 5.4, 0.18, 2.4, x, 2.5, z, PALETTE.red, yaw);
  roof.castShadow = true;
  for (const [lx, lz] of [
    [-2.55, -1],
    [2.55, -1],
    [-2.55, 1],
    [2.55, 1],
  ]) {
    const [px, pz] = at(lx, lz);
    block(ctx, 0.12, 2.5, 0.12, px, 1.25, pz, PALETTE.ink, yaw);
    game.physics.cylinder(px, 1.25, pz, 1.25, 0.08);
  }
}

export function buildScenery(game: Game) {
  const d = game.destruction;
  const r = rng(42);
  lampsAlongRing(d);

  // Fences along the west arm, with gaps to slip through.
  for (const side of [-1, 1]) {
    for (let x = -94; x < -36; x += 2.45) {
      if (Math.abs(x + 68) < 6) continue; // dojo entrance
      d.spawn("fence", x, 0.45, side * 7.6, 0);
    }
  }

  // Hedges lining the pit plaza.
  for (const side of [-1, 1]) for (let z = 36; z <= 56; z += 2.3) d.spawn("hedge", side * 9.4, 0.55, z, Math.PI / 2);

  // Cones at the roundabout mouths.
  for (const [x, z] of [
    [-8, -36],
    [8, -36],
    [-8, 36],
    [8, 36],
    [-36, -8],
    [-36, 8],
    [36, -8],
    [36, 8],
  ]) {
    d.spawn("cone", x, 0.4, z, r() * 3);
  }

  // Barrel clusters on the ring corners' outer apex.
  const corner = RING.half - RING.radius * 0.29 + 12;
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    for (let i = 0; i < 5; i++) d.spawn("barrel", sx * (corner + (i % 3) * 1) + r() * 0.3, 0.53, sz * (corner + Math.floor(i / 3) * 1.1), r() * 3);
  }

  // Concrete barriers protecting junctions.
  for (const [x, z, yaw] of [
    [-14, -101, 0],
    [14, -101, 0],
    [-14, 101, 0],
    [14, 101, 0],
    [-101, -14, Math.PI / 2],
    [-101, 14, Math.PI / 2],
  ] as Array<[number, number, number]>) {
    d.spawn("barrier", x, 0.45, z, yaw);
  }

  // Signposts at junctions.
  for (const [x, z] of [
    [9, -34],
    [-9, 34],
    [-34, -9],
    [34, 9],
    [9, -96],
    [-96, 9],
  ]) {
    d.spawn("signpost", x, 1.2, z, r() * 6);
  }

  // Brick walls beside the ring: optional, very satisfying.
  brickWall(d, 40, -88.5, 0, 12, 5, 7);
  brickWall(d, -88.5, 40, Math.PI / 2, 12, 5, 9);
  brickWall(d, 88.5, -46, Math.PI / 2, 10, 4, 13);

  // Crate stacks to plough through.
  stack(d, "crate", -24, 96, 1.1, 3, 5);
  stack(d, "crate", 94, -66, 1.1, 3, 6);
  stack(d, "crate-s", -66, -96, 0.75, 4, 7);
  stack(d, "crate", 26, 30, 1.1, 2, 8);

  // Bus shelters with glass to shatter.
  shelter(game, -112.5, -40, Math.PI / 2);
  shelter(game, 112.5, 30, -Math.PI / 2);
  shelter(game, -40, 112.5, Math.PI);

}
