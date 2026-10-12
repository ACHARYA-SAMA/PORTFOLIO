import * as THREE from "three";
import { PALETTE } from "./config";

/**
 * Particles and skid marks. Fixed-size pools on typed arrays, simulated on
 * the CPU, drawn as instanced billboards: one draw call for alpha-blended
 * particles, one for additive (sparks, glints, flame), one for skids.
 * No allocation per frame.
 */

export type ParticleKind = "dust" | "smoke" | "splinter" | "spark" | "glint" | "leaf" | "paper" | "flame" | "chip" | "steam";

type Preset = {
  additive: boolean;
  hard: boolean;
  life: [number, number];
  size: [number, number]; // start, end
  alpha: [number, number];
  gravity: number;
  drag: number;
  colors: string[];
  flutter?: number;
};

const PRESETS: Record<ParticleKind, Preset> = {
  dust: { additive: false, hard: false, life: [0.9, 1.5], size: [0.7, 2.6], alpha: [0.45, 0], gravity: -0.6, drag: 2.2, colors: ["#8d8279", "#a39686", "#6f665f"] },
  smoke: { additive: false, hard: false, life: [1.1, 1.8], size: [0.5, 2.6], alpha: [0.32, 0], gravity: 0.9, drag: 1.6, colors: ["#bcb5ad", "#d8d2ca", "#9d968f"] },
  steam: { additive: false, hard: false, life: [1.6, 2.4], size: [0.4, 2.2], alpha: [0.22, 0], gravity: 1.6, drag: 0.9, colors: ["#e8e4de", "#f3f1ec"] },
  splinter: { additive: false, hard: true, life: [0.9, 1.4], size: [0.16, 0.1], alpha: [1, 1], gravity: -22, drag: 0.4, colors: [PALETTE.wood, PALETTE.woodDark, "#d29a5f"] },
  chip: { additive: false, hard: true, life: [0.8, 1.2], size: [0.14, 0.1], alpha: [1, 1], gravity: -22, drag: 0.3, colors: [PALETTE.brick, PALETTE.brickDark, PALETTE.concrete] },
  spark: { additive: true, hard: true, life: [0.25, 0.5], size: [0.13, 0.04], alpha: [1, 0.2], gravity: -16, drag: 1.2, colors: ["#fff3c4", "#ffd27a", "#ff9a3c"] },
  glint: { additive: true, hard: false, life: [0.15, 0.35], size: [0.26, 0.03], alpha: [0.9, 0], gravity: -3, drag: 2, colors: ["#ffffff", "#dff6ff"] },
  leaf: { additive: false, hard: true, life: [1.4, 2.4], size: [0.2, 0.16], alpha: [1, 1], gravity: -3.2, drag: 2.6, colors: [PALETTE.foliage, PALETTE.foliageDark, "#5b7438"], flutter: 3 },
  paper: { additive: false, hard: true, life: [2, 3.2], size: [0.34, 0.3], alpha: [1, 1], gravity: -1.4, drag: 3, colors: [PALETTE.paper, PALETTE.cream, "#e6dfd3"], flutter: 4 },
  flame: { additive: true, hard: false, life: [0.14, 0.26], size: [0.55, 0.12], alpha: [1, 0], gravity: 1, drag: 4, colors: ["#ffd37a", "#ff7a2a", PALETTE.redHi] },
};

const VERT = /* glsl */ `
attribute vec3 iPos;
attribute float iSize;
attribute vec4 iColor;
attribute float iRot;
varying vec4 vColor;
varying vec2 vUv;
varying float vFog;
uniform float uFogNear;
uniform float uFogFar;
void main() {
  vColor = iColor;
  vUv = position.xy + 0.5;
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  float c = cos(iRot), s = sin(iRot);
  vec2 p = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
  mv.xy += p * iSize;
  vFog = smoothstep(uFogNear, uFogFar, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
varying vec4 vColor;
varying vec2 vUv;
varying float vFog;
uniform float uHard;
uniform vec3 uFogColor;
uniform float uAdditive;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = uHard > 0.5 ? 1.0 : smoothstep(1.0, 0.2, d);
  if (a <= 0.01) discard;
  vec3 col = mix(vColor.rgb, uFogColor, vFog * (1.0 - uAdditive));
  gl_FragColor = vec4(col, vColor.a * a * (1.0 - vFog * uAdditive));
}`;

class Batch {
  readonly mesh: THREE.Mesh;
  readonly geo: THREE.InstancedBufferGeometry;
  readonly mat: THREE.ShaderMaterial;
  readonly pos: Float32Array;
  readonly size: Float32Array;
  readonly color: Float32Array;
  readonly rot: Float32Array;
  readonly attrs: THREE.InstancedBufferAttribute[];

  constructor(
    readonly capacity: number,
    additive: boolean,
    hard: boolean,
  ) {
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute("position", quad.getAttribute("position"));
    this.pos = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.color = new Float32Array(capacity * 4);
    this.rot = new Float32Array(capacity);
    const a = [
      new THREE.InstancedBufferAttribute(this.pos, 3),
      new THREE.InstancedBufferAttribute(this.size, 1),
      new THREE.InstancedBufferAttribute(this.color, 4),
      new THREE.InstancedBufferAttribute(this.rot, 1),
    ];
    a.forEach((x) => x.setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("iPos", a[0]);
    geo.setAttribute("iSize", a[1]);
    geo.setAttribute("iColor", a[2]);
    geo.setAttribute("iRot", a[3]);
    geo.instanceCount = 0;
    this.attrs = a;
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uHard: { value: hard ? 1 : 0 },
        uAdditive: { value: additive ? 1 : 0 },
        uFogColor: { value: new THREE.Color("#000") },
        uFogNear: { value: 60 },
        uFogFar: { value: 260 },
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 3 : 2;
  }

  commit(count: number) {
    this.geo.instanceCount = count;
    for (const a of this.attrs) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, count * a.itemSize);
      a.needsUpdate = true;
    }
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}

/** One particle pool; draws into 3 batches by blend/shape. */
export class Particles {
  readonly group = new THREE.Group();
  private n: number;
  private alive: Uint8Array;
  private kind: Uint8Array;
  private p: Float32Array;
  private v: Float32Array;
  private life: Float32Array;
  private max: Float32Array;
  private rgb: Float32Array;
  private rot: Float32Array;
  private spin: Float32Array;
  private seed: Float32Array;
  private cursor = 0;
  private batches: { soft: Batch; hard: Batch; add: Batch; addHard: Batch };
  private kinds: ParticleKind[] = Object.keys(PRESETS) as ParticleKind[];
  private batchList: Batch[] = [];
  private colorCache = new Map<string, THREE.Color>();
  scale = 1;
  count = 0;

  constructor(capacity: number) {
    this.n = capacity;
    this.alive = new Uint8Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.p = new Float32Array(capacity * 3);
    this.v = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.max = new Float32Array(capacity);
    this.rgb = new Float32Array(capacity * 3);
    this.rot = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.seed = new Float32Array(capacity);
    this.batches = {
      soft: new Batch(capacity, false, false),
      hard: new Batch(capacity, false, true),
      add: new Batch(Math.ceil(capacity / 2), true, false),
      addHard: new Batch(Math.ceil(capacity / 2), true, true),
    };
    this.batchList = Object.values(this.batches);
    this.batchList.forEach((b) => this.group.add(b.mesh));
  }

  private color(hex: string) {
    let c = this.colorCache.get(hex);
    if (!c) {
      c = new THREE.Color(hex);
      this.colorCache.set(hex, c);
    }
    return c;
  }

  /** Burst of `count` particles around a point, thrown along (vx,vy,vz) with spread. */
  emit(kind: ParticleKind, x: number, y: number, z: number, count: number, speed = 4, vx = 0, vy = 0, vz = 0, spread = 1, color?: string) {
    const pr = PRESETS[kind];
    const k = this.kinds.indexOf(kind);
    const n = Math.max(1, Math.round(count * this.scale));
    for (let j = 0; j < n; j++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.n;
      this.alive[i] = 1;
      this.kind[i] = k;
      const i3 = i * 3;
      this.p[i3] = x + (Math.random() - 0.5) * 0.4 * spread;
      this.p[i3 + 1] = y + (Math.random() - 0.5) * 0.4 * spread;
      this.p[i3 + 2] = z + (Math.random() - 0.5) * 0.4 * spread;
      // Random direction on a sphere, biased up.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const s = speed * (0.4 + Math.random() * 0.6);
      this.v[i3] = vx + r * Math.cos(t) * s * spread;
      this.v[i3 + 1] = vy + Math.abs(u) * s;
      this.v[i3 + 2] = vz + r * Math.sin(t) * s * spread;
      this.max[i] = pr.life[0] + Math.random() * (pr.life[1] - pr.life[0]);
      this.life[i] = 0;
      const c = this.color(color ?? pr.colors[(Math.random() * pr.colors.length) | 0]);
      this.rgb[i3] = c.r;
      this.rgb[i3 + 1] = c.g;
      this.rgb[i3 + 2] = c.b;
      this.rot[i] = Math.random() * Math.PI;
      this.spin[i] = (Math.random() - 0.5) * (pr.hard ? 14 : 1.5);
      this.seed[i] = Math.random() * 100;
    }
  }

  update(dt: number, fog: THREE.Fog | null) {
    const b = this.batches;
    let ns = 0;
    let nh = 0;
    let na = 0;
    let nah = 0;
    let total = 0;
    for (let i = 0; i < this.n; i++) {
      if (!this.alive[i]) continue;
      const pr = PRESETS[this.kinds[this.kind[i]]];
      this.life[i] += dt;
      const t = this.life[i] / this.max[i];
      if (t >= 1) {
        this.alive[i] = 0;
        continue;
      }
      const i3 = i * 3;
      const drag = Math.max(0, 1 - pr.drag * dt);
      this.v[i3] *= drag;
      this.v[i3 + 1] = this.v[i3 + 1] * drag + pr.gravity * dt;
      this.v[i3 + 2] *= drag;
      if (pr.flutter) {
        const f = pr.flutter;
        this.v[i3] += Math.sin(this.life[i] * 5 + this.seed[i]) * f * dt;
        this.v[i3 + 2] += Math.cos(this.life[i] * 4 + this.seed[i]) * f * dt;
      }
      this.p[i3] += this.v[i3] * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += this.v[i3 + 2] * dt;
      // Settle on the ground instead of sinking.
      if (this.p[i3 + 1] < 0.05) {
        this.p[i3 + 1] = 0.05;
        this.v[i3 + 1] *= -0.25;
        this.v[i3] *= 0.6;
        this.v[i3 + 2] *= 0.6;
        this.spin[i] *= 0.5;
      }
      this.rot[i] += this.spin[i] * dt;
      const size = pr.size[0] + (pr.size[1] - pr.size[0]) * t;
      const alpha = (pr.alpha[0] + (pr.alpha[1] - pr.alpha[0]) * t) * (pr.hard && !pr.additive ? Math.min(1, (1 - t) * 4) : 1);
      const batch = pr.additive ? (pr.hard ? b.addHard : b.add) : pr.hard ? b.hard : b.soft;
      const j = pr.additive ? (pr.hard ? nah++ : na++) : pr.hard ? nh++ : ns++;
      if (j >= batch.capacity) continue;
      const j3 = j * 3;
      const j4 = j * 4;
      batch.pos[j3] = this.p[i3];
      batch.pos[j3 + 1] = this.p[i3 + 1];
      batch.pos[j3 + 2] = this.p[i3 + 2];
      batch.size[j] = size;
      batch.color[j4] = this.rgb[i3];
      batch.color[j4 + 1] = this.rgb[i3 + 1];
      batch.color[j4 + 2] = this.rgb[i3 + 2];
      batch.color[j4 + 3] = alpha;
      batch.rot[j] = this.rot[i];
      total++;
    }
    b.soft.commit(Math.min(ns, b.soft.capacity));
    b.hard.commit(Math.min(nh, b.hard.capacity));
    b.add.commit(Math.min(na, b.add.capacity));
    b.addHard.commit(Math.min(nah, b.addHard.capacity));
    if (fog) {
      for (const batch of this.batchList) {
        (batch.mat.uniforms.uFogColor.value as THREE.Color).copy(fog.color);
        batch.mat.uniforms.uFogNear.value = fog.near;
        batch.mat.uniforms.uFogFar.value = fog.far;
      }
    }
    this.count = total;
  }

  clear() {
    this.alive.fill(0);
  }

  dispose() {
    Object.values(this.batches).forEach((b) => b.dispose());
  }
}

/* ── Skid marks: pooled ground quads that fade ───────────── */

const SKID_VERT = /* glsl */ `
attribute float iAlpha;
varying float vAlpha;
void main() {
  vAlpha = iAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const SKID_FRAG = /* glsl */ `
varying float vAlpha;
void main() { gl_FragColor = vec4(0.02, 0.02, 0.02, vAlpha * 0.55); }`;

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export class Skids {
  readonly mesh: THREE.InstancedMesh;
  private alpha: Float32Array;
  private age: Float32Array;
  private attr: THREE.InstancedBufferAttribute;
  private cursor = 0;
  private last: Array<THREE.Vector3 | null> = [null, null];

  constructor(private capacity: number) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.alpha = new Float32Array(capacity);
    this.age = new Float32Array(capacity).fill(99);
    this.attr = new THREE.InstancedBufferAttribute(this.alpha, 1);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iAlpha", this.attr);
    const mat = new THREE.ShaderMaterial({ vertexShader: SKID_VERT, fragmentShader: SKID_FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, _m);
  }

  /** Lay a mark from the wheel's previous contact to this one. Pass null to lift. */
  mark(wheel: 0 | 1, point: THREE.Vector3 | null) {
    const prev = this.last[wheel];
    if (!point) {
      this.last[wheel] = null;
      return;
    }
    if (!prev) {
      this.last[wheel] = point.clone();
      return;
    }
    const d = prev.distanceTo(point);
    if (d < 0.25) return;
    if (d < 3) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      _p.addVectors(prev, point).multiplyScalar(0.5);
      _p.y = 0.03;
      _e.set(0, Math.atan2(point.x - prev.x, point.z - prev.z), 0);
      _q.setFromEuler(_e);
      _s.set(0.32, 1, d + 0.05);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      this.mesh.instanceMatrix.needsUpdate = true;
      this.age[i] = 0;
    }
    prev.copy(point);
  }

  update(dt: number) {
    let changed = false;
    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] > 9) continue;
      this.age[i] += dt;
      this.alpha[i] = Math.max(0, 1 - this.age[i] / 9);
      changed = true;
    }
    if (changed) this.attr.needsUpdate = true;
  }

  clear() {
    this.age.fill(99);
    this.alpha.fill(0);
    this.attr.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
