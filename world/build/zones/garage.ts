import * as THREE from "three";
import { PROJECTS } from "@/lib/content";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { basic, lambert } from "../../engine/materials";
import { pushToast } from "../../engine/store";
import { block, sign } from "../common";
import { GateSensor } from "./gate";
import type { ZoneHooks } from "./index";

const SHED = { x: 56, z: -66, w: 30, d: 16, h: 7 };
const project = (id: string) => PROJECTS.find((p) => p.id === id)!;

function shed(game: Game) {
  const ctx = game.ctx;
  const { x, z, w, d, h } = SHED;
  const back = z - d / 2;
  const front = z + d / 2;
  const wall = PALETTE.concrete;
  const solid = (bw: number, bh: number, bd: number, px: number, py: number, pz: number, color: string) => {
    block(ctx, bw, bh, bd, px, py, pz, color);
    game.physics.box(px, py, pz, bw / 2, bh / 2, bd / 2);
  };
  solid(0.6, h, d, x - w / 2, h / 2, z, wall);
  solid(0.6, h, d, x + w / 2, h / 2, z, wall);
  // Back wall, with the seatbelt bay left open to drive through.
  solid(10, h, 0.6, x - 10, h / 2, back, wall);
  solid(10, h, 0.6, x + 10, h / 2, back, wall);
  solid(10, 1.8, 0.6, x, h - 0.9, back, wall);
  block(ctx, w + 0.8, 0.5, d + 0.8, x, h + 0.25, z, PALETTE.ink);
  // Bay dividers (half depth) and the front fascia.
  for (const dx of [-5, 5]) solid(0.4, h, d * 0.55, x + dx, h / 2, back + d * 0.275, wall);
  block(ctx, w + 0.6, 1.2, 0.5, x, h - 0.6, front, PALETTE.red);
  for (const dx of [-15, -5, 5, 15]) solid(0.6, h - 1.2, 0.6, x + dx, (h - 1.2) / 2, front, PALETTE.ink);
  sign(ctx, "THE GARAGE", x, h + 1.4, front + 0.05, 0, 10, 1.6, { bg: PALETTE.ink, fg: PALETTE.paper, emissive: true });
}

/* ── Bay 1: Micro-Sort, a SCARA arm sorting blocks off a belt ── */

function microSort(game: Game) {
  const ctx = game.ctx;
  const bx = SHED.x - 10;
  const back = SHED.z - SHED.d / 2;
  const p = project("micro-sort");
  sign(ctx, p.title.toUpperCase(), bx, SHED.h - 0.6, SHED.z + SHED.d / 2 + 0.27, 0, 8.6, 1.1, { bg: PALETTE.red, fg: PALETTE.cream, font: "display" });
  sign(ctx, p.tags.join(" · "), bx, 3.6, back + 0.32, 0, 8, 0.5, { bg: PALETTE.ink, fg: PALETTE.signal, font: "mono", emissive: true });

  // Belt along x at the back.
  const beltZ = back + 3;
  const beltY = 0.9;
  block(ctx, 7, 0.4, 1.2, bx, beltY - 0.2, beltZ, "#2b2b2b");
  block(ctx, 7, 0.06, 1.0, bx, beltY + 0.02, beltZ, PALETTE.ink, 0, false);
  for (const sx of [-3.2, 3.2]) block(ctx, 0.2, beltY - 0.4, 1, bx + sx, (beltY - 0.4) / 2, beltZ, PALETTE.steel);
  game.physics.box(bx, beltY / 2, beltZ, 3.5, beltY / 2, 0.6);

  // Bins by colour.
  const colors = [PALETTE.red, PALETTE.signal, PALETTE.paper];
  const bins = colors.map((c, i) => {
    const g = new THREE.Group();
    const bxp = bx - 2.4 + i * 2.4;
    const bzp = beltZ + 3.3;
    g.position.set(bxp, 0, bzp);
    for (const [w, d, ox, oz] of [
      [1.3, 0.1, 0, 0.6],
      [1.3, 0.1, 0, -0.6],
      [0.1, 1.3, 0.6, 0],
      [0.1, 1.3, -0.6, 0],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), lambert(c));
      m.position.set(ox, 0.35, oz);
      g.add(m);
    }
    ctx.group.add(g);
    game.physics.box(bxp, 0.35, bzp, 0.65, 0.35, 0.65);
    return new THREE.Vector3(bxp, 0.3, bzp);
  });

  // The arm: base, two links rotating about Y, and a quill that moves up and down.
  const base = new THREE.Vector3(bx, 0, beltZ + 1.6);
  const steel = lambert(PALETTE.steel);
  const red = lambert(PALETTE.red);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.8, 12), lambert(PALETTE.ink));
  tower.position.set(base.x, 0.9, base.z);
  tower.castShadow = true;
  ctx.group.add(tower);
  game.physics.cylinder(base.x, 0.9, base.z, 0.9, 0.5);
  const L1 = 2.1;
  const L2 = 1.9;
  const j1 = new THREE.Object3D();
  j1.position.set(base.x, 1.9, base.z);
  const link1 = new THREE.Mesh(new THREE.BoxGeometry(L1, 0.28, 0.42), red);
  link1.position.x = L1 / 2;
  link1.castShadow = true;
  const j2 = new THREE.Object3D();
  j2.position.x = L1;
  const link2 = new THREE.Mesh(new THREE.BoxGeometry(L2, 0.22, 0.36), steel);
  link2.position.set(L2 / 2, 0.25, 0);
  link2.castShadow = true;
  const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), lambert(PALETTE.ink));
  quill.position.set(L2, 0, 0);
  const gripper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), red);
  gripper.position.y = -0.8;
  quill.add(gripper);
  j2.add(link2, quill);
  j1.add(link1, j2);
  ctx.group.add(j1);
  // A camera on a pole watching the belt: the project line says the vision runs on the arm, offline.
  block(ctx, 0.1, 2.6, 0.1, bx - 3.4, 1.3, beltZ - 0.8, PALETTE.ink, 0, false);
  block(ctx, 0.5, 0.3, 0.3, bx - 3.2, 2.6, beltZ - 0.6, PALETTE.ink, 0.6, false);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), basic(PALETTE.redHi, { toneMapped: false }));
  led.position.set(bx - 3.0, 2.62, beltZ - 0.45);
  ctx.group.add(led);

  // Blocks.
  const blockGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  type Block = { mesh: THREE.Mesh; color: number; state: "belt" | "held" | "drop" | "binned"; t: number; target: THREE.Vector3 };
  const blocks: Block[] = Array.from({ length: 6 }, (_, i) => {
    const mesh = new THREE.Mesh(blockGeo, lambert(colors[i % 3]));
    mesh.castShadow = true;
    mesh.position.set(bx - 3.2 - i * 1.1, beltY + 0.25, beltZ);
    ctx.group.add(mesh);
    return { mesh, color: i % 3, state: "belt", t: 0, target: new THREE.Vector3() };
  });
  const pick = new THREE.Vector3(bx + 0.6, beltY + 0.25, beltZ);

  // Planar IK in (u, v) = (x, −z); rotation.y = angle.
  const aim = new THREE.Vector3();
  let a1 = 0;
  let a2 = 0;
  let quillY = 0;
  const solve = (tx: number, tz: number) => {
    const u = tx - base.x;
    const v = -(tz - base.z);
    const d = Math.min(L1 + L2 - 0.01, Math.max(0.4, Math.hypot(u, v)));
    const c2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
    const t2 = Math.acos(Math.max(-1, Math.min(1, c2)));
    const t1 = Math.atan2(v, u) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
    return [t1, t2] as const;
  };

  let phase: "wait" | "reach" | "lower" | "lift" | "swing" | "release" | "home" = "wait";
  let held: Block | null = null;
  let timer = 0;
  const speed = 0.9;
  ctx.addUpdate((dt) => {
    timer += dt;
    // Belt: blocks advance towards the pick point.
    for (const b of blocks) {
      if (b.state === "belt" && b !== held) {
        const ahead = blocks.some((o) => o !== b && o.state === "belt" && o.mesh.position.x > b.mesh.position.x && o.mesh.position.x - b.mesh.position.x < 0.6);
        if (b.mesh.position.x < pick.x && !ahead) b.mesh.position.x = Math.min(pick.x, b.mesh.position.x + dt * speed);
      } else if (b.state === "drop") {
        b.t += dt;
        b.mesh.position.lerp(b.target, Math.min(1, dt * 7));
        if (b.t > 0.5) b.state = "binned";
      }
    }
    const arrive = (ta1: number, ta2: number, k: number) => {
      a1 += (ta1 - a1) * Math.min(1, dt * k);
      a2 += (ta2 - a2) * Math.min(1, dt * k);
      return Math.abs(ta1 - a1) < 0.01 && Math.abs(ta2 - a2) < 0.01;
    };
    switch (phase) {
      case "wait": {
        const ready = blocks.find((b) => b.state === "belt" && Math.abs(b.mesh.position.x - pick.x) < 0.01);
        quillY += (0 - quillY) * Math.min(1, dt * 6);
        if (ready) {
          held = ready;
          phase = "reach";
        }
        break;
      }
      case "reach": {
        const [t1, t2] = solve(pick.x, pick.z);
        if (arrive(t1, t2, 5)) phase = "lower";
        break;
      }
      case "lower":
        quillY += (-0.45 - quillY) * Math.min(1, dt * 8);
        if (quillY < -0.43 && held) {
          held.state = "held";
          phase = "lift";
        }
        break;
      case "lift":
        quillY += (0 - quillY) * Math.min(1, dt * 8);
        if (quillY > -0.02) phase = "swing";
        break;
      case "swing": {
        const bin = bins[held?.color ?? 0];
        const [t1, t2] = solve(bin.x, bin.z);
        if (arrive(t1, t2, 3.6)) phase = "release";
        break;
      }
      case "release":
        if (held) {
          const bin = bins[held.color];
          held.state = "drop";
          held.t = 0;
          const inBin = blocks.filter((b) => b.state === "binned" && b.color === held!.color).length;
          held.target.set(bin.x + (Math.random() - 0.5) * 0.5, 0.3 + inBin * 0.05, bin.z + (Math.random() - 0.5) * 0.5);
          game.audio.play("click");
          held = null;
        }
        phase = "home";
        break;
      case "home": {
        const [t1, t2] = solve(base.x + 2.2, base.z - 1.6);
        if (arrive(t1, t2, 4)) phase = "wait";
        break;
      }
    }
    j1.rotation.y = a1;
    j2.rotation.y = a2;
    quill.position.y = quillY;
    if (held && held.state === "held") {
      gripper.getWorldPosition(aim);
      held.mesh.position.set(aim.x, aim.y - 0.28, aim.z);
    }
    // Recycle: oldest binned block back to the start of the belt.
    const binned = blocks.filter((b) => b.state === "binned");
    if (binned.length > 3) {
      const b = binned[0];
      b.state = "belt";
      b.mesh.position.set(bx - 3.3, beltY + 0.25, beltZ);
      b.mesh.rotation.set(0, 0, 0);
    }
    led.visible = Math.sin(timer * 6) > 0;
  });
}

/* ── Bay 2: the seatbelt gate ────────────────────────────── */

function seatbelt(game: Game) {
  const ctx = game.ctx;
  const bx = SHED.x;
  const gz = SHED.z;
  const p = project("seatbelt");
  sign(ctx, p.title.toUpperCase(), bx, SHED.h - 0.6, SHED.z + SHED.d / 2 + 0.27, 0, 8.6, 1.1, { bg: PALETTE.red, fg: PALETTE.cream, font: "display" });
  // Arch.
  for (const s of [-1, 1]) {
    block(ctx, 0.5, 4.6, 0.5, bx + s * 3.4, 2.3, gz, PALETTE.ink);
    game.physics.box(bx + s * 3.4, 2.3, gz, 0.25, 2.3, 0.25);
  }
  block(ctx, 7.3, 0.5, 0.6, bx, 4.85, gz, PALETTE.ink);
  const lampMat = new THREE.MeshBasicMaterial({ color: PALETTE.paper, toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.18, 0.62), lampMat);
  lamp.position.set(bx, 4.5, gz);
  ctx.group.add(lamp);
  // The buckle: a housing with a red release button, and a tongue that slides in.
  const housing = block(ctx, 1.2, 0.5, 0.7, bx + 0.7, 5.4, gz, "#1b1b1b", 0, false);
  const button = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.34), lambert(PALETTE.red));
  button.position.set(0.1, 0.3, 0);
  housing.add(button);
  const tongue = block(ctx, 1.1, 0.12, 0.42, bx - 1.2, 5.4, gz, PALETTE.steel, 0, false);
  const strap = block(ctx, 2.2, 0.08, 0.36, bx - 2.6, 5.4, gz, PALETTE.ink, 0, false);
  void strap;
  sign(ctx, "Drive through slowly", bx, 3.6, gz + 0.33, 0, 4, 0.45, { bg: PALETTE.ink, fg: PALETTE.signal, font: "mono", emissive: true });

  const sensor = new GateSensor(bx, gz, Math.PI, 3.2);
  let clicked = 0;
  let flash = 0;
  ctx.addUpdate((dt) => {
    const pos = game.car.group.position;
    const dir = sensor.test(pos.x, pos.z);
    if (dir !== 0) {
      const slow = Math.abs(game.car.speed) < 4.2;
      if (slow) {
        clicked = 1;
        lampMat.color.set(PALETTE.signal);
        game.audio.play("click");
        window.setTimeout(() => game.audio.play("click"), 90);
        pushToast({ kind: "info", title: "Belt clicked", body: "Under 15 km/h: the gate goes green." }, 2400);
      } else {
        flash = 1.2;
        game.audio.play("error");
        pushToast({ kind: "info", title: "Too fast for the belt", body: "Come back through under 15 km/h." }, 2400);
      }
    }
    if (flash > 0) {
      flash -= dt;
      lampMat.color.set(Math.sin(flash * 20) > 0 ? PALETTE.redHi : PALETTE.paper);
      if (flash <= 0) lampMat.color.set(clicked > 0 ? PALETTE.signal : PALETTE.paper);
    }
    // Tongue slides into the buckle while clicked, eases out after a while.
    if (clicked > 0) clicked = Math.max(0, clicked - dt * 0.12);
    const target = clicked > 0 ? bx + 0.1 : bx - 1.2;
    tongue.position.x += (target - tongue.position.x) * Math.min(1, dt * 10);
    if (clicked === 0 && flash <= 0) lampMat.color.set(PALETTE.paper);
  });
}

/* ── Bay 3: recommendation pipeline, a wall of linked nodes ── */

function recsys(game: Game) {
  const ctx = game.ctx;
  const bx = SHED.x + 10;
  const back = SHED.z - SHED.d / 2 + 0.35;
  const p = project("recsys");
  sign(ctx, p.title.toUpperCase(), bx, SHED.h - 0.6, SHED.z + SHED.d / 2 + 0.27, 0, 8.6, 1.1, { bg: PALETTE.red, fg: PALETTE.cream, font: "display" });
  sign(ctx, p.tags.join(" · "), bx, 5.6, back, 0, 8, 0.45, { bg: PALETTE.ink, fg: PALETTE.signal, font: "mono", emissive: true });
  block(ctx, 8.6, 4.6, 0.12, bx, 2.9, back - 0.1, "#161616");
  const cols = 5;
  const rows = 4;
  const nodes: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; col: number }> = [];
  const geo = new THREE.SphereGeometry(0.2, 10, 8);
  const pos: THREE.Vector3[][] = [];
  for (let c = 0; c < cols; c++) {
    pos.push([]);
    const n = c === cols - 1 ? 1 : rows - (c % 2);
    for (let r = 0; r < n; r++) {
      const v = new THREE.Vector3(bx - 3.6 + c * 1.8, 2.9 + (r - (n - 1) / 2) * 1.05, back);
      pos[c].push(v);
      const mat = new THREE.MeshBasicMaterial({ color: "#3a3a3a", toneMapped: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(v);
      ctx.group.add(m);
      nodes.push({ mesh: m, mat, col: c });
    }
  }
  // Edges between neighbouring columns.
  const pts: number[] = [];
  for (let c = 0; c < cols - 1; c++) for (const a of pos[c]) for (const b of pos[c + 1]) pts.push(a.x, a.y, a.z - 0.01, b.x, b.y, b.z - 0.01);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: "#3a3a3a", transparent: true, opacity: 0.8, toneMapped: false });
  ctx.group.add(new THREE.LineSegments(lineGeo, lineMat));

  const lit = new THREE.Color(PALETTE.signal);
  const dim = new THREE.Color("#3a3a3a");
  const tmp = new THREE.Color();
  ctx.addUpdate((_, t) => {
    const car = game.car.group.position;
    const near = THREE.MathUtils.clamp(1 - (Math.hypot(car.x - bx, car.z - (back + 6)) - 4) / 14, 0, 1);
    for (const n of nodes) {
      // A wave runs left to right: retrieval feeding ranking.
      const wave = 0.5 + 0.5 * Math.sin(t * 4 - n.col * 0.9);
      tmp.copy(dim).lerp(lit, near * (0.35 + 0.65 * wave));
      n.mat.color.copy(tmp);
    }
    lineMat.color.copy(dim).lerp(lit, near * 0.6);
  });
}

/* ── Kiosks for the rest of the builds ───────────────────── */

function kiosks(game: Game) {
  const ctx = game.ctx;
  const rest = PROJECTS.filter((p) => !p.flagship);
  rest.forEach((p, i) => {
    const x = SHED.x - 13 + i * 6.5;
    const z = SHED.z + SHED.d / 2 + 9;
    block(ctx, 2.6, 2.6, 1.2, x, 1.3, z, PALETTE.ink);
    game.physics.box(x, 1.3, z, 1.3, 1.3, 0.6);
    block(ctx, 2.8, 0.25, 1.4, x, 2.72, z, PALETTE.red, 0, false);
    sign(ctx, p.title.toUpperCase(), x, 1.75, z + 0.62, 0, 2.3, 0.9, { bg: PALETTE.paper, fg: PALETTE.ink, font: "display" });
    sign(ctx, p.tags.join(" · "), x, 0.95, z + 0.62, 0, 2.3, 0.32, { bg: PALETTE.ink, fg: PALETTE.signal, font: "mono", emissive: true });
  });
  // A glass office on the east side to put a bumper through.
  for (let i = 0; i < 3; i++) game.destruction.spawn("glass", SHED.x + SHED.w / 2 + 3, 0.7, SHED.z - 2 + i * 1.65, Math.PI / 2);
  for (let i = 0; i < 2; i++) game.destruction.spawn("glass", SHED.x + SHED.w / 2 + 3.85 + i * 1.65 - 0.85, 0.7, SHED.z - 2.85, 0);
  game.destruction.spawn("crate", SHED.x - 13, 0.55, SHED.z + 2);
  game.destruction.spawn("crate", SHED.x - 11.8, 0.55, SHED.z + 2.4);
  game.destruction.spawn("barrel", SHED.x + 13.5, 0.53, SHED.z + 5);
  game.destruction.spawn("barrel", SHED.x + 12.5, 0.53, SHED.z + 6);
}

export function buildGarage(game: Game): ZoneHooks {
  shed(game);
  microSort(game);
  seatbelt(game);
  recsys(game);
  kiosks(game);
  return {};
}
