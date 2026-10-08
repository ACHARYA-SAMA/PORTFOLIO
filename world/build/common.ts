import * as THREE from "three";
import { PALETTE } from "../engine/config";
import { basic, lambert } from "../engine/materials";
import { labelTexture, paragraphTexture } from "../engine/textures";

/** Things every zone builder needs, provided by the game. */
export type WorldCtx = {
  group: THREE.Group;
  billboards: THREE.Object3D[];
  addUpdate: (fn: (dt: number, t: number) => void) => void;
};

/** A mono label on an ink plate that always turns to face the camera (yaw only). */
export function floatingLabel(ctx: WorldCtx, text: string, x: number, y: number, z: number, opts: { width?: number; sub?: string; bg?: string; fg?: string } = {}) {
  const w = opts.width ?? 6;
  const tex = labelTexture(text, { bg: opts.bg ?? PALETTE.ink, fg: opts.fg ?? PALETTE.signal, width: 1024, height: 256, sub: opts.sub, subColor: PALETTE.cream, radius: 28 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), basic("#ffffff", { map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z);
  ctx.group.add(mesh);
  ctx.billboards.push(mesh);
  return mesh;
}

/** A fixed sign (no billboard), e.g. on a building face. */
export function sign(ctx: WorldCtx, text: string, x: number, y: number, z: number, yaw: number, w: number, h: number, opts: { bg?: string; fg?: string; font?: "mono" | "display" | "serif"; sub?: string; emissive?: boolean } = {}) {
  const tex = labelTexture(text, { bg: opts.bg ?? PALETTE.paper, fg: opts.fg ?? PALETTE.ink, width: 1024, height: Math.round((1024 * h) / w), font: opts.font ?? "display", sub: opts.sub });
  const mat = opts.emissive ? basic("#ffffff", { map: tex, toneMapped: false }) : lambert("#ffffff", { map: tex, flat: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  ctx.group.add(mesh);
  return mesh;
}

/** A plaque of running copy. */
export function plaque(ctx: WorldCtx, lines: string[], x: number, y: number, z: number, yaw: number, w: number, h: number, opts: { title?: string; titleColor?: string; bg?: string; fg?: string; font?: "serif" | "mono"; size?: number } = {}) {
  const tex = paragraphTexture(lines, { width: 1024, height: Math.round((1024 * h) / w), bg: opts.bg, fg: opts.fg, title: opts.title, titleColor: opts.titleColor, font: opts.font, size: opts.size });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lambert("#ffffff", { map: tex, flat: false }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  ctx.group.add(mesh);
  return mesh;
}

export type Pad = { group: THREE.Group; ring: THREE.Mesh; disc: THREE.Mesh; setActive: (on: boolean) => void };

/** Signal-lime content pad: a ring, a disc, and a pulse. Colour is never the only signal: it pulses and carries a label. */
export function contentPad(ctx: WorldCtx, x: number, z: number, r: number, color: string = PALETTE.signal): Pad {
  const g = new THREE.Group();
  g.position.set(x, 0.04, z);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 48), basic(color, { toneMapped: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  const discMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 48), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  // Chevrons pointing in.
  const chev = new THREE.Mesh(new THREE.RingGeometry(r * 0.5, r * 0.56, 4, 1, 0, Math.PI * 2), basic(color, { toneMapped: false, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
  chev.rotation.x = -Math.PI / 2;
  chev.rotation.z = Math.PI / 4;
  chev.position.y = 0.02;
  g.add(ring, disc, chev);
  ctx.group.add(g);
  let active = false;
  ctx.addUpdate((_, t) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * (active ? 7 : 2.6));
    discMat.opacity = (active ? 0.32 : 0.12) + pulse * 0.12;
    chev.rotation.z = Math.PI / 4 + t * (active ? 1.6 : 0.4);
    const s = 1 + pulse * 0.03;
    ring.scale.set(s, s, 1);
  });
  return {
    group: g,
    ring,
    disc,
    setActive: (on) => {
      active = on;
    },
  };
}

/** Simple box helper for static scenery (no physics). */
export function block(ctx: WorldCtx, w: number, h: number, d: number, x: number, y: number, z: number, color: string, yaw = 0, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  m.castShadow = shadow;
  m.receiveShadow = true;
  ctx.group.add(m);
  return m;
}
