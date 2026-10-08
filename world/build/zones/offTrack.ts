import * as THREE from "three";
import { OFF_TRACK_FACTS } from "@/lib/content";
import { PALETTE } from "../../engine/config";
import type { Entity } from "../../engine/destruction";
import type { Game } from "../../engine/game";
import { lambert } from "../../engine/materials";
import { pushToast, showBanner } from "../../engine/store";
import { block, sign } from "../common";
import { RAMPS } from "../layout";
import { GateSensor } from "./gate";
import type { ZoneHooks } from "./index";

const ZONE = { x: -60, z: 68 };

/** An arcade cabinet: plain-text title, the stunt it sets. No logos, no game art. */
function cabinet(game: Game, x: number, z: number, yaw: number, title: string, stunt: string) {
  const ctx = game.ctx;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 1.1), lambert(PALETTE.ink));
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.36, 1.16), lambert(PALETTE.red));
  top.position.y = 2.42;
  g.add(top);
  ctx.group.add(g);
  game.physics.box(x, 1.15, z, 0.65, 1.15, 0.55, { y: yaw });
  const fx = x + Math.sin(yaw) * 0.56;
  const fz = z + Math.cos(yaw) * 0.56;
  sign(ctx, title, fx, 1.75, fz, yaw, 1.1, 0.7, { bg: "#0b0b0b", fg: PALETTE.signal, font: "display", emissive: true, sub: stunt });
}

function motorbike(game: Game, x: number, z: number) {
  // An original silhouette from primitives: two wheels, a frame, a tank and a seat. No maker's marks.
  const ctx = game.ctx;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = 0.6;
  const ink = lambert("#1a1a1a");
  const steel = lambert(PALETTE.steel);
  for (const s of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 18), ink);
    wheel.position.set(0, 0.54, s * 0.78);
    wheel.rotation.y = Math.PI / 2;
    wheel.castShadow = true;
    g.add(wheel);
  }
  const bar = (a: [number, number, number], b: [number, number, number], r = 0.05, m = steel) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const geo = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 6);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.copy(va).add(vb).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.add(mesh);
  };
  bar([0, 0.54, -0.78], [0, 1.0, -0.2]);
  bar([0, 1.0, -0.2], [0, 1.05, 0.5]);
  bar([0, 1.05, 0.5], [0, 0.54, 0.78], 0.045);
  bar([0, 0.54, -0.78], [0, 0.55, 0.15]);
  bar([0, 1.25, 0.62], [0, 0.54, 0.78], 0.04);
  bar([-0.35, 1.3, 0.62], [0.35, 1.3, 0.62], 0.03, ink);
  const tank = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.6), lambert(PALETTE.red));
  tank.position.set(0, 1.12, 0.22);
  tank.castShadow = true;
  g.add(tank);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.55), ink);
  seat.position.set(0, 1.08, -0.3);
  g.add(seat);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), lambert(PALETTE.cream, { emissive: PALETTE.cream, emissiveIntensity: 0.6 }));
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(0, 1.18, 0.74);
  g.add(lamp);
  ctx.group.add(g);
}

export function buildOffTrack(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const d = game.destruction;
  const games = OFF_TRACK_FACTS.games;
  const cleared = new Set<number>();
  const clear = (i: number, what: string) => {
    if (cleared.has(i)) return;
    cleared.add(i);
    showBanner(`${games[i]} · cleared`);
    pushToast({ kind: "info", meta: "Off the track", title: what, body: `Cabinet ${i + 1} of ${games.length}` }, 2800);
    game.audio.play("achievement");
    game.addScore(250);
  };

  // Arcade corner: four cabinets in a row, facing the road.
  const stunts = ["Knock the pyramid", "Jump the ramp", "Run the slalom", "Speed gate"];
  games.forEach((title, i) => cabinet(game, ZONE.x - 8 + i * 2.2, ZONE.z - 9, 0, title, stunts[i]));
  block(ctx, 10, 0.12, 3, ZONE.x - 4.7, 0.06, ZONE.z - 8.6, "#2a2a2a", 0, false);

  // Jukebox: shows the line, plays nothing.
  block(ctx, 1.4, 2, 0.9, ZONE.x + 2, 1, ZONE.z - 9, PALETTE.red);
  game.physics.box(ZONE.x + 2, 1, ZONE.z - 9, 0.7, 1, 0.45);
  sign(ctx, OFF_TRACK_FACTS.music, ZONE.x + 2, 1.35, ZONE.z - 8.53, 0, 1.25, 0.5, { bg: PALETTE.ink, fg: PALETTE.cream, font: "mono", emissive: true, sub: "Jukebox · no audio" });

  // 1 · Can pyramid on a plinth.
  const cans: Entity[] = [];
  const px = ZONE.x - 8;
  const pz = ZONE.z - 2;
  block(ctx, 3.2, 0.6, 1.4, px, 0.3, pz, PALETTE.concreteDark);
  game.physics.box(px, 0.3, pz, 1.6, 0.3, 0.7);
  for (let row = 0; row < 4; row++) {
    const n = 4 - row;
    for (let i = 0; i < n; i++) cans.push(d.spawn("can", px + (i - (n - 1) / 2) * 0.4, 0.6 + 0.251 + row * 0.505, pz, 0, { group: "cans" }));
  }
  ctx.addUpdate(() => {
    if (cleared.has(0)) return;
    let down = 0;
    for (const c of cans) if (c.broken || c.currPos.distanceToSquared(c.homePos) > 0.6) down++;
    if (down === cans.length) clear(0, "Pyramid down");
  });

  // 2 · Ramp jump: the off-track kicker, land 15 m+ away.
  const ramp = RAMPS[2];
  sign(ctx, "JUMP: 15 M+", ramp[0] - 4, 3.2, ramp[1] - 5, Math.PI / 2, 2.6, 0.7, { bg: PALETTE.signal, fg: PALETTE.ink, font: "display" });
  let takeoff: THREE.Vector3 | null = null;
  ctx.addUpdate(() => {
    const car = game.car;
    const pos = car.group.position;
    if (car.grounded === 0 && !takeoff && Math.hypot(pos.x - (ramp[0] - 8), pos.z - ramp[1]) < 9) takeoff = pos.clone();
    if (takeoff && car.grounded > 2) {
      const dist = Math.hypot(pos.x - takeoff.x, pos.z - takeoff.z);
      if (dist >= 15) clear(1, `${dist.toFixed(1)} m`);
      takeoff = null;
    }
  });

  // 3 · Slalom: six cones, start and finish lines, eight seconds, no cone down.
  // West of the ramp landing, so a jump never lands in it.
  const sx = ZONE.x - 16;
  const slalom: Entity[] = [];
  for (let i = 0; i < 6; i++) slalom.push(d.spawn("cone", sx + (i % 2 ? 1.6 : -1.6), 0.4, ZONE.z - 6 + i * 4, 0, { group: "slalom" }));
  const start = new GateSensor(sx, ZONE.z - 9, 0, 3.5);
  const finish = new GateSensor(sx, ZONE.z + 18, 0, 3.5);
  sign(ctx, "SLALOM · 8 S", sx, 2.4, ZONE.z - 9.5, Math.PI, 2.6, 0.6, { bg: PALETTE.ink, fg: PALETTE.cream, font: "mono", emissive: true });
  let slalomAt = -1;
  ctx.addUpdate((_, t) => {
    const p = game.car.group.position;
    if (start.test(p.x, p.z) > 0) slalomAt = t;
    if (slalomAt >= 0 && finish.test(p.x, p.z) > 0) {
      const time = t - slalomAt;
      const clean = slalom.every((c) => !c.toppled && c.currPos.distanceToSquared(c.homePos) < 0.2);
      if (time <= 8 && clean) clear(2, `${time.toFixed(1)} s, clean`);
      else pushToast({ kind: "info", meta: "Slalom", title: clean ? `${time.toFixed(1)} s` : "Cone down", body: "Under 8 s with every cone standing." }, 2400);
      slalomAt = -1;
    }
    if (slalomAt >= 0 && t - slalomAt > 20) slalomAt = -1;
  });

  // 4 · Speed gate on the ring's south straight: 90 km/h or more.
  const gx = -60;
  const gz = 100;
  for (const s of [-1, 1]) {
    block(ctx, 0.4, 5, 0.4, gx, 2.5, gz + s * 7.2, PALETTE.ink);
    game.physics.box(gx, 2.5, gz + s * 7.2, 0.2, 2.5, 0.2);
  }
  sign(ctx, "SPEED GATE · 90", gx, 5.3, gz, Math.PI / 2, 14.8, 1, { bg: PALETTE.red, fg: PALETTE.cream, emissive: true });
  const speedGate = new GateSensor(gx, gz, Math.PI / 2, 7);
  ctx.addUpdate(() => {
    const p = game.car.group.position;
    if (speedGate.test(p.x, p.z) !== 0) {
      const kmh = Math.abs(game.car.speed) * 3.6;
      if (kmh >= 90) clear(3, `${Math.round(kmh)} km/h`);
      else pushToast({ kind: "info", meta: "Speed gate", title: `${Math.round(kmh)} km/h`, body: "Needs 90." }, 1800);
    }
  });

  // The bike garage.
  const bgx = ZONE.x + 12;
  const bgz = ZONE.z + 2;
  block(ctx, 6, 0.3, 5, bgx, 3.6, bgz, PALETTE.ink);
  for (const [ox, oz] of [
    [-2.8, -2.3],
    [2.8, -2.3],
    [-2.8, 2.3],
    [2.8, 2.3],
  ]) {
    block(ctx, 0.2, 3.6, 0.2, bgx + ox, 1.8, bgz + oz, PALETTE.steel);
    game.physics.box(bgx + ox, 1.8, bgz + oz, 0.1, 1.8, 0.1);
  }
  motorbike(game, bgx, bgz);
  // The rides fact names a manufacturer, so it stays in the panel text, not on the scenery.
  sign(ctx, "BIKE GARAGE", bgx, 3.1, bgz - 2.55, Math.PI, 3.2, 0.5, { bg: PALETTE.paper, fg: PALETTE.ink, font: "mono" });

  return {
    onRebuild: () => {
      // Challenges can be run again after a rebuild.
      cleared.delete(0);
      cleared.delete(2);
    },
  };
}
