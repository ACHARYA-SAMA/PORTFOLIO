import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import { PALETTE, PROP_GROUPS, debrisGroups, type TierConfig } from "./config";
import { fractureBox, refine, rng, type ChunkDef } from "./fracture";
import type { Particles, ParticleKind } from "./fx";
import { lambert } from "./materials";
import { quatFromEuler, type Physics } from "./physics";

/**
 * Destruction. Intact objects are single sleeping (or fixed) bodies drawn
 * as InstancedMesh per archetype; chunk bodies only exist after a break.
 * Breaks come from Rapier contact-force events: under the threshold the
 * object is just knocked about, over it the cached coarse set spawns, far
 * over it the fine set does. Chunks come from fixed pools (bodies and
 * instances) with hard caps; when a cap is hit the oldest chunks give way,
 * never the break itself.
 */

export type MaterialId = "wood" | "brick" | "concrete" | "glass" | "metal" | "foliage" | "paper";
export type SoundKind = MaterialId;

type MatDef = {
  density: number;
  /** Break threshold per kg of the object, in newtons. */
  toughness: number;
  colors: string[];
  particle: ParticleKind;
  dust: boolean;
  score: number;
  fracture: boolean;
  vanish?: boolean;
};

export const MATERIALS: Record<MaterialId, MatDef> = {
  wood: { density: 22, toughness: 230, colors: [PALETTE.wood, PALETTE.woodDark, "#c99257"], particle: "splinter", dust: true, score: 10, fracture: true },
  brick: { density: 110, toughness: 1300, colors: [PALETTE.brick, PALETTE.brickDark, "#b2281a"], particle: "chip", dust: true, score: 6, fracture: true },
  concrete: { density: 120, toughness: 1100, colors: [PALETTE.concrete, PALETTE.concreteDark, "#a59e95"], particle: "chip", dust: true, score: 8, fracture: true },
  glass: { density: 30, toughness: 90, colors: [PALETTE.glass, "#e8f6f8", "#b9d9de"], particle: "glint", dust: false, score: 14, fracture: true },
  metal: { density: 60, toughness: 260, colors: [PALETTE.metal, PALETTE.steel], particle: "spark", dust: false, score: 8, fracture: false },
  foliage: { density: 8, toughness: 55, colors: [PALETTE.foliage, PALETTE.foliageDark], particle: "leaf", dust: false, score: 4, fracture: false, vanish: true },
  paper: { density: 4, toughness: 30, colors: [PALETTE.paper], particle: "paper", dust: false, score: 3, fracture: false, vanish: true },
};

export type ArchetypeDef = {
  id: string;
  material: MaterialId;
  size: [number, number, number];
  /** Visual geometry centred on the body; defaults to a box of `size`. */
  geometry?: THREE.BufferGeometry;
  visual?: THREE.Material | THREE.Material[];
  shape?: "box" | "cylinder";
  pieces?: number;
  finePieces?: number;
  weights?: [number, number, number];
  /** Fixed until broken or toppled (lamp posts, signs, karate boards in a rack). */
  anchored?: boolean;
  /** Absolute break threshold in N for anchored pieces (contact with a fixed body is always hard). */
  threshold?: number;
  capacity?: number;
  castShadow?: boolean;
  seed?: number;
  scoreMul?: number;
};

type Archetype = ArchetypeDef & {
  coarse: ChunkDef[];
  fine: ChunkDef[];
  mass: number;
  threshold: number;
  mesh: THREE.InstancedMesh | null;
  used: number;
  free: number[];
};

export type Entity = {
  id: number;
  arch: Archetype;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  broken: boolean;
  hidden: boolean;
  toppled: boolean;
  /** Sent flying whole (a brick out of a wall): scores once, no fracture. */
  knocked: boolean;
  anchored: boolean;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  prevPos: THREE.Vector3;
  currPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  currQuat: THREE.Quaternion;
  slot: number;
  object: THREE.Object3D | null;
  scale: THREE.Vector3;
  tag?: string;
  group?: string;
  data?: unknown;
  onBreak?: (info: BreakInfo) => void;
  temp: boolean;
  lastActive: number;
  listed: boolean;
};

export type BreakInfo = {
  entity: Entity;
  material: MaterialId;
  force: number;
  pos: THREE.Vector3;
  byCar: boolean;
  pieces: number;
  volume: number;
  kind: "break" | "disintegrate" | "vanish" | "topple" | "knock";
};

export type SpawnOpts = {
  object?: THREE.Object3D;
  tag?: string;
  group?: string;
  data?: unknown;
  onBreak?: (info: BreakInfo) => void;
  awake?: boolean;
  temp?: boolean;
  /** Extra colliders on the same body (letters), local offsets, box half-extents. */
  compound?: Array<{ x: number; y: number; z: number; hx: number; hy: number; hz: number; rz?: number }>;
  scale?: [number, number, number];
  /** Per-instance tint for instanced archetypes (brick tones). */
  color?: string;
};

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _d = new THREE.Vector3();
const _c = new THREE.Color();

const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);
const DISINTEGRATE = 3.5;

/* ── Debris pool ─────────────────────────────────────────────── */

class DebrisPool {
  readonly mesh: THREE.InstancedMesh;
  readonly cap: number;
  readonly active: Uint8Array;
  readonly mat: Uint8Array;
  readonly bodies: Array<RAPIER.RigidBody | null>;
  readonly colliders: Array<RAPIER.Collider | null>;
  readonly size: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly born: Float64Array;
  readonly prev: Float32Array; // pos(3) + quat(4)
  readonly curr: Float32Array;
  readonly home: Float32Array;
  readonly last: Int32Array;
  readonly src: Int32Array;
  readonly fade: Float32Array; // seconds of fast fade left, 0 = none
  readonly flying: Uint8Array; // rebuild animation
  highWater = 0;
  count = 0;
  private freeList: number[] = [];

  constructor(cap: number, material: THREE.Material) {
    this.cap = cap;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, material, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    for (let i = 0; i < cap; i++) this.mesh.setMatrixAt(i, HIDE);
    this.mesh.setColorAt(0, _c.set("#fff"));
    this.active = new Uint8Array(cap);
    this.mat = new Uint8Array(cap);
    this.bodies = new Array(cap).fill(null);
    this.colliders = new Array(cap).fill(null);
    this.size = new Float32Array(cap * 3);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.born = new Float64Array(cap);
    this.prev = new Float32Array(cap * 7);
    this.curr = new Float32Array(cap * 7);
    this.home = new Float32Array(cap * 7);
    this.last = new Int32Array(cap);
    this.src = new Int32Array(cap).fill(-1);
    this.fade = new Float32Array(cap);
    this.flying = new Uint8Array(cap);
    for (let i = cap - 1; i >= 0; i--) this.freeList.push(i);
  }

  take(): number {
    const i = this.freeList.pop();
    if (i === undefined) return -1;
    this.active[i] = 1;
    this.count++;
    if (i + 1 > this.highWater) this.highWater = i + 1;
    this.mesh.count = this.highWater;
    return i;
  }

  give(i: number) {
    if (!this.active[i]) return;
    this.active[i] = 0;
    this.count--;
    this.fade[i] = 0;
    this.flying[i] = 0;
    this.src[i] = -1;
    this.mesh.setMatrixAt(i, HIDE);
    this.freeList.push(i);
  }

  /** Oldest live chunk (optionally only ones holding a body). */
  /** Oldest live chunk; optionally only ones holding a body, or only ones whose body sleeps. */
  oldest(withBody: boolean, sleeping = false) {
    let best = -1;
    let bestT = Infinity;
    for (let i = 0; i < this.highWater; i++) {
      if (!this.active[i] || this.fade[i] > 0) continue;
      if (withBody && !this.bodies[i]) continue;
      if (sleeping && !this.bodies[i]?.isSleeping()) continue;
      if (this.born[i] < bestT) {
        bestT = this.born[i];
        best = i;
      }
    }
    return best;
  }
}

/* ── The system ──────────────────────────────────────────────── */

export type DestructionEvents = {
  onBreak: (info: BreakInfo) => void;
};

export class Destruction {
  readonly group = new THREE.Group();
  readonly entities: Entity[] = [];
  private archetypes = new Map<string, Archetype>();
  /** Instanced meshes of every archetype, for per-frame updates without iterators. */
  private instanced: THREE.InstancedMesh[] = [];
  private byCollider = new Map<number, number>();
  private byBody = new Map<number, number>(); // >=0 entity id, <0 chunk (-(i+1)), pool encoded in high bit
  private queue: Array<{ e: Entity; force: number; byCar: boolean; from: THREE.Vector3 }> = [];
  private knocks: Array<{ e: Entity; force: number; byCar: boolean }> = [];
  private opaque: DebrisPool;
  private glass: DebrisPool;
  private stepId = 0;
  private activeEntities: number[] = [];
  private freeBodies: RAPIER.RigidBody[] = [];
  private bodyCount = 0;
  private now = 0;
  carHandle = -1;
  readonly carVelocity = new THREE.Vector3();
  readonly carPos = new THREE.Vector3();
  frustum: THREE.Frustum | null = null;
  rebuild: { t: number; duration: number; restoring: Entity[]; displaced: Array<{ e: Entity; from: THREE.Vector3; fromQ: THREE.Quaternion }> } | null = null;
  pendingRestore: Entity[] = [];
  /** Breaks in the last few hundred ms, for slow-motion replays. */
  recentBreaks = 0;

  constructor(
    private physics: Physics,
    private particles: Particles,
    private tier: TierConfig,
    private events: DestructionEvents,
  ) {
    const opaqueMat = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true });
    const glassMat = new THREE.MeshLambertMaterial({ color: "#ffffff", flatShading: true, transparent: true, opacity: 0.55, emissive: "#9fd6e0", emissiveIntensity: 0.25, depthWrite: false });
    this.opaque = new DebrisPool(tier.maxDebris, opaqueMat);
    this.glass = new DebrisPool(Math.max(60, Math.round(tier.maxDebris * 0.25)), glassMat);
    this.group.add(this.opaque.mesh, this.glass.mesh);
  }

  setTier(tier: TierConfig) {
    this.tier = tier;
    // Pools keep their allocation; caps tighten through the body budget and live counts.
    const groupsNow = debrisGroups(tier.debrisVsDebris);
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) pool.colliders[i]?.setCollisionGroups(groupsNow);
    }
  }

  get debrisCount() {
    return this.opaque.count + this.glass.count;
  }

  get activeBodies() {
    return this.bodyCount;
  }

  get poolUsage() {
    return `${this.opaque.count}/${this.opaque.cap} · glass ${this.glass.count}/${this.glass.cap} · bodies ${this.bodyCount}/${this.tier.maxBodies}`;
  }

  /* ── Archetypes ─────────────────────────────────────────── */

  define(def: ArchetypeDef) {
    const m = MATERIALS[def.material];
    const [sx, sy, sz] = def.size;
    const volume = def.shape === "cylinder" ? Math.PI * (sx / 2) * (sz / 2) * sy : sx * sy * sz;
    const mass = volume * m.density;
    const coarse = m.fracture ? fractureBox(def.size, def.pieces ?? 6, def.weights, def.seed ?? hash(def.id)) : [];
    const fine = m.fracture ? refine(coarse, def.finePieces ?? 3, (def.seed ?? hash(def.id)) + 5) : [];
    let mesh: THREE.InstancedMesh | null = null;
    if (def.capacity) {
      const geo = def.geometry ?? new THREE.BoxGeometry(sx, sy, sz);
      mesh = new THREE.InstancedMesh(geo, def.visual ?? lambert(m.colors[0]), def.capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = def.castShadow ?? true;
      mesh.receiveShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      for (let i = 0; i < def.capacity; i++) mesh.setMatrixAt(i, HIDE);
      this.group.add(mesh);
      this.instanced.push(mesh);
    }
    const arch: Archetype = {
      ...def,
      coarse,
      fine,
      mass,
      threshold: def.threshold ?? mass * m.toughness,
      mesh,
      used: 0,
      free: [],
    };
    this.archetypes.set(def.id, arch);
    return arch;
  }

  /** Place one intact object. Dynamic and asleep unless anchored. */
  spawn(archId: string, x: number, y: number, z: number, yaw = 0, opts: SpawnOpts = {}): Entity {
    const arch = this.archetypes.get(archId);
    if (!arch) throw new Error(`unknown archetype ${archId}`);
    const { R, world } = this.physics;
    const m = MATERIALS[arch.material];
    _q.setFromAxisAngle(_v.set(0, 1, 0), yaw);
    const desc = (arch.anchored ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.dynamic().setSleeping(!opts.awake).setCanSleep(true))
      .setTranslation(x, y, z)
      .setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w })
      .setLinearDamping(0.12)
      .setAngularDamping(0.25);
    const body = world.createRigidBody(desc);
    const [sx, sy, sz] = arch.size;
    const sc = opts.scale ?? [1, 1, 1];
    const cdesc = (
      opts.compound
        ? R.ColliderDesc.cuboid(opts.compound[0].hx, opts.compound[0].hy, opts.compound[0].hz)
            .setTranslation(opts.compound[0].x, opts.compound[0].y, opts.compound[0].z)
            .setRotation(quatFromEuler(0, 0, opts.compound[0].rz ?? 0))
        : arch.shape === "cylinder"
          ? R.ColliderDesc.cylinder((sy * sc[1]) / 2, (sx * sc[0]) / 2)
          : R.ColliderDesc.cuboid((sx * sc[0]) / 2, (sy * sc[1]) / 2, (sz * sc[2]) / 2)
    )
      .setDensity(m.density)
      .setFriction(0.7)
      .setRestitution(0.1)
      .setCollisionGroups(PROP_GROUPS)
      .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(Math.min(arch.threshold, 4000) * 0.6);
    const collider = world.createCollider(cdesc, body);
    if (opts.compound) {
      for (const part of opts.compound.slice(1)) {
        const extra = world.createCollider(
          R.ColliderDesc.cuboid(part.hx, part.hy, part.hz)
            .setTranslation(part.x, part.y, part.z)
            .setRotation(quatFromEuler(0, 0, part.rz ?? 0))
            .setDensity(m.density)
            .setFriction(0.7)
            .setCollisionGroups(PROP_GROUPS)
            .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
            .setContactForceEventThreshold(Math.min(arch.threshold, 4000) * 0.6),
          body,
        );
        this.byCollider.set(extra.handle, this.entities.length);
      }
    }

    const e: Entity = {
      id: this.entities.length,
      arch,
      body,
      collider,
      broken: false,
      hidden: false,
      toppled: false,
      knocked: false,
      anchored: !!arch.anchored,
      homePos: new THREE.Vector3(x, y, z),
      homeQuat: _q.clone(),
      prevPos: new THREE.Vector3(x, y, z),
      currPos: new THREE.Vector3(x, y, z),
      prevQuat: _q.clone(),
      currQuat: _q.clone(),
      slot: -1,
      object: opts.object ?? null,
      scale: new THREE.Vector3(...sc),
      tag: opts.tag,
      group: opts.group,
      data: opts.data,
      onBreak: opts.onBreak,
      temp: !!opts.temp,
      lastActive: -1,
      listed: false,
    };
    if (e.object) {
      e.object.position.set(x, y, z);
      e.object.quaternion.copy(_q);
      this.group.add(e.object);
    } else if (arch.mesh) {
      const slot = arch.free.pop() ?? arch.used++;
      if (slot >= (arch.capacity ?? 0)) throw new Error(`archetype ${arch.id} over capacity`);
      e.slot = slot;
      arch.mesh.count = Math.max(arch.mesh.count, slot + 1);
      if (opts.color) {
        arch.mesh.setColorAt(slot, _c.set(opts.color));
        if (arch.mesh.instanceColor) arch.mesh.instanceColor.needsUpdate = true;
      }
      this.writeEntity(e, e.currPos, e.currQuat);
    }
    this.entities.push(e);
    this.byCollider.set(collider.handle, e.id);
    this.byBody.set(body.handle, e.id);
    return e;
  }

  /** Remove a temporary entity for good (Demolition Rush clean-up). */
  despawn(e: Entity) {
    if (!e.temp) return;
    this.hideEntity(e);
    this.byCollider.delete(e.collider.handle);
    this.byBody.delete(e.body.handle);
    this.physics.world.removeRigidBody(e.body);
    if (e.slot >= 0) e.arch.free.push(e.slot);
    if (e.object) this.group.remove(e.object);
    e.broken = true;
    e.temp = false;
    e.hidden = true;
    (e as { despawned?: boolean }).despawned = true;
  }

  /* ── Contacts ───────────────────────────────────────────── */

  /** Called for each contact-force event. Returns true if an intact object took the hit. */
  contact(h1: number, h2: number, force: number): Entity | null {
    let hit: Entity | null = null;
    for (const [h, other] of [
      [h1, h2],
      [h2, h1],
    ]) {
      const id = this.byCollider.get(h);
      if (id === undefined) continue;
      const e = this.entities[id];
      if (e.broken || this.rebuild) continue;
      const byCar = other === this.carHandle;
      const m = MATERIALS[e.arch.material];
      if (e.anchored && !e.toppled && !m.fracture && !m.vanish) {
        if (force > e.arch.threshold) this.queueBreak(e, force, byCar, other);
        continue;
      }
      if (m.fracture || m.vanish) {
        if (force > e.arch.threshold) {
          this.queueBreak(e, force, byCar, other);
          hit = e;
        } else if (!e.knocked && !e.anchored && force > e.arch.threshold * 0.22) {
          e.knocked = true;
          this.knocks.push({ e, force, byCar });
        }
      } else if (!e.toppled && force > e.arch.threshold) {
        // Metal: first real knock counts as a topple (clang, sparks, score).
        this.queueBreak(e, force, byCar, other);
      }
    }
    return hit;
  }

  private queueBreak(e: Entity, force: number, byCar: boolean, otherHandle: number) {
    if (this.queue.some((q) => q.e === e)) return;
    const from = new THREE.Vector3();
    if (byCar) from.copy(this.carPos);
    else {
      const other = this.physics.world.getCollider(otherHandle);
      const t = other?.translation();
      if (t) from.set(t.x, t.y, t.z);
      else from.copy(e.currPos).y -= 1;
    }
    this.queue.push({ e, force, byCar, from });
  }

  /** Apply queued breaks. Call once after each world step. */
  process(now: number) {
    this.now = now;
    const q = this.queue;
    this.queue = [];
    for (const item of q) this.breakEntity(item.e, item.force, item.byCar, item.from);
    if (this.knocks.length) {
      for (const k of this.knocks) {
        if (k.e.broken) continue;
        const p = k.e.currPos;
        this.particles.emit("dust", p.x, p.y, p.z, 2, 1.2, 0, 0.4, 0, 0.6);
        const info: BreakInfo = { entity: k.e, material: k.e.arch.material, force: k.force, pos: p.clone(), byCar: k.byCar, pieces: 0, volume: k.e.arch.size[0] * k.e.arch.size[1] * k.e.arch.size[2], kind: "knock" };
        this.events.onBreak(info);
      }
      this.knocks.length = 0;
    }
  }

  /** Break something on purpose (Dojo reset, tests). */
  smash(e: Entity, force = Infinity) {
    this.breakEntity(e, force === Infinity ? e.arch.threshold * 2 : force, false, _v.copy(e.currPos).setY(e.currPos.y - 2));
  }

  private breakEntity(e: Entity, force: number, byCar: boolean, from: THREE.Vector3) {
    if (e.broken) return;
    const arch = e.arch;
    const m = MATERIALS[arch.material];
    const { R } = this.physics;
    const t = e.body.translation();
    const r = e.body.rotation();
    _p.set(t.x, t.y, t.z);
    _q.set(r.x, r.y, r.z, r.w);
    const lv = e.body.linvel();
    const baseVel = new THREE.Vector3(lv.x, lv.y, lv.z);
    // Push direction: along the car's travel, or away from whatever hit it.
    const dir = new THREE.Vector3();
    if (byCar && this.carVelocity.lengthSq() > 1) dir.copy(this.carVelocity).normalize();
    else dir.subVectors(_p, from).normalize();
    const volume = arch.size[0] * arch.size[1] * arch.size[2] * e.scale.x * e.scale.y * e.scale.z;
    const severity = Math.min(3, force / arch.threshold);

    // Metal and other unbreakables: topple instead.
    if (!m.fracture && !m.vanish) {
      e.toppled = true;
      if (e.anchored) {
        e.body.setBodyType(R.RigidBodyType.Dynamic, true);
        e.anchored = false;
        const k = arch.mass * 6;
        e.body.applyImpulseAtPoint({ x: dir.x * k, y: 1.5 * arch.mass, z: dir.z * k }, { x: t.x, y: t.y + arch.size[1] * 0.4, z: t.z }, true);
      }
      this.particles.emit("spark", _p.x - dir.x * 0.4, _p.y, _p.z - dir.z * 0.4, 10, 6);
      this.events.onBreak({ entity: e, material: arch.material, force, pos: _p.clone(), byCar, pieces: 0, volume, kind: "topple" });
      e.onBreak?.({ entity: e, material: arch.material, force, pos: _p.clone(), byCar, pieces: 0, volume, kind: "topple" });
      return;
    }

    e.broken = true;
    this.hideEntity(e);
    this.wakeAround(_p, Math.max(arch.size[0], arch.size[1], arch.size[2]) * 1.4 + 0.6);

    // Particles by material.
    const px = _p.x;
    const py = _p.y;
    const pz = _p.z;
    const big = Math.cbrt(volume);
    this.particles.emit(m.particle, px, py, pz, Math.round(8 + 14 * big * severity), 4 + severity * 2, dir.x * 3, 1.5, dir.z * 3, big);
    if (m.dust) this.particles.emit("dust", px, py - arch.size[1] * 0.3, pz, Math.round(3 + 4 * big), 1.6, dir.x, 0.4, dir.z, big);
    if (arch.material === "glass") this.particles.emit("glint", px, py, pz, 6 + Math.round(severity * 4), 3);

    let pieces = 0;
    if (m.fracture && !(arch.material === "glass" && !this.tier.glassShards)) {
      const set = force > arch.threshold * DISINTEGRATE ? arch.fine : arch.coarse;
      const pool = arch.material === "glass" ? this.glass : this.opaque;
      const colors = m.colors;
      const rand = rng(e.id * 31 + Math.floor(this.now * 10));
      for (const c of set) {
        _d.set(c.ox * e.scale.x, c.oy * e.scale.y, c.oz * e.scale.z).applyQuaternion(_q);
        const wx = px + _d.x;
        const wy = py + _d.y;
        const wz = pz + _d.z;
        const out = _d.clone().normalize();
        const k = 1.5 + rand() * 2.5 + severity * 1.2;
        const vx = baseVel.x * 0.6 + dir.x * (2 + severity * 3) * rand() + out.x * k + (byCar ? this.carVelocity.x * 0.35 : 0);
        const vy = baseVel.y * 0.6 + Math.abs(out.y) * k + 1.5 + rand() * 2;
        const vz = baseVel.z * 0.6 + dir.z * (2 + severity * 3) * rand() + out.z * k + (byCar ? this.carVelocity.z * 0.35 : 0);
        const ok = this.spawnChunk(pool, arch.material, e.id, wx, wy, wz, _q, c.sx * e.scale.x, c.sy * e.scale.y, c.sz * e.scale.z, vx, vy, vz, colors[(rand() * colors.length) | 0], rand);
        if (ok) pieces++;
      }
    }

    const info: BreakInfo = {
      entity: e,
      material: arch.material,
      force,
      pos: _p.clone(),
      byCar,
      pieces,
      volume,
      kind: m.vanish ? "vanish" : force > arch.threshold * DISINTEGRATE ? "disintegrate" : "break",
    };
    this.recentBreaks++;
    this.events.onBreak(info);
    e.onBreak?.(info);
  }

  private wakeAround(p: THREE.Vector3, radius: number) {
    const { R, world } = this.physics;
    const ball = new R.Ball(radius);
    world.intersectionsWithShape({ x: p.x, y: p.y, z: p.z }, { x: 0, y: 0, z: 0, w: 1 }, ball, (col) => {
      const b = col.parent();
      if (b && b.isDynamic() && b.isSleeping()) b.wakeUp();
      return true;
    });
  }

  private hideEntity(e: Entity) {
    e.hidden = true;
    e.body.setEnabled(false);
    if (e.object) e.object.visible = false;
    else if (e.arch.mesh && e.slot >= 0) {
      e.arch.mesh.setMatrixAt(e.slot, HIDE);
      e.arch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* ── Chunks ─────────────────────────────────────────────── */

  private takeBody(): RAPIER.RigidBody | null {
    const { R, world } = this.physics;
    if (this.bodyCount >= this.tier.maxBodies) {
      // Budget full. First choice: the oldest resting chunk gives up its body and stays on the ground as
      // a static piece. Only if nothing rests does the oldest moving chunk lose its body and fade out.
      let p = this.opaque;
      let i = this.opaque.oldest(true, true);
      if (i < 0) {
        p = this.glass;
        i = this.glass.oldest(true, true);
      }
      if (i < 0) {
        p = this.opaque.count > 0 ? this.opaque : this.glass;
        i = p.oldest(true);
        if (i < 0) {
          p = p === this.opaque ? this.glass : this.opaque;
          i = p.oldest(true);
        }
        if (i < 0) return null;
        p.fade[i] = 0.3;
      }
      this.stripBody(p, i);
    }
    let body = this.freeBodies.pop();
    if (!body) {
      body = world.createRigidBody(R.RigidBodyDesc.dynamic().setCanSleep(true).setLinearDamping(0.18).setAngularDamping(0.35));
    } else body.setEnabled(true);
    this.bodyCount++;
    return body;
  }

  private stripBody(pool: DebrisPool, i: number) {
    const body = pool.bodies[i];
    if (!body) return;
    const col = pool.colliders[i];
    if (col) this.physics.world.removeCollider(col, false);
    this.byBody.delete(body.handle);
    body.setEnabled(false);
    this.freeBodies.push(body);
    pool.bodies[i] = null;
    pool.colliders[i] = null;
    this.bodyCount--;
    // Freeze the visual where it is.
    for (let k = 0; k < 7; k++) pool.prev[i * 7 + k] = pool.curr[i * 7 + k];
  }

  private spawnChunk(
    pool: DebrisPool,
    material: MaterialId,
    src: number,
    x: number,
    y: number,
    z: number,
    q: THREE.Quaternion,
    sx: number,
    sy: number,
    sz: number,
    vx: number,
    vy: number,
    vz: number,
    color: string,
    rand: () => number,
  ) {
    let i = pool.take();
    if (i < 0) {
      // Instance cap: recycle the oldest piece outright.
      const old = pool.oldest(false);
      if (old < 0) return false;
      this.stripBody(pool, old);
      pool.give(old);
      i = pool.take();
      if (i < 0) return false;
    }
    const { R, world } = this.physics;
    const body = this.takeBody();
    if (body) {
      body.setTranslation({ x, y, z }, false);
      body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, false);
      body.setLinvel({ x: vx, y: vy, z: vz }, true);
      body.setAngvel({ x: (rand() - 0.5) * 12, y: (rand() - 0.5) * 12, z: (rand() - 0.5) * 12 }, true);
      const col = world.createCollider(
        R.ColliderDesc.cuboid(Math.max(0.01, sx / 2), Math.max(0.01, sy / 2), Math.max(0.01, sz / 2))
          .setDensity(MATERIALS[material].density)
          .setFriction(0.8)
          .setRestitution(material === "glass" ? 0.05 : 0.15)
          .setCollisionGroups(debrisGroups(this.tier.debrisVsDebris)),
        body,
      );
      pool.bodies[i] = body;
      pool.colliders[i] = col;
      this.byBody.set(body.handle, -(i + 1) - (pool === this.glass ? 1_000_000 : 0));
    }
    pool.mat[i] = Object.keys(MATERIALS).indexOf(material);
    pool.size[i * 3] = sx;
    pool.size[i * 3 + 1] = sy;
    pool.size[i * 3 + 2] = sz;
    pool.age[i] = 0;
    pool.life[i] = 8 + rand() * 4;
    pool.born[i] = this.now + rand() * 0.001;
    pool.src[i] = src;
    pool.last[i] = this.stepId;
    const o = i * 7;
    pool.curr[o] = pool.prev[o] = x;
    pool.curr[o + 1] = pool.prev[o + 1] = y;
    pool.curr[o + 2] = pool.prev[o + 2] = z;
    pool.curr[o + 3] = pool.prev[o + 3] = q.x;
    pool.curr[o + 4] = pool.prev[o + 4] = q.y;
    pool.curr[o + 5] = pool.prev[o + 5] = q.z;
    pool.curr[o + 6] = pool.prev[o + 6] = q.w;
    for (let k = 0; k < 7; k++) pool.home[o + k] = pool.curr[o + k];
    pool.mesh.setColorAt(i, _c.set(color));
    if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
    return true;
  }

  /* ── After each physics step ─────────────────────────────── */

  sync() {
    this.stepId++;
    const step = this.stepId;
    this.physics.world.forEachActiveRigidBody((body) => {
      const ref = this.byBody.get(body.handle);
      if (ref === undefined) return;
      const t = body.translation();
      const r = body.rotation();
      if (ref >= 0) {
        const e = this.entities[ref];
        e.prevPos.copy(e.currPos);
        e.prevQuat.copy(e.currQuat);
        e.currPos.set(t.x, t.y, t.z);
        e.currQuat.set(r.x, r.y, r.z, r.w);
        e.lastActive = step;
        if (!e.listed) {
          e.listed = true;
          this.activeEntities.push(e.id);
        }
        // Fell off the island: quietly retire it.
        if (t.y < -20 && !e.broken) {
          e.broken = true;
          this.hideEntity(e);
        }
      } else {
        const glass = ref <= -1_000_000;
        const i = glass ? -(ref + 1_000_000) - 1 : -ref - 1;
        const pool = glass ? this.glass : this.opaque;
        const o = i * 7;
        for (let k = 0; k < 7; k++) pool.prev[o + k] = pool.curr[o + k];
        pool.curr[o] = t.x;
        pool.curr[o + 1] = t.y;
        pool.curr[o + 2] = t.z;
        pool.curr[o + 3] = r.x;
        pool.curr[o + 4] = r.y;
        pool.curr[o + 5] = r.z;
        pool.curr[o + 6] = r.w;
        pool.last[i] = step;
        if (t.y < -20) pool.fade[i] = 0.01;
      }
    });
  }

  /* ── Every frame ─────────────────────────────────────────── */

  render(alpha: number, dt: number) {
    const step = this.stepId;
    // Intact entities that moved recently.
    let w = 0;
    for (let k = 0; k < this.activeEntities.length; k++) {
      const e = this.entities[this.activeEntities[k]];
      if (e.hidden) {
        e.listed = false;
        continue;
      }
      if (e.lastActive >= step - 1) {
        _p.lerpVectors(e.prevPos, e.currPos, alpha);
        _q.slerpQuaternions(e.prevQuat, e.currQuat, alpha);
        this.writeEntity(e, _p, _q);
        this.activeEntities[w++] = e.id;
      } else {
        // Came to rest: one last exact write.
        e.prevPos.copy(e.currPos);
        e.prevQuat.copy(e.currQuat);
        this.writeEntity(e, e.currPos, e.currQuat);
        e.listed = false;
      }
    }
    this.activeEntities.length = w;
    for (const m of this.instanced) m.instanceMatrix.needsUpdate = true;

    this.recentBreaks = Math.max(0, this.recentBreaks - dt * 12);
    this.renderPool(this.opaque, alpha, dt, step);
    this.renderPool(this.glass, alpha, dt, step);
    if (this.rebuild) this.advanceRebuild(dt);
  }

  private renderPool(pool: DebrisPool, alpha: number, dt: number, step: number) {
    let dirty = false;
    for (let i = 0; i < pool.highWater; i++) {
      if (!pool.active[i]) continue;
      pool.age[i] += dt;
      const o = i * 7;
      // Lifetime: shorter when far from the car or out of view.
      if (!pool.flying[i]) {
        _p.set(pool.curr[o], pool.curr[o + 1], pool.curr[o + 2]);
        if (pool.age[i] > 2 && (i + step) % 30 === 0) {
          const far = _p.distanceToSquared(this.carPos) > 80 * 80;
          const unseen = this.frustum ? !this.frustum.containsPoint(_p) : false;
          if (far || unseen) pool.life[i] = Math.min(pool.life[i], pool.age[i] + (unseen ? 2 : 4));
        }
        if (pool.fade[i] === 0 && pool.age[i] > pool.life[i]) pool.fade[i] = 0.6;
      }
      let scale = 1;
      if (pool.fade[i] > 0) {
        pool.fade[i] -= dt;
        scale = Math.max(0, pool.fade[i] / 0.6);
        if (pool.fade[i] <= 0) {
          this.stripBody(pool, i);
          pool.give(i);
          dirty = true;
          continue;
        }
      }
      const moving = pool.last[i] >= step - 1 || pool.fade[i] > 0 || pool.flying[i];
      if (!moving && pool.age[i] > 0.5) continue;
      const a = pool.bodies[i] && !pool.flying[i] ? alpha : 1;
      _p.set(
        pool.prev[o] + (pool.curr[o] - pool.prev[o]) * a,
        pool.prev[o + 1] + (pool.curr[o + 1] - pool.prev[o + 1]) * a,
        pool.prev[o + 2] + (pool.curr[o + 2] - pool.prev[o + 2]) * a,
      );
      slerpInto(_q, pool.prev, pool.curr, o + 3, a);
      _s.set(pool.size[i * 3] * scale, pool.size[i * 3 + 1] * scale, pool.size[i * 3 + 2] * scale);
      _m.compose(_p, _q, _s);
      pool.mesh.setMatrixAt(i, _m);
      dirty = true;
    }
    if (dirty) pool.mesh.instanceMatrix.needsUpdate = true;
  }

  private writeEntity(e: Entity, p: THREE.Vector3, q: THREE.Quaternion) {
    if (e.object) {
      e.object.position.copy(p);
      e.object.quaternion.copy(q);
      return;
    }
    if (!e.arch.mesh || e.slot < 0) return;
    _m.compose(p, q, e.scale);
    e.arch.mesh.setMatrixAt(e.slot, _m);
  }

  /* ── Rebuild ─────────────────────────────────────────────── */

  startRebuild() {
    if (this.rebuild) return false;
    const restoring = this.entities.filter((e) => e.broken && !e.temp && !(e as { despawned?: boolean }).despawned);
    const displaced: Array<{ e: Entity; from: THREE.Vector3; fromQ: THREE.Quaternion }> = [];
    for (const e of this.entities) {
      if (e.broken || e.temp) continue;
      if (e.currPos.distanceToSquared(e.homePos) > 0.0025 || 1 - Math.abs(e.currQuat.dot(e.homeQuat)) > 1e-4) {
        e.body.setEnabled(false);
        displaced.push({ e, from: e.currPos.clone(), fromQ: e.currQuat.clone() });
      }
    }
    // Chunks give up physics and fly home.
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) {
        if (!pool.active[i] || pool.fade[i] > 0) continue;
        if (pool.src[i] < 0 || !this.entities[pool.src[i]]?.broken) {
          pool.fade[i] = 0.4;
          continue;
        }
        this.stripBody(pool, i);
        pool.flying[i] = 1;
        const o = i * 7;
        for (let k = 0; k < 7; k++) pool.prev[o + k] = pool.curr[o + k];
      }
    }
    if (!restoring.length && !displaced.length && !this.hasFlying()) return false;
    this.rebuild = { t: 0, duration: 1.1, restoring, displaced };
    return true;
  }

  private hasFlying() {
    for (const pool of [this.opaque, this.glass]) for (let i = 0; i < pool.highWater; i++) if (pool.flying[i]) return true;
    return false;
  }

  private advanceRebuild(dt: number) {
    const rb = this.rebuild;
    if (!rb) return;
    rb.t = Math.min(1, rb.t + dt / rb.duration);
    const e = rb.t < 0.5 ? 4 * rb.t ** 3 : 1 - (-2 * rb.t + 2) ** 3 / 2;
    // Chunks: from where they lay (prev) to home.
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) {
        if (!pool.flying[i]) continue;
        const o = i * 7;
        for (let k = 0; k < 3; k++) pool.curr[o + k] = pool.prev[o + k] + (pool.home[o + k] - pool.prev[o + k]) * e;
        slerpInto(_q, pool.prev, pool.home, o + 3, e);
        pool.curr[o + 3] = _q.x;
        pool.curr[o + 4] = _q.y;
        pool.curr[o + 5] = _q.z;
        pool.curr[o + 6] = _q.w;
        pool.age[i] = 0;
      }
    }
    for (const d of rb.displaced) {
      _p.lerpVectors(d.from, d.e.homePos, e);
      _q.slerpQuaternions(d.fromQ, d.e.homeQuat, e);
      this.writeEntity(d.e, _p, _q);
    }
    for (const m of this.instanced) m.instanceMatrix.needsUpdate = true;
    if (rb.t >= 1) this.finishRebuild();
  }

  private finishRebuild() {
    const rb = this.rebuild;
    if (!rb) return;
    this.rebuild = null;
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) if (pool.flying[i]) pool.give(i);
    }
    for (const d of rb.displaced) this.restore(d.e, false);
    for (const e of rb.restoring) this.restore(e, true);
  }

  /** Player hit something mid-rebuild: stop cleanly where things are. */
  cancelRebuild() {
    const rb = this.rebuild;
    if (!rb) return;
    this.rebuild = null;
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) {
        if (!pool.flying[i]) continue;
        pool.flying[i] = 0;
        pool.fade[i] = 0.35;
      }
    }
    // Displaced but whole pieces get physics back exactly where the animation left them.
    for (const d of rb.displaced) {
      const t = rb.t < 0.5 ? 4 * rb.t ** 3 : 1 - (-2 * rb.t + 2) ** 3 / 2;
      _p.lerpVectors(d.from, d.e.homePos, t);
      _q.slerpQuaternions(d.fromQ, d.e.homeQuat, t);
      d.e.body.setEnabled(true);
      d.e.body.setTranslation({ x: _p.x, y: _p.y, z: _p.z }, true);
      d.e.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
      d.e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      d.e.currPos.copy(_p);
      d.e.prevPos.copy(_p);
      d.e.currQuat.copy(_q);
      d.e.prevQuat.copy(_q);
    }
  }

  get rebuilding() {
    return this.rebuild !== null;
  }

  private overlapsCar(e: Entity) {
    const half = Math.max(e.arch.size[0], e.arch.size[1], e.arch.size[2]) * 0.6 + 1.8;
    return e.homePos.distanceToSquared(this.carPos) < half * half;
  }

  /** Put an entity back at home, whole and asleep. Defers if the car is parked in its spot. */
  restore(e: Entity, wasBroken: boolean) {
    if (this.overlapsCar(e)) {
      if (!this.pendingRestore.includes(e)) this.pendingRestore.push(e);
      if (!e.hidden) this.hideEntity(e);
      e.broken = true;
      return;
    }
    const { R } = this.physics;
    const b = e.body;
    if (e.arch.anchored && b.bodyType() !== R.RigidBodyType.Fixed) b.setBodyType(R.RigidBodyType.Fixed, false);
    e.anchored = !!e.arch.anchored;
    b.setEnabled(true);
    b.setTranslation({ x: e.homePos.x, y: e.homePos.y, z: e.homePos.z }, false);
    b.setRotation({ x: e.homeQuat.x, y: e.homeQuat.y, z: e.homeQuat.z, w: e.homeQuat.w }, false);
    b.setLinvel({ x: 0, y: 0, z: 0 }, false);
    b.setAngvel({ x: 0, y: 0, z: 0 }, false);
    if (b.isDynamic()) b.sleep();
    e.broken = false;
    e.hidden = false;
    e.toppled = false;
    e.knocked = false;
    e.prevPos.copy(e.homePos);
    e.currPos.copy(e.homePos);
    e.prevQuat.copy(e.homeQuat);
    e.currQuat.copy(e.homeQuat);
    if (e.object) e.object.visible = true;
    this.writeEntity(e, e.homePos, e.homeQuat);
    if (e.arch.mesh) e.arch.mesh.instanceMatrix.needsUpdate = true;
    void wasBroken;
  }

  /** Retry deferred restores once the car has moved on. */
  tickPending() {
    if (!this.pendingRestore.length) return;
    const still: Entity[] = [];
    for (const e of this.pendingRestore) {
      if (this.overlapsCar(e)) still.push(e);
      else this.restore(e, true);
    }
    this.pendingRestore = still;
  }

  /** Every chunk gone, every object home (used when leaving Demolition Rush). */
  clearDebris() {
    for (const pool of [this.opaque, this.glass]) {
      for (let i = 0; i < pool.highWater; i++) {
        if (!pool.active[i]) continue;
        this.stripBody(pool, i);
        pool.give(i);
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose() {
    for (const a of this.archetypes.values()) {
      if (a.mesh) {
        a.mesh.geometry.dispose();
        a.mesh.dispose();
      }
    }
    for (const pool of [this.opaque, this.glass]) {
      pool.mesh.geometry.dispose();
      (pool.mesh.material as THREE.Material).dispose();
      pool.mesh.dispose();
    }
    for (const e of this.entities) {
      e.object?.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    }
  }
}

const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion();

/** Slerp two quaternions stored at the same offset of two typed arrays, into `out`. */
function slerpInto(out: THREE.Quaternion, a: Float32Array, b: Float32Array, o: number, t: number) {
  _q0.set(a[o], a[o + 1], a[o + 2], a[o + 3]);
  _q1.set(b[o], b[o + 1], b[o + 2], b[o + 3]);
  return out.slerpQuaternions(_q0, _q1, t);
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


