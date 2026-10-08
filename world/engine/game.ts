import * as THREE from "three";
import { ACHIEVEMENTS, BOLT_COUNT, DEFAULT_PREFS, KEYS, readJSON, readList, readNumbers, readStats, writeJSON, type Car as CarPrefs, type Prefs, type Stats, type TimeOfDay } from "@/lib/progress";
import { ZONES, type ZoneId } from "@/lib/zones";
import { CHARSET } from "@/lib/drums";
import { COMBO_MAX, COMBO_WINDOW, LONG_JUMP, MAX_STEPS_PER_FRAME, PALETTE, STEP, TIERS, TIER_ORDER, CAR_COLORS, PAD_SPEED, type Tier } from "./config";
import { WorldAudio } from "./audio";
import { CameraRig } from "./camera";
import { Car } from "./car";
import { Destruction, MATERIALS, type BreakInfo } from "./destruction";
import { Particles, Skids } from "./fx";
import { Input, type Action } from "./input";
import { disposeMaterials, lambert } from "./materials";
import { Physics, type Rapier } from "./physics";
import { command, pushToast, showBanner, telemetry, ui, type Command } from "./store";
import { buildIsland, type Island } from "../build/island";
import { contentPad, floatingLabel, type Pad, type WorldCtx } from "../build/common";
import { BOLTS, REBUILD_PAD, RUSH_PAD, SPAWN, ZONE_LAYOUT, type ZoneLayout } from "../build/layout";
import { defineArchetypes } from "../build/archetypes";
import { buildScenery } from "../build/scenery";
import { buildZones, type ZoneHooks } from "../build/zones";

export type GameOpts = {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  R: Rapier;
  tier: Tier;
  reduced: boolean;
  setDpr: (dpr: number) => void;
};

type ZoneRuntime = { layout: ZoneLayout; pad: Pad; label: THREE.Object3D; hooks: ZoneHooks };

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _frustum = new THREE.Frustum();
const _pm = new THREE.Matrix4();

export class Game {
  readonly gl: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly physics: Physics;
  readonly input = new Input();
  readonly rig: CameraRig;
  readonly particles: Particles;
  readonly skids: Skids;
  readonly destruction: Destruction;
  readonly audio = new WorldAudio();
  readonly root = new THREE.Group();
  readonly billboards: THREE.Object3D[] = [];
  readonly ctx: WorldCtx;
  car!: Car;
  island!: Island;
  zones: ZoneRuntime[] = [];
  readonly reduced: boolean;
  tier: Tier;
  time = 0;

  private updaters: Array<(dt: number, t: number) => void> = [];
  private actions: Action[] = [];
  private setDpr: (dpr: number) => void;

  // Gameplay state
  prefs: Prefs;
  stats: Stats;
  achievements: Set<string>;
  bolts: Set<number>;
  visited: Set<string>;
  private dirty = false;
  private saveAt = 0;
  score = 0;
  combo = 0;
  private lastBreak = -99;
  private padOn: ZoneId | "rebuild" | "rush" | null = null;
  private padDismissed: string | null = null;
  private region: ZoneId | null = null;
  checkpoint = { x: SPAWN.x, z: SPAWN.z - 14, yaw: SPAWN.yaw };
  private crashCooldown = 0;
  private hitStop = 0;
  private slowmo = 0;
  private preStepVel = new THREE.Vector3();
  private punchThrough = false;
  private boltMesh!: THREE.InstancedMesh;
  private hornCount = 0;
  private rebuilds = 0;
  private photoRequested = false;
  private frameTimes: number[] = [];
  private tierCheckAt = 4;
  private introAt = 0;
  private hintTimer = 0;
  private wasPanel = false;
  private steering = 0;
  private dragging: { x: number; y: number } | null = null;
  /** What the plates say when they are not showing speed. */
  plateText = "ARMAN";
  /** Hold the plates on an easter egg until this time. */
  plateHold = 0;
  private plateShowing = "";
  private honks: number[] = [];
  onHorn: ((times: number) => void) | null = null;
  /** Places where E does something (open a link, copy, open the CV). */
  readonly contexts: Array<{ x: number; z: number; r: number; label: string; run: () => void }> = [];
  private context: { label: string; run: () => void } | null = null;
  /** Demolition Rush, registered by the arena builder. */
  rush: { start: () => void; active: () => boolean } | null = null;
  /** Dojo mini-game, registered by the dojo builder. */
  dojo: { start: () => void } | null = null;

  constructor(opts: GameOpts) {
    this.gl = opts.gl;
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.reduced = opts.reduced;
    this.tier = opts.tier;
    this.setDpr = opts.setDpr;
    this.physics = new Physics(opts.R);
    const cfg = TIERS[this.tier];
    this.particles = new Particles(TIERS.high.particles);
    this.particles.scale = (cfg.particles / TIERS.high.particles) * (this.reduced ? 0.5 : 1);
    this.skids = new Skids(this.tier === "low" ? 220 : 600);
    this.destruction = new Destruction(this.physics, this.particles, cfg, { onBreak: (i) => this.onBreak(i) });
    this.rig = new CameraRig(this.camera, this.physics);
    this.rig.reduced = this.reduced;
    this.ctx = { group: this.root, billboards: this.billboards, addUpdate: (fn) => this.updaters.push(fn) };

    this.prefs = { ...DEFAULT_PREFS, ...readJSON<Partial<Prefs>>(KEYS.prefs, {}) };
    this.stats = readStats();
    this.achievements = new Set(readList(KEYS.achievements));
    this.bolts = new Set(readNumbers(KEYS.bolts));
    this.visited = new Set(readList(KEYS.visited));
  }

  /** Build the world in chunks so the loader counter can move. */
  async build(progress: (p: number) => void) {
    const yieldFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const cfg = TIERS[this.tier];
    this.scene.add(this.root);
    this.scene.background = null;

    this.island = buildIsland(this.physics, cfg.shadows ? cfg.shadowMap : 0, this.tier === "low" ? 1024 : 2048);
    this.root.add(this.island.group);
    this.scene.fog = this.island.fog;
    this.island.fog.far = cfg.fogFar;
    progress(0.3);
    await yieldFrame();

    defineArchetypes(this.destruction, this.tier, this.island.lampMat);
    this.root.add(this.destruction.group, this.particles.group, this.skids.mesh);
    progress(0.45);
    await yieldFrame();

    const carPrefs = readJSON<Partial<CarPrefs>>(KEYS.car, {});
    const color = CAR_COLORS.find((c) => c.hex === carPrefs.color)?.hex ?? PALETTE.red;
    const plate = sanitizePlate(carPrefs.plate ?? "ARMAN");
    this.plateText = plate;
    this.plateShowing = plate;
    this.car = new Car(this.physics, color, plate, {
      onLand: (air, dist) => this.onLand(air, dist),
      onBoostStart: () => this.audio.play("boost"),
    });
    this.root.add(this.car.group);
    this.car.place(SPAWN.x, 1.2, SPAWN.z, SPAWN.yaw);
    this.destruction.carHandle = this.car.collider.handle;
    progress(0.55);
    await yieldFrame();

    buildScenery(this);
    progress(0.7);
    await yieldFrame();

    const hooks = buildZones(this);
    for (const layout of ZONE_LAYOUT) {
      const zone = ZONES.find((z) => z.id === layout.id)!;
      const pad = contentPad(this.ctx, layout.pad.x, layout.pad.z, layout.pad.r);
      const label = floatingLabel(this.ctx, zone.label, layout.pad.x, 4.2, layout.pad.z, { width: 6.4, sub: "Slow down to open" });
      this.zones.push({ layout, pad, label, hooks: hooks[layout.id] ?? {} });
    }
    // Utility pads: rebuild and Demolition Rush.
    const rb = contentPad(this.ctx, REBUILD_PAD.x, REBUILD_PAD.z, REBUILD_PAD.r, PALETTE.paper);
    floatingLabel(this.ctx, "Rebuild world", REBUILD_PAD.x, 3.6, REBUILD_PAD.z, { width: 5.2, sub: "Or press B", fg: PALETTE.paper });
    this.updaters.push(() => rb.setActive(this.padOn === "rebuild"));
    const rush = contentPad(this.ctx, RUSH_PAD.x, RUSH_PAD.z, RUSH_PAD.r, PALETTE.red);
    floatingLabel(this.ctx, "Demolition rush", RUSH_PAD.x, 3.6, RUSH_PAD.z, { width: 5.8, sub: "60 seconds", fg: PALETTE.redHi });
    this.updaters.push(() => rush.setActive(this.padOn === "rush"));
    progress(0.85);
    await yieldFrame();

    this.buildBolts();
    this.island.setTime(this.prefs.time);
    this.applyTime(this.prefs.time, false);
    this.applyTier(this.tier, false);

    this.input.attach();
    this.input.onImmediate = (action) => {
      if (action !== "interact" || ui.get().panel || !this.context) return false;
      this.context.run();
      return true;
    };
    this.input.onDevice = (d) => ui.set({ device: d });
    ui.set({ bolts: this.bolts.size, time: this.prefs.time, tier: this.tier, tierManual: this.prefs.quality !== "auto" });
    this.attachPointer();

    // Warm up: compile shaders before the title so the first drive doesn't hitch.
    this.gl.compile(this.scene, this.camera);
    progress(1);
  }

  /* ── Bolts ──────────────────────────────────────────────── */

  private buildBolts() {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 6);
    geo.rotateX(Math.PI / 2);
    const hole = new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12);
    hole.rotateX(Math.PI / 2);
    this.boltMesh = new THREE.InstancedMesh(geo, lambert(PALETTE.signal, { emissive: PALETTE.signal, emissiveIntensity: 0.35 }), BOLTS.length);
    this.boltMesh.castShadow = true;
    this.root.add(this.boltMesh);
    const m = new THREE.Matrix4();
    this.updaters.push((dt, t) => {
      for (let i = 0; i < BOLTS.length; i++) {
        if (this.bolts.has(i)) {
          m.makeScale(0, 0, 0);
        } else {
          const [x, z] = BOLTS[i];
          m.makeRotationY(t * 1.8 + i);
          m.setPosition(x, 1.1 + Math.sin(t * 2 + i) * 0.18, z);
        }
        this.boltMesh.setMatrixAt(i, m);
      }
      this.boltMesh.instanceMatrix.needsUpdate = true;
      if (ui.get().phase !== "play") return;
      const p = this.car.group.position;
      for (let i = 0; i < BOLTS.length; i++) {
        if (this.bolts.has(i)) continue;
        const dx = p.x - BOLTS[i][0];
        const dz = p.z - BOLTS[i][1];
        if (dx * dx + dz * dz < 5.5 && p.y < 4) this.collectBolt(i);
      }
      void dt;
    });
  }

  private collectBolt(i: number) {
    this.bolts.add(i);
    this.particles.emit("glint", BOLTS[i][0], 1.1, BOLTS[i][1], 8, 3, 0, 1, 0, 0.6, PALETTE.signal);
    this.audio.play("bolt");
    ui.set({ bolts: this.bolts.size });
    writeJSON(KEYS.bolts, [...this.bolts]);
    if (this.bolts.size >= BOLT_COUNT) this.unlock("all-bolts");
  }

  /* ── Progress ────────────────────────────────────────────── */

  unlock(id: string) {
    if (this.achievements.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    this.achievements.add(id);
    writeJSON(KEYS.achievements, [...this.achievements]);
    pushToast({ kind: "achievement", title: a.label, body: a.detail, meta: "Achievement" }, 4200);
    this.audio.play("achievement");
  }

  bumpStat<K extends keyof Stats>(key: K, by = 1) {
    this.stats[key] = (this.stats[key] + by) as Stats[K];
    this.dirty = true;
  }

  maxStat<K extends keyof Stats>(key: K, value: number) {
    if (value > this.stats[key]) {
      this.stats[key] = value as Stats[K];
      this.dirty = true;
    }
  }

  private save(force = false) {
    if (!this.dirty && !force) return;
    if (!force && this.time < this.saveAt) return;
    writeJSON(KEYS.stats, this.stats);
    this.dirty = false;
    this.saveAt = this.time + 2;
  }

  addScore(points: number) {
    this.score += points;
    const rush = ui.get().rush;
    if (rush.active) ui.set({ rush: { ...rush, score: rush.score + points } });
    ui.set({ score: this.score });
  }

  /* ── Events ──────────────────────────────────────────────── */

  /** Last few break events (debug overlay and QA). */
  readonly breakLog: string[] = [];

  private onBreak(info: BreakInfo) {
    this.breakLog.push(`${this.time.toFixed(2)} ${info.entity.arch.id} ${info.kind} ${Math.round(info.force)}N${info.byCar ? " car" : ""}`);
    if (this.breakLog.length > 30) this.breakLog.shift();
    const m = MATERIALS[info.material];
    const intensity = Math.min(1, info.force / (info.entity.arch.threshold * 3));
    this.audio.breakSound(info.material, intensity);
    if (info.kind !== "topple") {
      this.bumpStat("destroyed");
      if (!this.achievements.has("first-break")) this.unlock("first-break");
    }
    // Combo: a new break within the window extends it.
    if (this.time - this.lastBreak < COMBO_WINDOW) this.combo = Math.min(COMBO_MAX, this.combo + 1);
    else this.combo = 1;
    this.lastBreak = this.time;
    this.maxStat("bestCombo", this.combo);
    if (this.combo >= COMBO_MAX) this.unlock("combo-10");
    const base = m.score * (info.entity.arch.scoreMul ?? 1) * (1 + Math.cbrt(info.volume) * 2) * (info.kind === "disintegrate" ? 1.5 : 1);
    this.addScore(Math.round(base * this.combo));
    ui.set({ combo: this.combo });

    if (info.byCar) {
      if (info.kind !== "topple") this.punchThrough = true;
      this.rig.addTrauma(Math.min(0.55, 0.12 + intensity * 0.5));
      if (!this.reduced && info.force > info.entity.arch.threshold * 3) this.hitStop = Math.max(this.hitStop, 0.055);
      this.haptic(intensity > 0.6 ? 40 : 18);
    }
    // A single impact that takes out a whole cluster: brief slow motion.
    if (this.destruction.recentBreaks >= 6 && this.prefs.replays && !this.reduced && this.slowmo <= 0) {
      this.slowmo = 0.4;
      this.rig.fovBase = 50;
    }
  }

  private onLand(air: number, distance: number) {
    this.audio.play("land");
    this.rig.addTrauma(Math.min(0.4, air * 0.25));
    this.maxStat("longestJump", Math.round(distance * 10) / 10);
    if (distance >= LONG_JUMP) this.unlock("long-jump");
  }

  haptic(ms: number) {
    if (ui.get().device !== "touch") return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* unsupported */
    }
  }

  /* ── Main loop ───────────────────────────────────────────── */

  frame(rawDt: number) {
    const dt = Math.min(rawDt, 0.1);
    this.time += dt;
    const state = ui.get();
    this.trackFrame(rawDt);

    this.input.suspended = state.panel !== null || state.helpOpen || state.paused || state.customizeOpen || state.zoneMenuOpen;
    this.input.poll();
    this.handleActions();

    const playing = state.phase === "play" && !state.paused;
    const driving = playing && state.panel === null && !state.helpOpen && !state.photo;

    // Simulation, fixed 60 Hz.
    const t0 = performance.now();
    if (state.phase !== "loading" && !state.paused && typeof document !== "undefined" && !document.hidden) {
      let scale = 1;
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        scale = 0;
      } else if (this.slowmo > 0) {
        this.slowmo -= dt;
        scale = 0.3;
        if (this.slowmo <= 0) this.rig.fovBase = 58;
      }
      this.physics.accumulator += dt * scale;
      let steps = 0;
      while (this.physics.accumulator >= STEP && steps < MAX_STEPS_PER_FRAME) {
        this.fixedStep(driving || this.car.autopilot !== null);
        this.physics.accumulator -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) this.physics.accumulator = 0;
      this.physics.alpha = this.physics.accumulator / STEP;
    }
    telemetry.physicsMs = performance.now() - t0;

    const alpha = this.physics.alpha;
    this.car.render(alpha, this.time);
    this.destruction.carPos.copy(this.car.group.position);
    this.destruction.render(alpha, dt);
    if ((Math.floor(this.time * 2) & 1) === 0) this.destruction.tickPending();

    // Camera.
    if (state.phase === "title" || state.phase === "loading") this.rig.updateTitle(dt);
    else this.rig.update(dt, this.car, this.steering, this.input.axes.lookX, this.input.axes.lookY);

    this.camera.updateMatrixWorld();
    _pm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_pm);
    this.destruction.frustum = _frustum;

    // Effects.
    this.carEffects(dt, driving);
    this.particles.update(dt, this.scene.fog as THREE.Fog | null);
    this.skids.update(dt);
    this.island.followSun(this.car.group.position);

    // Billboards face the camera (yaw only).
    for (const b of this.billboards) {
      b.rotation.y = Math.atan2(this.camera.position.x - b.position.x, this.camera.position.z - b.position.z);
    }
    for (const fn of this.updaters) fn(dt, this.time);

    if (playing) this.zoneLogic();
    this.comboTick();
    this.audioTick(state.phase === "play");
    this.writeTelemetry();
    this.save();

    if (this.photoRequested) this.capturePhoto();
  }

  private fixedStep(driving: boolean) {
    const car = this.car;
    car.applyControls(this.input.axes, STEP, driving, this.time);
    this.steering = this.input.axes.steer;
    const lv = car.body.linvel();
    this.preStepVel.set(lv.x, lv.y, lv.z);
    this.destruction.carVelocity.copy(this.preStepVel);
    this.destruction.carPos.copy(car.currPos);
    this.punchThrough = false;

    this.physics.world.step(this.physics.queue);

    let carHit = 0;
    const carHandle = car.collider.handle;
    this.physics.queue.drainContactForceEvents((ev) => {
      const h1 = ev.collider1();
      const h2 = ev.collider2();
      const f = ev.totalForceMagnitude();
      const hit = this.destruction.contact(h1, h2, f);
      if (!hit && (h1 === carHandle || h2 === carHandle)) carHit = Math.max(carHit, f);
    });
    this.destruction.process(this.time);
    this.destruction.sync();
    car.afterStep(STEP);

    // Punch-through: smashing something keeps most of the car's speed.
    if (this.punchThrough) {
      const v = car.body.linvel();
      const k = 0.78;
      car.body.setLinvel({ x: v.x + (this.preStepVel.x - v.x) * k, y: v.y, z: v.z + (this.preStepVel.z - v.z) * k }, true);
    }
    // A solid hit (wall, building, sea wall).
    if (carHit > 9000 && this.crashCooldown <= 0) {
      const k = Math.min(1, carHit / 60000);
      this.audio.crash(k);
      this.rig.addTrauma(0.15 + k * 0.4);
      this.particles.emit("dust", car.currPos.x, car.currPos.y, car.currPos.z, 4, 2);
      this.haptic(30);
      this.crashCooldown = 0.25;
      if (this.destruction.rebuilding) this.destruction.cancelRebuild();
    }
    this.crashCooldown -= STEP;
    if (this.destruction.rebuilding && this.punchThrough) this.destruction.cancelRebuild();

    // Fell into the sea.
    if (car.currPos.y < -4) this.respawn();
  }

  private carEffects(dt: number, driving: boolean) {
    const car = this.car;
    const p = car.group.position;
    // Tyre smoke and skids on drift or hard slides.
    const sliding = car.grounded > 1 && (Math.abs(car.lateralSlip) > 4.5 || (car.handbrake && Math.abs(car.speed) > 6));
    for (let w = 0; w < 2; w++) {
      const i = 2 + w;
      const contact = car.controller.wheelContactPoint(i);
      if (sliding && contact && car.controller.wheelIsInContact(i)) {
        _v.set(contact.x, contact.y, contact.z);
        this.skids.mark(w as 0 | 1, _v);
        if (Math.random() < 0.6) this.particles.emit("smoke", _v.x, _v.y + 0.2, _v.z, 1, 1.2, 0, 0.6, 0, 0.6);
      } else this.skids.mark(w as 0 | 1, null);
    }
    // Dust trail off-road at speed.
    const speed = Math.abs(car.speed);
    if (car.grounded > 2 && speed > 12 && Math.random() < 0.25) {
      _w.set(0, -0.6, -1.4).applyQuaternion(car.group.quaternion).add(p);
      this.particles.emit("dust", _w.x, _w.y, _w.z, 1, 1, 0, 0.3, 0, 0.5);
    }
    // Plates: the drum text, or the speed while boosting (km/h on the drums).
    if (this.time > this.plateHold) {
      const want = car.boosting ? `${Math.round(Math.abs(car.speed) * 3.6)} KMH` : this.plateText;
      if (want !== this.plateShowing && (!car.boosting || Math.floor(this.time * 4) !== Math.floor((this.time - dt) * 4))) {
        this.plateShowing = want;
        car.plates.roll(want, this.time, car.boosting ? 0.02 : 0.05);
      }
    }
    car.plates.update(this.time);
    // Boost flame.
    if (car.boosting) {
      _w.copy(car.exhaust).applyQuaternion(car.group.quaternion).add(p);
      _v.set(0, 0, -1).applyQuaternion(car.group.quaternion).multiplyScalar(6);
      this.particles.emit("flame", _w.x, _w.y, _w.z, 2, 2, _v.x, _v.y, _v.z, 0.3);
    }
    void dt;
    void driving;
  }

  private comboTick() {
    const left = COMBO_WINDOW - (this.time - this.lastBreak);
    telemetry.comboTime = Math.max(0, left);
    if (left <= 0 && this.combo !== 0) {
      this.combo = 0;
      ui.set({ combo: 0 });
    }
  }

  private audioTick(play: boolean) {
    if (!play) {
      this.audio.idle();
      return;
    }
    const a = this.input.axes;
    this.audio.update(this.car.speed, a.throttle, this.car.lateralSlip, this.car.boosting, this.car.grounded > 0, this.time);
  }

  private writeTelemetry() {
    const car = this.car;
    telemetry.speed = car.speed * 3.6;
    telemetry.boost = car.boost;
    telemetry.boosting = car.boosting;
    telemetry.heading = car.yaw;
    telemetry.x = car.group.position.x;
    telemetry.z = car.group.position.z;
    if (ui.get().debug) {
      const info = this.gl.info;
      telemetry.drawCalls = info.render.calls;
      telemetry.triangles = info.render.triangles;
      telemetry.bodies = this.physics.world.bodies.len();
      telemetry.activeBodies = this.destruction.activeBodies;
      telemetry.debris = this.destruction.debrisCount;
      telemetry.particles = this.particles.count;
      telemetry.pool = this.destruction.poolUsage;
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      telemetry.memory = `${info.memory.geometries} geo · ${info.memory.textures} tex${mem ? ` · ${(mem.usedJSHeapSize / 1048576).toFixed(0)} MB heap` : ""}`;
    }
  }

  /* ── Zones and pads ──────────────────────────────────────── */

  private zoneLogic() {
    const p = this.car.group.position;
    const speed = Math.abs(this.car.speed);
    const state = ui.get();

    // Region banners.
    let region: ZoneId | null = null;
    for (const z of this.zones) {
      const dx = p.x - z.layout.center.x;
      const dz = p.z - z.layout.center.z;
      if (dx * dx + dz * dz < z.layout.center.r * z.layout.center.r) {
        region = z.layout.id;
        break;
      }
    }
    if (region !== this.region) {
      if (region) {
        const label = ZONES.find((z) => z.id === region)!.label;
        showBanner(`Entering: ${label}`);
        this.audio.play("chime");
        if (!this.visited.has(region)) {
          this.visited.add(region);
          writeJSON(KEYS.visited, [...this.visited]);
          this.dirty = true;
          if (this.visited.size >= ZONES.length) this.unlock("grand-tour");
        }
        this.zones.find((z) => z.layout.id === region)?.hooks.onEnter?.();
      }
      this.region = region;
    }

    // Pads.
    let on: ZoneId | "rebuild" | "rush" | null = null;
    for (const z of this.zones) {
      const dx = p.x - z.layout.pad.x;
      const dz = p.z - z.layout.pad.z;
      const inside = dx * dx + dz * dz < z.layout.pad.r * z.layout.pad.r;
      z.pad.setActive(inside);
      if (inside) on = z.layout.id;
    }
    if (dist2(p.x, p.z, REBUILD_PAD.x, REBUILD_PAD.z) < REBUILD_PAD.r ** 2) on = "rebuild";
    if (dist2(p.x, p.z, RUSH_PAD.x, RUSH_PAD.z) < RUSH_PAD.r ** 2) on = "rush";

    if (on !== this.padOn) {
      this.padOn = on;
      if (on === null) this.padDismissed = null;
    }
    if (on && on !== this.padDismissed && speed < PAD_SPEED && state.panel === null) {
      if (on === "rebuild") {
        this.padDismissed = on;
        this.rebuildWorld();
      } else if (on === "rush") {
        this.padDismissed = on;
        this.rush?.start();
      } else {
        this.openPanel(on);
      }
    }
    // Context actions (links, copy) within reach.
    this.context = null;
    for (const c of this.contexts) {
      if (dist2(p.x, p.z, c.x, c.z) < c.r * c.r) {
        this.context = c;
        break;
      }
    }
    // Contextual prompt.
    const prompt = state.panel
      ? "E Close"
      : this.context
        ? `E ${this.context.label}`
        : on && on !== "rebuild" && on !== "rush" && speed >= PAD_SPEED
          ? "Slow down to open"
          : null;
    if (prompt !== state.prompt) ui.set({ prompt });

    const panel = state.panel !== null;
    if (panel !== this.wasPanel) this.wasPanel = panel;
  }

  openPanel(id: ZoneId) {
    const layout = ZONE_LAYOUT.find((z) => z.id === id)!;
    this.checkpoint = { x: layout.pad.x, z: layout.pad.z + 2, yaw: this.car.yaw };
    this.padDismissed = id;
    ui.set({ panel: id });
    this.audio.play("tick");
  }

  closePanel() {
    ui.set({ panel: null });
    this.audio.play("click");
  }

  /* ── Commands (keys, gamepad, HUD) ──────────────────────── */

  private handleActions() {
    for (const a of this.input.drain(this.actions)) this.command(a as Command);
  }

  command(cmd: Command | Action, arg?: unknown) {
    const s = ui.get();
    switch (cmd) {
      case "start":
        if (s.phase === "title") this.start();
        break;
      case "interact":
        if (s.helpOpen || s.paused) break;
        if (s.panel) this.closePanel();
        else if (this.context) this.context.run();
        else if (this.padOn && this.padOn !== "rebuild" && this.padOn !== "rush") this.openPanel(this.padOn);
        else this.zones.forEach((z) => z.hooks.onInteract?.());
        break;
      case "closePanel":
        this.closePanel();
        break;
      case "respawn":
        if (s.phase === "play") this.respawn();
        break;
      case "rebuild":
        if (s.phase === "play") this.rebuildWorld();
        break;
      case "camera": {
        const order = ["chase", "far", "top"] as const;
        const next = order[(order.indexOf(s.cameraMode) + 1) % order.length];
        this.rig.mode = next;
        ui.set({ cameraMode: next });
        break;
      }
      case "freeLook":
        this.rig.freeLock = !this.rig.freeLock;
        pushToast({ kind: "info", title: this.rig.freeLock ? "Free look: drag to orbit" : "Free look off" }, 1600);
        break;
      case "time": {
        const order: TimeOfDay[] = ["day", "dusk", "night"];
        this.applyTime(order[(order.indexOf(this.prefs.time) + 1) % 3], true);
        break;
      }
      case "mute":
        this.setSound(!s.sound);
        break;
      case "horn": {
        this.audio.play("horn");
        this.honks = this.honks.filter((t) => this.time - t < 1.5);
        this.honks.push(this.time);
        this.onHorn?.(this.honks.length);
        this.hornCount++;
        this.bumpStat("horn");
        if (this.stats.horn >= 10) this.unlock("polite");
        break;
      }
      case "photo":
        if (s.phase !== "play") break;
        ui.set({ photo: !s.photo });
        this.rig.photo.active = !s.photo;
        if (!s.photo) {
          this.rig.photo.yaw = this.car.yaw + Math.PI;
          pushToast({ kind: "info", title: "Photo mode", body: "Drag to orbit, scroll to zoom, K or click Save to take the shot." }, 3000);
        }
        break;
      case "portfolio":
        command("portfolio");
        break;
      case "help":
        ui.set({ helpOpen: !s.helpOpen });
        if (!s.helpOpen) this.unlock("manual");
        break;
      case "pause":
        if (s.helpOpen) ui.set({ helpOpen: false });
        else if (s.panel) this.closePanel();
        else if (s.photo) {
          ui.set({ photo: false });
          this.rig.photo.active = false;
        } else if (s.phase === "play") ui.set({ paused: !s.paused });
        break;
      case "resume":
        ui.set({ paused: false });
        break;
      case "debug":
        ui.set({ debug: !s.debug });
        break;
      case "resetProgress":
        this.resetProgress();
        break;
      case "rushStart":
        this.rush?.start();
        break;
      case "dojoStart":
        this.dojo?.start();
        break;
      default:
        void arg;
    }
  }

  /** Title → drive: the camera swoops down, the garage door rolls up, the car rolls out. */
  start() {
    ui.set({ phase: "intro", hint: false });
    this.audio.ensure();
    this.rig.startSwoop();
    this.rig.snapBehind(this.car);
    this.zones.find((z) => z.layout.id === "pit")?.hooks.onStart?.();
    this.introAt = this.time;
    this.car.autopilot = { throttle: 0.55, until: this.time + 1.9 };
    window.setTimeout(() => {
      if (ui.get().phase !== "intro") return;
      ui.set({ phase: "play", hint: true });
      this.hintTimer = window.setTimeout(() => ui.set({ hint: false }), 6000);
    }, 1900);
  }

  /** Explore without driving: teleport to a zone and open it. */
  teleport(id: ZoneId) {
    const z = ZONE_LAYOUT.find((x) => x.id === id);
    if (!z) return;
    const yaw = Math.atan2(z.center.x - z.pad.x, z.center.z - z.pad.z);
    this.car.place(z.pad.x - Math.sin(yaw) * 2, 1.2, z.pad.z - Math.cos(yaw) * 2, yaw);
    this.rig.snapBehind(this.car);
    this.padOn = id;
    if (ui.get().phase !== "play") ui.set({ phase: "play" });
    ui.set({ zoneMenuOpen: false, paused: false });
    this.openPanel(id);
  }

  respawn() {
    const c = this.checkpoint;
    this.car.place(c.x, 1.4, c.z, c.yaw);
    this.rig.snapBehind(this.car);
    this.skids.mark(0, null);
    this.skids.mark(1, null);
  }

  rebuildWorld() {
    if (this.destruction.startRebuild()) {
      this.audio.play("door");
      this.rebuilds++;
      this.bumpStat("rebuilds");
      if (this.stats.rebuilds >= 5) this.unlock("facilities");
      pushToast({ kind: "info", title: "Rebuilding the world" }, 1500);
      this.zones.forEach((z) => z.hooks.onRebuild?.());
    } else pushToast({ kind: "info", title: "Nothing to rebuild yet" }, 1500);
  }

  setSound(on: boolean) {
    this.audio.setEnabled(on);
    ui.set({ sound: on });
  }

  applyTime(t: TimeOfDay, announce: boolean) {
    this.prefs.time = t;
    writeJSON(KEYS.prefs, this.prefs);
    this.island.setTime(t);
    this.car.enableHeadlights(t !== "day", this.root);
    this.zones.forEach((z) => z.hooks.onTime?.(t));
    ui.set({ time: t });
    if (announce) pushToast({ kind: "info", title: t === "day" ? "Late afternoon" : t === "dusk" ? "Dusk" : "Night" }, 1400);
  }

  /** Quality tier: render scale, shadows, particles, destruction caps, view distance. */
  applyTier(t: Tier, announce: boolean) {
    this.tier = t;
    const cfg = TIERS[t];
    this.setDpr(Math.min(window.devicePixelRatio || 1, cfg.dpr));
    this.gl.shadowMap.enabled = cfg.shadows;
    this.island.sun.castShadow = cfg.shadows;
    this.particles.scale = (cfg.particles / TIERS.high.particles) * (this.reduced ? 0.5 : 1);
    this.destruction.setTier(cfg);
    this.island.fog.far = cfg.fogFar;
    this.camera.far = cfg.fogFar + 40;
    this.camera.updateProjectionMatrix();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => (m.needsUpdate = true));
      }
    });
    ui.set({ tier: t });
    if (announce) pushToast({ kind: "info", title: `Quality: ${t}` }, 1400);
  }

  setQuality(q: Prefs["quality"]) {
    this.prefs.quality = q;
    writeJSON(KEYS.prefs, this.prefs);
    ui.set({ tierManual: q !== "auto" });
    if (q !== "auto") this.applyTier(q, true);
  }

  /** Adaptive quality: step down after sustained slow frames, back up only after a long smooth stretch. */
  private trackFrame(rawDt: number) {
    const ms = rawDt * 1000;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    telemetry.frameMs = avg;
    telemetry.fps = avg > 0 ? 1000 / avg : 0;
    if (this.prefs.quality !== "auto" || ui.get().phase === "loading" || this.time < this.tierCheckAt || document.hidden) return;
    this.tierCheckAt = this.time + 2.5;
    const i = TIER_ORDER.indexOf(this.tier);
    if (avg > 24 && i > 0) this.applyTier(TIER_ORDER[i - 1], true);
    else if (avg < 11.5 && i < TIER_ORDER.length - 1 && this.time > 20) {
      this.tierCheckAt = this.time + 12;
      this.applyTier(TIER_ORDER[i + 1], false);
    }
  }

  setCar(color: string, plate: string) {
    const clean = sanitizePlate(plate);
    this.plateText = clean;
    this.car.setColor(color);
    writeJSON(KEYS.car, { color, plate: clean });
  }

  resetProgress() {
    this.stats = readStats();
    for (const key of Object.keys(this.stats) as Array<keyof Stats>) this.stats[key] = 0;
    this.achievements.clear();
    this.bolts.clear();
    this.visited.clear();
    for (const k of [KEYS.stats, KEYS.achievements, KEYS.bolts, KEYS.visited]) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    this.score = 0;
    ui.set({ bolts: 0, score: 0 });
    pushToast({ kind: "info", title: "Progress reset" }, 1600);
  }

  /* ── Photo mode ──────────────────────────────────────────── */

  requestPhoto() {
    this.photoRequested = true;
  }

  private capturePhoto() {
    this.photoRequested = false;
    // Render now and read the buffer in the same task, before it is presented and cleared.
    this.gl.render(this.scene, this.camera);
    this.gl.domElement.toBlob((blob) => {
      if (!blob) return;
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `arman-world-${stamp}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      this.unlock("press-kit");
    }, "image/png");
  }

  /* ── Pointer: drag to orbit, wheel to zoom (photo) ───────── */

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !(e.target instanceof HTMLCanvasElement)) return;
    this.dragging = { x: e.clientX, y: e.clientY };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.rig.drag(e.clientX - this.dragging.x, e.clientY - this.dragging.y);
    this.dragging = { x: e.clientX, y: e.clientY };
  };
  private onUp = () => {
    this.dragging = null;
  };
  private onWheel = (e: WheelEvent) => {
    if (this.rig.photo.active && e.target instanceof HTMLCanvasElement) this.rig.zoom(e.deltaY);
  };

  private attachPointer() {
    window.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("wheel", this.onWheel, { passive: true });
  }

  /** Leaving for the portfolio: camera pulls up and out. */
  leave() {
    this.rig.leaving = 0.001;
    ui.set({ phase: "leaving" });
    this.audio.idle();
  }

  dispose() {
    this.save(true);
    window.clearTimeout(this.hintTimer);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("wheel", this.onWheel);
    this.input.detach();
    this.audio.dispose();
    this.car?.dispose();
    this.destruction.dispose();
    this.particles.dispose();
    this.skids.dispose();
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m instanceof THREE.ShaderMaterial) m.dispose();
        });
      }
    });
    disposeMaterials();
    this.scene.fog = null;
    this.physics.free();
  }

  get intro() {
    return this.introAt;
  }
}

function dist2(ax: number, az: number, bx: number, bz: number) {
  return (ax - bx) ** 2 + (az - bz) ** 2;
}

/** Plates only use the drum characters, seven at most. */
export function sanitizePlate(text: string) {
  const up = text.toUpperCase();
  let out = "";
  for (const ch of up) if (CHARSET.includes(ch) && out.length < 7) out += ch;
  return out.trim() || "ARMAN";
}
