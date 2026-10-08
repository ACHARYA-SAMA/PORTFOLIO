import * as THREE from "three";
import { RACES, STATS } from "@/lib/content";
import { KEYS, readJSON, writeJSON } from "@/lib/progress";
import { PALETTE } from "../../engine/config";
import type { Entity } from "../../engine/destruction";
import type { Game } from "../../engine/game";
import { lambert } from "../../engine/materials";
import { pushToast, showBanner, ui } from "../../engine/store";
import { block, plaque, sign } from "../common";
import { brickWall } from "../scenery";
import type { ZoneHooks } from "./index";

const DOJO = { x: -70, z: 22 };
/** Belt colours, white to black: a generic grading ladder, no school's insignia. */
const BELTS = ["#f3f1ec", "#f2d23c", "#f08a24", "#3f8f3a", "#2f63b3", "#6b3f22", "#0d0d0d"];
const ROUND_SECONDS = 30;

export function buildDojo(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const d = game.destruction;
  const boards: Entity[] = [];

  // Racks: two posts each, three boards held between them, facing the entrance (east).
  const racks = 6;
  for (let r = 0; r < racks; r++) {
    const z = DOJO.z - 6.5 + r * 2.6;
    const x = DOJO.x - 1;
    for (const s of [-1, 1]) {
      block(ctx, 0.22, 2.3, 0.22, x, 1.15, z + s * 0.56, PALETTE.ink);
      game.physics.box(x, 1.15, z + s * 0.56, 0.11, 1.15, 0.11);
    }
    for (let k = 0; k < 3; k++) {
      boards.push(
        d.spawn("board", x, 0.5 + k * 0.62, z, Math.PI / 2, {
          group: "dojo",
          onBreak: (info) => {
            if (info.kind === "topple") return;
            game.bumpStat("boards");
            if (game.stats.boards >= 10) game.unlock("board-breaker");
            const st = ui.get().dojo;
            if (st.active) ui.set({ dojo: { ...st, boards: st.boards + 1 } });
          },
        }),
      );
    }
  }

  // Back wall and the plaque, using only the facts on the site.
  brickWall(d, DOJO.x - 5, DOJO.z, Math.PI / 2, 14, 4, 21);
  const belt = RACES.find((x) => x.variant === "belt");
  const title = STATS.find((x) => x.label === "State-level karate title");
  plaque(ctx, [belt ? `${belt.result}` : "", title ? `${title.value} · ${title.label}` : ""], DOJO.x - 4.6, 2.2, DOJO.z + 7.8, Math.PI / 2, 3.6, 1.6, {
    title: belt?.name ?? "Dojo",
    bg: PALETTE.ink,
    fg: PALETTE.cream,
    titleColor: PALETTE.signal,
    size: 64,
  });
  block(ctx, 0.16, 2.6, 3.9, DOJO.x - 4.78, 1.3, DOJO.z + 7.8, PALETTE.ink);
  game.physics.box(DOJO.x - 4.78, 1.3, DOJO.z + 7.8, 0.08, 1.3, 1.95);
  sign(ctx, "THE DOJO", DOJO.x + 2, 4.6, DOJO.z - 9.6, 0, 6, 1.2, { bg: PALETTE.red, fg: PALETTE.cream, emissive: true });
  for (const s of [-1, 1]) {
    block(ctx, 0.3, 4.4, 0.3, DOJO.x + 2 + s * 2.8, 2.2, DOJO.z - 9.8, PALETTE.ink);
    game.physics.box(DOJO.x + 2 + s * 2.8, 2.2, DOJO.z - 9.8, 0.15, 2.2, 0.15);
  }
  // Hedges close the courtyard north and south, open to the east.
  for (let i = 0; i < 6; i++) {
    d.spawn("hedge", DOJO.x - 3 + i * 2.3, 0.55, DOJO.z - 11.5, 0);
    d.spawn("hedge", DOJO.x - 3 + i * 2.3, 0.55, DOJO.z + 11.5, 0);
  }

  // Belt ladder: seven blocks that fill as boards break (during a round, or overall).
  const ladder = BELTS.map((c, i) => {
    const mat = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0, flatShading: true });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.2), mat);
    m.position.set(DOJO.x - 4.7, 0.6 + i * 0.44, DOJO.z + 10.4);
    m.rotation.y = Math.PI / 2;
    m.scale.setScalar(0.6);
    ctx.group.add(m);
    return { m, mat };
  });
  block(ctx, 0.12, 3.6, 0.8, DOJO.x - 4.85, 1.8, DOJO.z + 10.4, PALETTE.ink);
  sign(ctx, "BELT", DOJO.x - 4.6, 3.95, DOJO.z + 10.4, Math.PI / 2, 0.9, 0.3, { bg: PALETTE.ink, fg: PALETTE.cream, font: "mono", emissive: true });

  const dojoBestKey = `${KEYS.stats}:dojo-best`;
  let best = readJSON<number>(dojoBestKey, 0);
  ui.set({ dojo: { ...ui.get().dojo, best } });
  let ends = 0;
  ctx.addUpdate((dt, t) => {
    const st = ui.get().dojo;
    let brokenNow = 0;
    for (const b of boards) if (b.broken) brokenNow++;
    const fill = st.active ? st.boards / boards.length : brokenNow / boards.length;
    const filled = Math.round(fill * BELTS.length);
    ladder.forEach((l, i) => {
      const on = i < filled;
      const target = on ? 1 : 0.6;
      l.m.scale.setScalar(l.m.scale.x + (target - l.m.scale.x) * Math.min(1, dt * 10));
      l.mat.emissiveIntensity = on ? 0.45 : 0;
    });
    if (!st.active) return;
    const left = Math.max(0, ends - t);
    if (Math.ceil(left) !== Math.ceil(st.timeLeft)) ui.set({ dojo: { ...st, timeLeft: left } });
    if (left <= 0) {
      const count = st.boards;
      best = Math.max(best, count);
      writeJSON(dojoBestKey, best);
      ui.set({ dojo: { active: false, timeLeft: 0, boards: count, best } });
      showBanner(`${count} boards`);
      pushToast({ kind: "info", meta: "Break the boards", title: `${count} of ${boards.length}`, body: count >= best ? "Best yet." : `Best: ${best}` }, 3200);
      game.audio.play("achievement");
    }
  });

  game.dojo = {
    start: () => {
      if (ui.get().dojo.active) return;
      for (const b of boards) if (b.broken) d.restore(b, true);
      ends = game.time + ROUND_SECONDS;
      ui.set({ dojo: { active: true, timeLeft: ROUND_SECONDS, boards: 0, best }, panel: null });
      // Line the car up at the courtyard mouth, facing the racks.
      game.car.place(DOJO.x + 12, 1.2, DOJO.z, -Math.PI / 2);
      game.rig.snapBehind(game.car);
      showBanner("Break the boards");
      game.audio.play("chime");
    },
  };
  return {};
}
