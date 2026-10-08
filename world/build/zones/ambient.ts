import * as THREE from "three";
import { PALETTE, TIERS } from "../../engine/config";
import type { Game } from "../../engine/game";
import { pushToast } from "../../engine/store";
import { CanvasDrums } from "../../engine/textures";
import { basic } from "../../engine/materials";
import { GARAGE, ROUNDABOUT, SECRETS } from "../layout";

/** Small signs of life: dust in the light, steam off the garage roof, birds turning overhead. */
export function buildAmbient(game: Game) {
  const ctx = game.ctx;
  const life = TIERS[game.tier].ambientLife * (game.reduced ? 0.4 : 1);

  // Dust motes around the camera, wrapped in a box so they never run out.
  const count = Math.round(260 * life);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: PALETTE.cream, size: 0.09, transparent: true, opacity: 0.45, depthWrite: false }));
  motes.frustumCulled = false;
  ctx.group.add(motes);

  // Birds: a loose flock of chevrons circling the island.
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.6, 0, -0.2, 0, 0.05, 0.25, 0.6, 0, -0.2, 0, 0, 0.1, -0.6, 0, -0.2, 0.6, 0, -0.2], 3));
  birdGeo.computeVertexNormals();
  const flock = Math.round(14 * life);
  const birds = new THREE.InstancedMesh(birdGeo, basic(PALETTE.ink, { side: THREE.DoubleSide }), Math.max(1, flock));
  birds.count = flock;
  birds.frustumCulled = false;
  ctx.group.add(birds);
  const seeds = Array.from({ length: flock }, () => ({ r: 40 + Math.random() * 30, h: 26 + Math.random() * 12, s: 0.08 + Math.random() * 0.05, o: Math.random() * Math.PI * 2, f: Math.random() * 10 }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const sc = new THREE.Vector3(1, 1, 1);

  let steamAt = 0;
  ctx.addUpdate((_, t) => {
    // Motes ride with the camera.
    const cam = game.camera.position;
    motes.position.set(Math.floor(cam.x / 60) * 60, 0, Math.floor(cam.z / 60) * 60);
    motes.rotation.y = t * 0.01;
    for (let i = 0; i < flock; i++) {
      const b = seeds[i];
      const a = b.o + t * b.s;
      p.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.7 + b.f) * 1.5, Math.sin(a) * b.r);
      e.set(Math.sin(t * 9 + b.f) * 0.5, -a, 0);
      q.setFromEuler(e);
      sc.set(1, 1 + Math.sin(t * 9 + b.f) * 0.4, 1);
      m.compose(p, q, sc);
      birds.setMatrixAt(i, m);
    }
    birds.instanceMatrix.needsUpdate = true;
    if (t > steamAt && life > 0.2) {
      steamAt = t + 0.35 / life;
      game.particles.emit("steam", GARAGE.x + 4, 6.6, GARAGE.z + 3, 1, 0.6, 0.6, 1.2, 0, 0.4);
      game.particles.emit("steam", 70, 7.6, -62, 1, 0.6, 0.6, 1.2, 0, 0.4);
    }
  });
}

/** Hidden bits. */
export function buildSecrets(game: Game) {
  const ctx = game.ctx;
  // The far corner: three drums that spell RAJ.
  const drums = new CanvasDrums(3, "RAJ", { cell: 96 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4 * (drums.canvas.height / drums.canvas.width)), basic("#ffffff", { map: drums.texture, toneMapped: false }));
  sign.position.set(SECRETS.raj.x + 2, 1.4, SECRETS.raj.z + 2);
  sign.rotation.y = Math.PI / 4;
  ctx.group.add(sign);
  let found = false;
  // A lap of the roundabout: angle swept while on its ring.
  let swept = 0;
  let last: number | null = null;
  ctx.addUpdate(() => {
    const c = game.car.group.position;
    if (!found && Math.hypot(c.x - SECRETS.raj.x, c.z - SECRETS.raj.z) < 8) {
      found = true;
      game.unlock("far-corner");
    }
    const r = Math.hypot(c.x, c.z);
    if (r > ROUNDABOUT.r - ROUNDABOUT.width / 2 - 1 && r < ROUNDABOUT.r + ROUNDABOUT.width / 2 + 1) {
      const a = Math.atan2(c.z, c.x);
      if (last !== null) {
        let da = a - last;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        swept += da;
        if (Math.abs(swept) > Math.PI * 2) {
          swept = 0;
          game.unlock("roundabout");
        }
      }
      last = a;
    } else {
      last = null;
      swept = 0;
    }
  });
  // Three quick honks: the plates spell RAJ for a moment.
  game.onHorn = (times) => {
    if (times < 3) return;
    game.car.plates.roll("RAJ", game.time, 0.05, 1);
    game.plateHold = game.time + 3.5;
    pushToast({ kind: "info", title: "Raj", body: "To friends." }, 1800);
  };
}
