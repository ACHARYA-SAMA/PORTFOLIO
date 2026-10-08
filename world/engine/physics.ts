import RAPIER from "@dimforge/rapier3d-compat";
import { GRAVITY, STEP, WORLD_GROUPS } from "./config";

export type Rapier = typeof RAPIER;
export type { RigidBody, Collider, World, EventQueue } from "@dimforge/rapier3d-compat";

let ready: Promise<Rapier> | null = null;

/** Load the WASM once per page. The compat build embeds it, so no extra request. */
export function loadRapier(): Promise<Rapier> {
  if (!ready) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}

/**
 * The physics world and its fixed 60 Hz clock. Rendering interpolates
 * between the last two steps with `alpha`, so motion is identical at 60 Hz
 * and 144 Hz displays.
 */
export class Physics {
  readonly R: Rapier;
  readonly world: RAPIER.World;
  readonly queue: RAPIER.EventQueue;
  accumulator = 0;
  alpha = 0;
  /** Scales simulated time (hit-stop, slow-motion replays). */
  timeScale = 1;

  constructor(R: Rapier) {
    this.R = R;
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = STEP;
    this.queue = new R.EventQueue(true);
  }

  /** A fixed cuboid at a pose (yaw/pitch/roll in radians). */
  box(x: number, y: number, z: number, hx: number, hy: number, hz: number, rot?: { x?: number; y?: number; z?: number }, friction = 0.8) {
    const R = this.R;
    const desc = R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(friction).setCollisionGroups(WORLD_GROUPS);
    if (rot) desc.setRotation(quatFromEuler(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0));
    return this.world.createCollider(desc);
  }

  cylinder(x: number, y: number, z: number, halfHeight: number, radius: number) {
    const R = this.R;
    const desc = R.ColliderDesc.cylinder(halfHeight, radius).setTranslation(x, y, z).setCollisionGroups(WORLD_GROUPS);
    return this.world.createCollider(desc);
  }

  free() {
    this.queue.free();
    this.world.free();
  }
}

/** Euler XYZ → quaternion, without three.js (used for colliders). */
export function quatFromEuler(x: number, y: number, z: number) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}
