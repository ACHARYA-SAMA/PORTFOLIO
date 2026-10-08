import { PALETTE, RUSH_SECONDS } from "../../engine/config";
import type { Entity } from "../../engine/destruction";
import type { Game } from "../../engine/game";
import { rng } from "../../engine/fracture";
import { pushToast, showBanner, ui } from "../../engine/store";
import { sign } from "../common";
import { BRICK_TONES } from "../archetypes";
import { ARENA, RUSH_PAD } from "../layout";

/**
 * DEMOLITION RUSH: sixty seconds, a packed arena, best score kept locally.
 * Everything spawned for the round is temporary and removed afterwards.
 */
export function buildArena(game: Game) {
  const d = game.destruction;
  sign(game.ctx, "DEMOLITION RUSH", 0, 2.1, ARENA.half + 0.55, 0, 9, 1.2, { bg: PALETTE.red, fg: PALETTE.cream, emissive: true });
  let spawned: Entity[] = [];
  let ends = 0;
  let active = false;

  const fill = () => {
    const r = rng(Math.floor(game.time * 1000));
    const dense = game.tier === "high" ? 1 : game.tier === "medium" ? 0.75 : 0.5;
    const out: Entity[] = [];
    const tmp = { temp: true, group: "rush" } as const;
    // Crate pyramids.
    for (let k = 0; k < Math.round(6 * dense); k++) {
      const cx = -12 + (k % 3) * 12 + (r() - 0.5) * 3;
      const cz = -10 + Math.floor(k / 3) * 9 + (r() - 0.5) * 2;
      for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) out.push(d.spawn("tower-block", cx + (i - (2 - l) / 2) * 1.24, 0.3 + l * 0.61, cz, 0, tmp));
    }
    // Brick towers.
    for (let k = 0; k < Math.round(4 * dense); k++) {
      const tx = -13 + k * 8.5;
      const tz = 8 + (r() - 0.5) * 4;
      for (let l = 0; l < 7; l++) {
        out.push(d.spawn("brick", tx - 0.36, 0.175 + l * 0.354, tz, (l % 2) * Math.PI / 2, { ...tmp, color: BRICK_TONES[(r() * 4) | 0] }));
        out.push(d.spawn("brick", tx + 0.36, 0.175 + l * 0.354, tz, (l % 2) * Math.PI / 2, { ...tmp, color: BRICK_TONES[(r() * 4) | 0] }));
      }
    }
    // A row of glass.
    for (let i = 0; i < Math.round(8 * dense); i++) out.push(d.spawn("glass", -12 + i * 1.7, 0.66, -15, 0, tmp));
    // Barrels in the gaps.
    for (let i = 0; i < Math.round(10 * dense); i++) out.push(d.spawn("barrel", -14 + r() * 28, 0.53, -4 + r() * 8, r() * 3, tmp));
    return out;
  };

  const finish = () => {
    active = false;
    const score = ui.get().rush.score;
    game.maxStat("bestRush", score);
    const best = game.stats.bestRush;
    ui.set({ rush: { active: false, timeLeft: 0, score, best } });
    showBanner(`${score} points`);
    pushToast({ kind: "info", meta: "Demolition rush", title: `${score} points`, body: score >= best ? "Best yet." : `Best: ${best}` }, 3600);
    game.audio.play("achievement");
    for (const e of spawned) d.despawn(e);
    spawned = [];
    d.clearDebris();
  };

  game.ctx.addUpdate((_, t) => {
    if (!active) return;
    const left = Math.max(0, ends - t);
    const st = ui.get().rush;
    if (Math.ceil(left) !== Math.ceil(st.timeLeft)) ui.set({ rush: { ...st, timeLeft: left } });
    if (left <= 0) finish();
  });

  game.rush = {
    active: () => active,
    start: () => {
      if (active) return;
      d.clearDebris();
      spawned = fill();
      active = true;
      ends = game.time + RUSH_SECONDS;
      ui.set({ rush: { active: true, timeLeft: RUSH_SECONDS, score: 0, best: game.stats.bestRush }, panel: null });
      game.car.place(0, 1.2, RUSH_PAD.z - 2, Math.PI);
      game.rig.snapBehind(game.car);
      showBanner("Demolition rush");
      game.audio.play("chime");
    },
  };
}
