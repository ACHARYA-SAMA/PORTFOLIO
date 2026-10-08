import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type RAPIER from "@dimforge/rapier3d-compat";
import { CAR_GROUPS, PALETTE } from "./config";
import type { Axes } from "./input";
import { lambert } from "./materials";
import type { Physics } from "./physics";
import { CanvasDrums } from "./textures";

/**
 * The buggy. Physics: Rapier's DynamicRayCastVehicleController (verified in
 * the installed 0.19 typings) on a single cuboid chassis with a low centre
 * of mass. Feel: arcade, not simulation. Visuals: primitives only.
 * TODO: custom asset — a hand-modelled GLB body could replace buildBody().
 */

const HALF = { x: 0.85, y: 0.36, z: 1.35 };
const MASS = 160;
const WHEEL_RADIUS = 0.42;
const REST = 0.38;
const WHEELS: Array<{ x: number; z: number; front: boolean }> = [
  { x: 0.84, z: 0.94, front: true },
  { x: -0.84, z: 0.94, front: true },
  { x: 0.84, z: -0.92, front: false },
  { x: -0.84, z: -0.92, front: false },
];

const ENGINE = 520; // N per wheel
const BRAKE = 9;
const COAST_BRAKE = 0.35;
const TOP_SPEED = 31; // m/s ≈ 112 km/h
const BOOST_SPEED = 43;
const REVERSE_SPEED = 11;
const GRIP = 2.7;
const DRIFT_GRIP = 0.85;
const YAW_INERTIA = (MASS * ((HALF.x * 2) ** 2 + (HALF.z * 2) ** 2)) / 12;

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export type CarEvents = {
  onLand?: (airTime: number, distance: number) => void;
  onBoostStart?: () => void;
};

export class Car {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  readonly group = new THREE.Group();
  readonly wheels: THREE.Object3D[] = [];
  readonly plates: CanvasDrums;
  readonly paint: THREE.MeshLambertMaterial;
  readonly brakeMat: THREE.MeshLambertMaterial;
  readonly headMat: THREE.MeshLambertMaterial;
  readonly headlights: THREE.SpotLight[] = [];
  readonly exhaust = new THREE.Vector3(0.42, -0.18, -1.45);

  // Interpolation
  readonly prevPos = new THREE.Vector3();
  readonly currPos = new THREE.Vector3();
  readonly prevQuat = new THREE.Quaternion();
  readonly currQuat = new THREE.Quaternion();
  readonly velocity = new THREE.Vector3();

  steer = 0;
  speed = 0; // signed forward m/s
  boost = 1;
  boosting = false;
  private boostCooldown = 0;
  braking = false;
  handbrake = false;
  grounded = 0; // wheels in contact
  airTime = 0;
  private takeoff = new THREE.Vector3();
  upsideDown = 0;
  lateralSlip = 0;
  hazard = false;
  /** Scripted controls (pit garage exit). */
  autopilot: { throttle: number; until: number } | null = null;

  constructor(
    private physics: Physics,
    color: string,
    plate: string,
    private events: CarEvents = {},
  ) {
    const { R, world } = physics;
    this.body = world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setCanSleep(false).setLinearDamping(0.05).setAngularDamping(0.6).setCcdEnabled(true),
    );
    // Low centre of mass keeps it on its wheels in hard corners.
    const inertia = {
      x: (MASS * ((HALF.y * 2) ** 2 + (HALF.z * 2) ** 2)) / 12,
      y: YAW_INERTIA,
      z: (MASS * ((HALF.x * 2) ** 2 + (HALF.y * 2) ** 2)) / 12,
    };
    this.collider = world.createCollider(
      R.ColliderDesc.cuboid(HALF.x, HALF.y, HALF.z)
        .setMassProperties(MASS, { x: 0, y: -0.42, z: 0.05 }, inertia, { x: 0, y: 0, z: 0, w: 1 })
        .setFriction(0.4)
        .setRestitution(0.05)
        .setCollisionGroups(CAR_GROUPS)
        .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(1500),
      this.body,
    );

    const c = world.createVehicleController(this.body);
    c.indexUpAxis = 1;
    c.setIndexForwardAxis = 2;
    for (const w of WHEELS) {
      c.addWheel({ x: w.x, y: -0.1, z: w.z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, REST, WHEEL_RADIUS);
    }
    for (let i = 0; i < WHEELS.length; i++) {
      c.setWheelSuspensionStiffness(i, 34);
      c.setWheelSuspensionCompression(i, 2.8);
      c.setWheelSuspensionRelaxation(i, 3.6);
      c.setWheelMaxSuspensionTravel(i, 0.32);
      c.setWheelMaxSuspensionForce(i, 1e5);
      c.setWheelFrictionSlip(i, GRIP);
      c.setWheelSideFrictionStiffness(i, 1);
    }
    this.controller = c;

    this.paint = new THREE.MeshLambertMaterial({ color, flatShading: true });
    this.brakeMat = new THREE.MeshLambertMaterial({ color: PALETTE.redLo, emissive: PALETTE.red, emissiveIntensity: 0.35, flatShading: true });
    this.headMat = new THREE.MeshLambertMaterial({ color: PALETTE.cream, emissive: PALETTE.cream, emissiveIntensity: 0.6, flatShading: true });
    this.plates = new CanvasDrums(7, plate, { cell: 72 });
    this.buildBody();
  }

  /* ── Visuals ─────────────────────────────────────────────── */

  private buildBody() {
    const g = this.group;
    const ink = lambert("#161616");
    const steel = lambert(PALETTE.steel);

    const shell = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.6, 2.62, 3, 0.18), this.paint);
    shell.position.y = 0.02;
    shell.castShadow = true;
    shell.receiveShadow = true;
    g.add(shell);

    // Cockpit tub, bonnet scoop, skid plate, bumpers.
    const blocks: Array<[number, number, number, number, number, number, THREE.Material]> = [
      [1.24, 0.12, 1.15, 0, 0.3, -0.22, ink],
      [0.64, 0.14, 0.72, 0, 0.36, 0.66, ink],
      [1.6, 0.16, 2.3, 0, -0.32, 0, ink],
      [1.86, 0.22, 0.24, 0, -0.12, 1.38, ink],
      [1.86, 0.22, 0.24, 0, -0.12, -1.38, ink],
      [0.4, 0.34, 0.5, 0, 0.42, -0.62, ink], // seat back
    ];
    for (const [w, h, d, x, y, z, m] of blocks) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      b.castShadow = true;
      g.add(b);
    }

    // Roll cage: bars merged into one mesh.
    const bars: THREE.BufferGeometry[] = [];
    const bar = (a: [number, number, number], b: [number, number, number], r = 0.045) => {
      const va = new THREE.Vector3(...a);
      const vb = new THREE.Vector3(...b);
      const len = va.distanceTo(vb);
      const geo = new THREE.CylinderGeometry(r, r, len, 6);
      geo.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(Y, vb.clone().sub(va).normalize());
      geo.applyMatrix4(new THREE.Matrix4().compose(va, q, new THREE.Vector3(1, 1, 1)));
      bars.push(geo);
    };
    const yb = 0.32;
    const yt = 1.12;
    const xf = 0.62;
    const zf = 0.3;
    const zr = -0.86;
    bar([xf, yb, zf], [xf * 0.82, yt, zf - 0.18]);
    bar([-xf, yb, zf], [-xf * 0.82, yt, zf - 0.18]);
    bar([xf, yb, zr], [xf * 0.82, yt, zr + 0.1]);
    bar([-xf, yb, zr], [-xf * 0.82, yt, zr + 0.1]);
    bar([xf * 0.82, yt, zf - 0.18], [xf * 0.82, yt, zr + 0.1]);
    bar([-xf * 0.82, yt, zf - 0.18], [-xf * 0.82, yt, zr + 0.1]);
    bar([xf * 0.82, yt, zf - 0.18], [-xf * 0.82, yt, zf - 0.18]);
    bar([xf * 0.82, yt, zr + 0.1], [-xf * 0.82, yt, zr + 0.1]);
    bar([xf * 0.82, yt, zr + 0.1], [-xf * 0.82, yt, zf - 0.18], 0.035);
    bar([xf, yb, zr], [0.3, yb, -1.32], 0.04);
    bar([-xf, yb, zr], [-0.3, yb, -1.32], 0.04);
    const cage = new THREE.Mesh(mergeGeometries(bars), steel);
    cage.castShadow = true;
    g.add(cage);
    bars.forEach((b) => b.dispose());

    // Lights.
    for (const s of [1, -1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.06), this.headMat);
      head.position.set(0.56 * s, 0.13, 1.32);
      g.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.06), this.brakeMat);
      tail.position.set(0.6 * s, 0.14, -1.32);
      g.add(tail);
    }

    // Plates: the odometer drums, front and back.
    const plateMat = new THREE.MeshBasicMaterial({ map: this.plates.texture, toneMapped: false });
    const plateGeo = new THREE.PlaneGeometry(0.86, 0.26);
    const front = new THREE.Mesh(plateGeo, plateMat);
    front.position.set(0, -0.12, 1.506);
    g.add(front);
    const back = new THREE.Mesh(plateGeo, plateMat);
    back.position.set(0, 0.1, -1.335);
    back.rotation.y = Math.PI;
    g.add(back);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.32, 8), steel);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.copy(this.exhaust).setZ(-1.38);
    g.add(pipe);

    // Wheels: pivot (steer) > spinner (roll) > tyre + hub.
    const tyreGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.44, 14);
    tyreGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.46, 8);
    hubGeo.rotateZ(Math.PI / 2);
    const nubGeo = new THREE.BoxGeometry(0.46, 0.08, 0.08);
    for (let i = 0; i < WHEELS.length; i++) {
      const pivot = new THREE.Object3D();
      const spinner = new THREE.Object3D();
      const tyre = new THREE.Mesh(tyreGeo, ink);
      tyre.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, lambert(PALETTE.paper));
      const nub = new THREE.Mesh(nubGeo, lambert(PALETTE.red));
      spinner.add(tyre, hub, nub);
      pivot.add(spinner);
      pivot.position.set(WHEELS[i].x, -0.1 - REST, WHEELS[i].z);
      g.add(pivot);
      this.wheels.push(pivot);
    }
  }

  /** Night-time headlights that actually light the scene. */
  enableHeadlights(on: boolean, scene: THREE.Object3D) {
    if (on && this.headlights.length === 0) {
      for (const s of [1, -1]) {
        const l = new THREE.SpotLight(PALETTE.cream, 60, 48, 0.52, 0.55, 1.4);
        l.position.set(0.56 * s, 0.2, 1.3);
        l.target.position.set(0.56 * s * 1.6, -1.6, 14);
        this.group.add(l, l.target);
        this.headlights.push(l);
      }
    }
    for (const l of this.headlights) l.visible = on;
    this.headMat.emissiveIntensity = on ? 2.2 : 0.6;
    void scene;
  }

  setColor(hex: string) {
    this.paint.color.set(hex);
  }

  setPlate(text: string, now: number) {
    this.plates.roll(text, now, 0.06);
  }

  /* ── Simulation (called once per fixed step) ─────────────── */

  applyControls(axes: Axes, dt: number, enabled: boolean, now: number) {
    const c = this.controller;
    const body = this.body;
    const v = c.currentVehicleSpeed();
    this.speed = v;
    const speed = Math.abs(v);

    let throttle = enabled ? axes.throttle : 0;
    const brakeIn = enabled ? axes.brake : 0;
    const steerIn = enabled ? axes.steer : 0;
    const handbrake = enabled && axes.handbrake;
    if (this.autopilot) {
      throttle = this.autopilot.throttle;
      if (now > this.autopilot.until) this.autopilot = null;
    }

    // Steering tightens at low speed, relaxes at high speed.
    const maxSteer = 0.62 - 0.4 * Math.min(1, speed / 28);
    this.steer += (steerIn * maxSteer - this.steer) * Math.min(1, dt * 9);
    c.setWheelSteering(0, this.steer);
    c.setWheelSteering(1, this.steer);

    // Boost: a tank that drains while held and refills after a short cooldown.
    const wantBoost = enabled && axes.boost && throttle > 0 && this.boost > 0.04;
    if (wantBoost && !this.boosting) this.events.onBoostStart?.();
    this.boosting = wantBoost;
    if (this.boosting) {
      this.boost = Math.max(0, this.boost - dt / 2.4);
      this.boostCooldown = 0.7;
    } else if (this.boostCooldown > 0) this.boostCooldown -= dt;
    else this.boost = Math.min(1, this.boost + dt / 4);

    let engine = 0;
    let brake = 0;
    this.braking = false;
    if (throttle > 0) {
      if (v < -1) {
        brake = BRAKE * throttle;
        this.braking = true;
      } else {
        const vmax = this.boosting ? BOOST_SPEED : TOP_SPEED;
        const headroom = Math.max(0, 1 - (Math.max(0, v) / vmax) ** 2);
        engine = ENGINE * throttle * headroom * (this.boosting ? 1.9 : 1);
      }
    }
    if (brakeIn > 0) {
      if (v > 1.2) {
        brake = Math.max(brake, BRAKE * brakeIn);
        this.braking = true;
      } else {
        const headroom = Math.max(0, 1 - (Math.max(0, -v) / REVERSE_SPEED) ** 2);
        engine = -ENGINE * 0.7 * brakeIn * headroom;
      }
    }
    if (!throttle && !brakeIn) brake = COAST_BRAKE;

    this.handbrake = handbrake;
    for (let i = 0; i < 4; i++) {
      const rear = i >= 2;
      c.setWheelEngineForce(i, engine);
      c.setWheelBrake(i, rear && handbrake ? BRAKE * 0.55 : brake);
      c.setWheelFrictionSlip(i, rear && handbrake ? DRIFT_GRIP : GRIP);
      c.setWheelSideFrictionStiffness(i, rear && handbrake ? 0.45 : 1);
    }

    // Body axes.
    const r = body.rotation();
    _q.set(r.x, r.y, r.z, r.w);
    _up.set(0, 1, 0).applyQuaternion(_q);
    _fwd.set(0, 0, 1).applyQuaternion(_q);
    _right.set(-1, 0, 0).applyQuaternion(_q);
    const lv = body.linvel();
    _v.set(lv.x, lv.y, lv.z);
    this.lateralSlip = _v.dot(_right);

    let contacts = 0;
    for (let i = 0; i < 4; i++) if (c.wheelIsInContact(i)) contacts++;
    this.grounded = contacts;

    body.resetForces(true);
    body.resetTorques(true);
    if (contacts > 0) {
      // Downforce grows with speed: planted at 100 km/h without feeling heavy at 20.
      body.addForce({ x: -_up.x * speed * speed * 0.9, y: -_up.y * speed * speed * 0.9, z: -_up.z * speed * speed * 0.9 }, true);
      // Drift assist: steering while sliding rotates the car.
      if (handbrake && speed > 5) {
        const k = YAW_INERTIA * steerIn * 2.4 * dt;
        body.applyTorqueImpulse({ x: _up.x * k, y: _up.y * k, z: _up.z * k }, true);
      }
      // Gentle self-righting so hard corners lean rather than roll.
      _v.crossVectors(_up, Y).multiplyScalar(MASS * 6 * dt);
      body.applyTorqueImpulse({ x: _v.x, y: 0, z: _v.z }, true);
    } else {
      // Air control: steer yaws, throttle/brake pitch, and a slow auto-level.
      const kYaw = YAW_INERTIA * steerIn * 1.4 * dt;
      const kPitch = YAW_INERTIA * (throttle - brakeIn) * 0.9 * dt;
      body.applyTorqueImpulse({ x: _up.x * kYaw + _right.x * -kPitch, y: _up.y * kYaw + _right.y * -kPitch, z: _up.z * kYaw + _right.z * -kPitch }, true);
      _v.crossVectors(_up, Y).multiplyScalar(MASS * 2.5 * dt);
      body.applyTorqueImpulse({ x: _v.x, y: 0, z: _v.z }, true);
    }

    // Boost also pushes in the air a little.
    if (this.boosting && contacts === 0) {
      const k = MASS * 6 * dt;
      body.applyImpulse({ x: _fwd.x * k, y: _fwd.y * k, z: _fwd.z * k }, true);
    }

    c.updateVehicle(dt);
  }

  /** Bookkeeping after world.step(): interpolation state, air time, flips. */
  afterStep(dt: number) {
    this.prevPos.copy(this.currPos);
    this.prevQuat.copy(this.currQuat);
    const t = this.body.translation();
    const r = this.body.rotation();
    this.currPos.set(t.x, t.y, t.z);
    this.currQuat.set(r.x, r.y, r.z, r.w);
    const lv = this.body.linvel();
    this.velocity.set(lv.x, lv.y, lv.z);

    // Air time and jump distance.
    if (this.grounded === 0) {
      if (this.airTime === 0) this.takeoff.copy(this.currPos);
      this.airTime += dt;
    } else if (this.airTime > 0) {
      const dx = this.currPos.x - this.takeoff.x;
      const dz = this.currPos.z - this.takeoff.z;
      if (this.airTime > 0.25) this.events.onLand?.(this.airTime, Math.hypot(dx, dz));
      this.airTime = 0;
    }

    // Upside down: hazards flash, and after a moment it rights itself.
    _up.set(0, 1, 0).applyQuaternion(this.currQuat);
    if (_up.y < 0.25) this.upsideDown += dt;
    else this.upsideDown = 0;
    this.hazard = this.upsideDown > 0.4;
    if (this.upsideDown > 1.6 && this.velocity.length() < 3) this.recover();
  }

  /** Flip back onto the wheels where it lies, facing the same way. */
  recover() {
    _fwd.set(0, 0, 1).applyQuaternion(this.currQuat);
    const yaw = Math.atan2(_fwd.x, _fwd.z);
    const t = this.body.translation();
    this.place(t.x, t.y + 1.4, t.z, yaw, false);
    this.upsideDown = 0;
  }

  /** Teleport (respawn, explore-without-driving, recover). */
  place(x: number, y: number, z: number, yaw: number, snap = true) {
    _q.setFromAxisAngle(Y, yaw);
    this.body.setTranslation({ x, y, z }, true);
    this.body.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.steer = 0;
    this.currPos.set(x, y, z);
    this.currQuat.copy(_q);
    if (snap) {
      this.prevPos.copy(this.currPos);
      this.prevQuat.copy(this.currQuat);
    }
  }

  get yaw() {
    _fwd.set(0, 0, 1).applyQuaternion(this.currQuat);
    return Math.atan2(_fwd.x, _fwd.z);
  }

  /* ── Rendering (every frame) ─────────────────────────────── */

  render(alpha: number, time: number) {
    this.group.position.lerpVectors(this.prevPos, this.currPos, alpha);
    this.group.quaternion.slerpQuaternions(this.prevQuat, this.currQuat, alpha);
    const c = this.controller;
    for (let i = 0; i < 4; i++) {
      const pivot = this.wheels[i];
      const len = c.wheelSuspensionLength(i) ?? REST;
      pivot.position.y = -0.1 - len;
      pivot.rotation.y = c.wheelSteering(i) ?? 0;
      pivot.children[0].rotation.x = c.wheelRotation(i) ?? 0;
    }
    const flash = this.hazard && Math.sin(time * 14) > 0;
    this.brakeMat.emissiveIntensity = flash ? 3 : this.braking || this.speed < -0.5 ? 2.4 : 0.35;
    this.brakeMat.emissive.set(flash ? PALETTE.redHi : PALETTE.red);
  }

  dispose() {
    this.physics.world.removeVehicleController(this.controller);
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.paint.dispose();
    this.brakeMat.dispose();
    this.headMat.dispose();
    this.plates.texture.dispose();
  }
}
