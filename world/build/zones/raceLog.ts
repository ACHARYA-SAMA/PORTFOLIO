import * as THREE from "three";
import { RACES } from "@/lib/content";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { canvasTexture, lambert } from "../../engine/materials";
import { pushToast, showBanner } from "../../engine/store";
import { FONTS, makeCanvas } from "../../engine/textures";
import { OVAL } from "../layout";
import { GateSensor } from "./gate";
import type { ZoneHooks } from "./index";

/** Point and heading on the oval centre line at distance s (clockwise seen from above). */
function ovalAt(s: number) {
  const r = OVAL.hx;
  const straight = (OVAL.hz - r) * 2;
  const arc = Math.PI * r;
  const total = straight * 2 + arc * 2;
  let d = ((s % total) + total) % total;
  // West straight, heading north (−z).
  if (d < straight) return { x: OVAL.x - r, z: OVAL.z + straight / 2 - d, yaw: Math.PI };
  d -= straight;
  if (d < arc) {
    const a = d / r; // around the north end
    return { x: OVAL.x - r * Math.cos(a), z: OVAL.z - straight / 2 - r * Math.sin(a), yaw: Math.PI - a };
  }
  d -= arc;
  if (d < straight) return { x: OVAL.x + r, z: OVAL.z - straight / 2 + d, yaw: 0 };
  d -= straight;
  const a = d / r;
  return { x: OVAL.x + r * Math.cos(a), z: OVAL.z + straight / 2 + r * Math.sin(a), yaw: -a };
}

function ovalLength() {
  const r = OVAL.hx;
  return (OVAL.hz - r) * 4 + Math.PI * r * 2;
}

/** A ticket-shaped panel: paper, a red stub with the gate number, the event name. */
function ticketTexture(i: number, name: string, result: string) {
  const c = makeCanvas(1024, 320);
  const g = c.getContext("2d")!;
  g.fillStyle = PALETTE.paper;
  g.beginPath();
  g.roundRect(0, 0, 1024, 320, 18);
  g.fill();
  // Notches.
  g.globalCompositeOperation = "destination-out";
  for (const y of [0, 320]) {
    g.beginPath();
    g.arc(230, y, 34, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.fillStyle = PALETTE.red;
  g.fillRect(0, 0, 196, 320);
  g.setLineDash([10, 12]);
  g.strokeStyle = PALETTE.ink;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(230, 40);
  g.lineTo(230, 280);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = PALETTE.cream;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 30px ${FONTS.mono}`;
  g.fillText("GATE", 98, 104);
  g.font = `900 120px ${FONTS.display}`;
  g.fillText(String(i + 1).padStart(2, "0"), 98, 196);
  g.textAlign = "left";
  g.fillStyle = PALETTE.ink;
  let size = 92;
  g.font = `900 ${size}px ${FONTS.display}`;
  const label = name.toUpperCase();
  while (g.measureText(label).width > 740 && size > 30) {
    size -= 4;
    g.font = `900 ${size}px ${FONTS.display}`;
  }
  g.fillText(label, 268, 140);
  g.font = `500 32px ${FONTS.mono}`;
  g.fillStyle = "#6a6a6a";
  const sub = result.length > 42 ? `${result.slice(0, 40)}…` : result;
  g.fillText(sub.toUpperCase(), 268, 232);
  return canvasTexture(c);
}

export function buildRaceLog(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const total = ovalLength();
  const gates: Array<{ sensor: GateSensor; panel: THREE.Mesh; flash: number }> = [];
  const postMat = lambert(PALETTE.ink);
  const halfW = OVAL.width / 2 + 0.6;

  RACES.forEach((race, i) => {
    const p = ovalAt((i + 0.5) * (total / RACES.length));
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.yaw;
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.4, 0.5), postMat);
      post.position.set(s * halfW, 3.2, 0);
      post.castShadow = true;
      g.add(post);
      const lx = s * halfW;
      game.physics.box(p.x + lx * Math.cos(p.yaw), 3.2, p.z - lx * Math.sin(p.yaw), 0.25, 3.2, 0.25, { y: p.yaw });
    }
    const tex = ticketTexture(i, race.name, race.result);
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.15, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + 0.6, (halfW * 2 + 0.6) * (320 / 1024)), mat);
    panel.position.set(0, 6.4 + 0.4, 0);
    // Face the oncoming car.
    panel.rotation.y = Math.PI;
    g.add(panel);
    ctx.group.add(g);
    gates.push({ sensor: new GateSensor(p.x, p.z, p.yaw, halfW), panel, flash: 0 });
  });

  // Lap state: gates in order, forwards.
  let next = 0;
  let lapStart = 0;
  ctx.addUpdate((dt, t) => {
    const pos = game.car.group.position;
    gates.forEach((gate, i) => {
      const dir = gate.sensor.test(pos.x, pos.z);
      if (gate.flash > 0) {
        gate.flash = Math.max(0, gate.flash - dt);
        (gate.panel.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.15 + gate.flash * 1.4;
      }
      if (dir === 0) return;
      const race = RACES[i];
      gate.flash = 0.6;
      game.audio.play("gate");
      game.particles.emit("paper", pos.x, 4, pos.z, 10, 3);
      pushToast(
        {
          kind: "ticket",
          meta: `Gate ${String(i + 1).padStart(2, "0")} · ${race.kind}`,
          title: race.name,
          body: race.detail ? `${race.result} ${race.detail}` : race.result,
        },
        4200,
      );
      if (dir > 0 && i === next) {
        if (i === 0) lapStart = t;
        next++;
        if (next === gates.length) {
          next = 0;
          const time = t - lapStart;
          showBanner(`Clean lap · ${time.toFixed(1)} s`);
          game.unlock("clean-lap");
        }
      } else if (dir > 0 && i === 0) {
        next = 1;
        lapStart = t;
      } else next = 0;
    });
  });

  return {
    onEnter: () => gates.forEach((g) => g.sensor.reset()),
  };
}
