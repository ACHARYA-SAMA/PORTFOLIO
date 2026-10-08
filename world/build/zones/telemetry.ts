import * as THREE from "three";
import { CHANNELS } from "@/lib/content";
import { channelAchievementId } from "@/lib/progress";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { canvasTexture, lambert, release } from "../../engine/materials";
import { pushToast } from "../../engine/store";
import { FONTS, labelTexture, makeCanvas } from "../../engine/textures";
import { sign } from "../common";
import type { ZoneHooks } from "./index";

const FIELD = { x: -58, z: -60 };

/** Plank crate face with a paper label plate: the tech's name, its channel underneath. */
function crateFace(label: string, channel: string, note?: string) {
  const c = makeCanvas(512, 512);
  const g = c.getContext("2d")!;
  g.fillStyle = PALETTE.wood;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = PALETTE.woodDark;
  g.lineWidth = 6;
  for (let y = 0; y < 512; y += 85) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.lineWidth = 34;
  g.strokeRect(17, 17, 478, 478);
  // Label plate.
  g.fillStyle = PALETTE.paper;
  g.fillRect(56, 150, 400, 212);
  g.fillStyle = PALETTE.red;
  g.fillRect(56, 150, 400, 40);
  g.fillStyle = PALETTE.cream;
  g.font = `600 24px ${FONTS.mono}`;
  (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "4px";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(channel.toUpperCase(), 256, 171);
  (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  g.fillStyle = PALETTE.ink;
  let size = 76;
  g.font = `900 ${size}px ${FONTS.display}`;
  const text = label.toUpperCase();
  while (g.measureText(text).width > 370 && size > 26) {
    size -= 3;
    g.font = `900 ${size}px ${FONTS.display}`;
  }
  g.fillText(text, 256, note ? 255 : 270);
  if (note) {
    g.font = `500 22px ${FONTS.mono}`;
    g.fillStyle = "#555";
    const n = note.length > 30 ? `${note.slice(0, 28)}…` : note;
    g.fillText(n.toUpperCase(), 256, 326);
  }
  return canvasTexture(c);
}

export function buildTelemetry(game: Game): ZoneHooks {
  const ctx = game.ctx;
  const d = game.destruction;
  const broken = new Set<string>();
  const total = CHANNELS.reduce((n, c) => n + c.nodes.length, 0);
  sign(ctx, "TELEMETRY", FIELD.x, 6.2, FIELD.z - 15, 0, 12, 2, { bg: PALETTE.ink, fg: PALETTE.signal, font: "display", emissive: true });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.2, 0.4), lambert(PALETTE.ink));
    post.position.set(FIELD.x + s * 5.6, 3.1, FIELD.z - 15.2);
    ctx.group.add(post);
    game.physics.box(FIELD.x + s * 5.6, 3.1, FIELD.z - 15.2, 0.2, 3.1, 0.2);
  }

  // Popping labels: rise and fade, then go.
  const pops: Array<{ mesh: THREE.Mesh; t: number }> = [];
  const pop = (text: string, sub: string, x: number, y: number, z: number) => {
    const tex = labelTexture(text, { bg: PALETTE.signal, fg: PALETTE.ink, width: 1024, height: 256, sub, subColor: PALETTE.ink, radius: 30, font: "display" });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.renderOrder = 5;
    ctx.group.add(mesh);
    ctx.billboards.push(mesh);
    pops.push({ mesh, t: 0 });
  };
  ctx.addUpdate((dt) => {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      p.mesh.position.y += dt * 1.2;
      const m = p.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = Math.min(1, 3 - p.t);
      if (p.t > 3) {
        ctx.group.remove(p.mesh);
        ctx.billboards.splice(ctx.billboards.indexOf(p.mesh), 1);
        p.mesh.geometry.dispose();
        release(m.map);
        m.dispose();
        pops.splice(i, 1);
      }
    }
  });

  // One cluster per channel, in a fan across the field.
  CHANNELS.forEach((channel, ci) => {
    const angle = -0.9 + (ci / (CHANNELS.length - 1)) * 1.8;
    const cx = FIELD.x + Math.sin(angle) * 11;
    const cz = FIELD.z + Math.cos(angle) * 6 - 2;
    channel.nodes.forEach((node, ni) => {
      const tex = crateFace(node.label, channel.name, node.note);
      const mat = lambert("#ffffff", { map: tex });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const row = Math.floor(ni / 2);
      const x = cx + ((ni % 2) - 0.5) * 1.62 * (channel.nodes.length > 1 ? 1 : 0);
      const y = 0.75 + 0.002;
      const z = cz + row * 1.7;
      d.spawn("tech-crate", x, y, z, angle * 0.4, {
        object: mesh,
        group: channel.name,
        tag: node.label,
        onBreak: (info) => {
          if (info.kind === "topple") return;
          broken.add(node.label);
          pop(node.label, node.note ? `${channel.name} · ${node.note}` : channel.name, info.pos.x, info.pos.y + 1.4, info.pos.z);
          pushToast({ kind: "label", meta: channel.name, title: node.label, body: node.note }, 2600);
          if (channel.nodes.every((n) => broken.has(n.label))) game.unlock(channelAchievementId(channel.name));
          if (broken.size >= total) game.unlock("full-telemetry");
        },
      });
    });
  });

  // Plain crates around the edge, for momentum.
  for (let i = 0; i < 8; i++) d.spawn("crate", FIELD.x - 16 + i * 4.2, 0.55, FIELD.z + 12, i * 0.4);
  return {
    onRebuild: () => broken.clear(),
  };
}
