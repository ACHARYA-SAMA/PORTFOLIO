import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import { G_WORLD, groups } from "./config";
import type { CameraMode } from "./store";
import type { Car } from "./car";
import type { Physics } from "./physics";

const MODES: Record<CameraMode, { dist: number; height: number; look: number }> = {
  chase: { dist: 7.4, height: 3.1, look: 1.1 },
  far: { dist: 13.5, height: 6.6, look: 1.4 },
  top: { dist: 0.01, height: 34, look: 0 },
};

const RAY_GROUPS = groups(0xffff, G_WORLD);
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _off = new THREE.Vector3();

/** Simple value noise for shake, no allocation. */
function noise(t: number, seed: number) {
  return Math.sin(t * 17.3 + seed) * 0.5 + Math.sin(t * 31.7 + seed * 2.1) * 0.3 + Math.sin(t * 7.1 + seed * 3.7) * 0.2;
}

export class CameraRig {
  mode: CameraMode = "chase";
  readonly pos = new THREE.Vector3(80, 60, 120);
  readonly look = new THREE.Vector3();
  private heading = 0;
  private trauma = 0;
  private time = 0;
  private steerIdle = 0;
  // Free look (mouse drag / right stick).
  yawOffset = 0;
  pitchOffset = 0;
  freeLock = false;
  private dragIdle = 9;
  // Title orbit and intro swoop.
  orbit = 0.6;
  swoop: { t: number; from: THREE.Vector3; fromLook: THREE.Vector3 } | null = null;
  leaving = 0;
  photo = { active: false, yaw: 0, pitch: 0.35, dist: 9 };
  reduced = false;
  fovBase = 58;
  private ray: RAPIER.Ray;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private physics: Physics,
  ) {
    this.ray = new physics.R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
  }

  addTrauma(amount: number) {
    if (this.reduced) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  drag(dx: number, dy: number) {
    if (this.photo.active) {
      this.photo.yaw -= dx * 0.006;
      this.photo.pitch = THREE.MathUtils.clamp(this.photo.pitch + dy * 0.004, -0.1, 1.3);
      return;
    }
    this.yawOffset -= dx * 0.006;
    this.pitchOffset = THREE.MathUtils.clamp(this.pitchOffset + dy * 0.004, -0.35, 0.9);
    this.dragIdle = 0;
  }

  zoom(delta: number) {
    if (this.photo.active) this.photo.dist = THREE.MathUtils.clamp(this.photo.dist * (1 + delta * 0.001), 3, 40);
  }

  startSwoop() {
    this.swoop = { t: 0, from: this.pos.clone(), fromLook: this.look.clone() };
  }

  snapBehind(car: Car) {
    this.heading = car.yaw;
  }

  /** Title screen: a slow orbit around the island. */
  updateTitle(dt: number) {
    if (!this.reduced) this.orbit += dt * 0.045;
    const r = 150;
    this.pos.set(Math.sin(this.orbit) * r, 62, Math.cos(this.orbit) * r);
    this.look.set(0, 0, 10);
    this.apply(0);
  }

  update(dt: number, car: Car, steering: number, lookX: number, lookY: number) {
    this.time += dt;
    const m = MODES[this.mode];
    const speed = car.velocity.length();

    // Heading follows the car; recentres faster once you stop steering.
    this.steerIdle = Math.abs(steering) > 0.05 ? 0 : this.steerIdle + dt;
    let yaw = car.yaw;
    if (car.speed < -1) yaw = car.yaw; // reversing: stay behind the bonnet's back
    let dh = yaw - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    const follow = this.steerIdle > 1 ? 4.2 : 2.6;
    this.heading += dh * damp(follow, dt);

    // Free look eases back unless locked.
    if (Math.abs(lookX) > 0 || Math.abs(lookY) > 0) {
      this.yawOffset -= lookX * dt * 2.2;
      this.pitchOffset = THREE.MathUtils.clamp(this.pitchOffset + lookY * dt * 1.4, -0.35, 0.9);
      this.dragIdle = 0;
    }
    this.dragIdle += dt;
    if (!this.freeLock && this.dragIdle > 0.9) {
      this.yawOffset *= 1 - damp(3, dt);
      this.pitchOffset *= 1 - damp(3, dt);
    }

    const carPos = car.group.position;
    // Look a little ahead along the velocity.
    _fwd.copy(car.velocity).setY(0).multiplyScalar(0.18);
    if (_fwd.lengthSq() > 16) _fwd.setLength(4);
    _target.copy(carPos).add(_fwd);
    _target.y += m.look;

    if (this.photo.active) {
      const p = this.photo;
      _desired.set(Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), Math.cos(p.yaw) * Math.cos(p.pitch)).multiplyScalar(p.dist).add(carPos);
      this.pos.lerp(_desired, damp(8, dt));
      this.look.lerp(carPos, damp(8, dt));
      this.apply(dt, 50);
      return;
    }

    const h = this.heading + this.yawOffset;
    const pitch = this.pitchOffset;
    const dist = m.dist * (1 + Math.min(speed / 40, 1) * 0.12);
    _desired.set(-Math.sin(h) * dist, m.height + pitch * dist, -Math.cos(h) * dist).add(carPos);
    if (this.mode === "top") _desired.set(carPos.x, carPos.y + m.height, carPos.z + 6);

    // Never through a wall: pull in to the first static hit.
    _off.copy(_desired).sub(_target);
    const len = _off.length();
    if (len > 0.5 && this.mode !== "top") {
      _off.divideScalar(len);
      const o = this.ray.origin;
      o.x = _target.x;
      o.y = _target.y;
      o.z = _target.z;
      const d = this.ray.dir;
      d.x = _off.x;
      d.y = _off.y;
      d.z = _off.z;
      const hit = this.physics.world.castRay(this.ray, len, true, undefined, RAY_GROUPS);
      if (hit) _desired.copy(_target).addScaledVector(_off, Math.max(1.2, hit.timeOfImpact - 0.35));
    }

    if (this.swoop) {
      // Intro: from the orbit down behind the car.
      this.swoop.t = Math.min(1, this.swoop.t + dt / 1.7);
      const e = this.swoop.t < 0.5 ? 4 * this.swoop.t ** 3 : 1 - (-2 * this.swoop.t + 2) ** 3 / 2;
      this.pos.lerpVectors(this.swoop.from, _desired, e);
      this.look.lerpVectors(this.swoop.fromLook, _target, e);
      if (this.swoop.t >= 1) this.swoop = null;
    } else if (this.leaving > 0) {
      // Visit Portfolio: pull up and out.
      this.leaving = Math.min(1, this.leaving + dt / 0.6);
      this.pos.y += dt * 40 * this.leaving;
      this.pos.addScaledVector(_fwd.set(this.pos.x - carPos.x, 0, this.pos.z - carPos.z).normalize(), dt * 30);
    } else {
      this.pos.lerp(_desired, damp(this.mode === "top" ? 6 : 7.5, dt));
      this.look.lerp(_target, damp(12, dt));
    }

    // Speed widens the lens; boost a little more.
    const fov = this.fovBase + Math.min(speed / 38, 1) * 13 + (car.boosting ? 6 : 0);
    this.apply(dt, fov);
  }

  private apply(dt: number, fov = this.fovBase) {
    const cam = this.camera;
    cam.position.copy(this.pos);
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma;
      cam.position.x += noise(this.time, 1) * s * 0.9;
      cam.position.y += noise(this.time, 2) * s * 0.6;
      cam.position.z += noise(this.time, 3) * s * 0.9;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }
    cam.lookAt(this.look);
    if (this.trauma > 0) cam.rotation.z += noise(this.time, 4) * this.trauma * this.trauma * 0.04;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * damp(5, dt || 0.016);
      cam.updateProjectionMatrix();
    }
  }
}
