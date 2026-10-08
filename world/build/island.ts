import * as THREE from "three";
import { ISLAND, PALETTE, WORLD_GROUPS } from "../engine/config";
import { basic, canvasTexture, lambert } from "../engine/materials";
import type { Physics } from "../engine/physics";
import { makeCanvas } from "../engine/textures";
import { ARENA, DECK, GARAGE, OVAL, RAMPS, RING, ROADS, ROUNDABOUT, ZONE_LAYOUT } from "./layout";
import type { TimeOfDay } from "@/lib/progress";

/**
 * Ground, roads, cliffs, sea wall, water, ramps, sky and light. Roads are
 * painted into one canvas texture on the ground plane: one draw call for the
 * whole road network, and the minimap reuses the same painting.
 */

const EXTENT = ISLAND.half * 2;

/** Paint the road network. `pxPerM` scales it for the ground (detail) or the minimap (small). */
export function paintRoads(c: CanvasRenderingContext2D, size: number, opts: { detail: boolean }) {
  const s = size / EXTENT;
  const X = (x: number) => (x + ISLAND.half) * s;
  const Z = (z: number) => (z + ISLAND.half) * s;
  c.lineCap = "round";
  c.lineJoin = "round";

  const roadPath = (draw: (c: CanvasRenderingContext2D) => void, width: number, color: string, dash?: number[]) => {
    c.strokeStyle = color;
    c.lineWidth = width * s;
    c.setLineDash(dash ? dash.map((d) => d * s) : []);
    c.beginPath();
    draw(c);
    c.stroke();
  };

  const ring = (c: CanvasRenderingContext2D) => c.roundRect(X(-RING.half), Z(-RING.half), RING.half * 2 * s, RING.half * 2 * s, RING.radius * s);
  const roundabout = (c: CanvasRenderingContext2D) => c.arc(X(0), Z(0), ROUNDABOUT.r * s, 0, Math.PI * 2);
  const oval = (c: CanvasRenderingContext2D) => c.roundRect(X(OVAL.x - OVAL.hx), Z(OVAL.z - OVAL.hz), OVAL.hx * 2 * s, OVAL.hz * 2 * s, OVAL.hx * s);
  const roads = (c: CanvasRenderingContext2D) => {
    for (const r of ROADS) {
      c.moveTo(X(r.from[0]), Z(r.from[1]));
      c.lineTo(X(r.to[0]), Z(r.to[1]));
    }
  };

  const edge = opts.detail ? PALETTE.paper : "#2b2b2b";
  const road = opts.detail ? PALETTE.road : "#0a0a0a";
  // Edge lines first, asphalt over them.
  roadPath(ring, RING.width + 0.8, edge);
  roadPath(roundabout, ROUNDABOUT.width + 0.8, edge);
  roadPath(oval, OVAL.width + 0.8, edge);
  for (const r of ROADS) roadPath((c) => (c.moveTo(X(r.from[0]), Z(r.from[1])), c.lineTo(X(r.to[0]), Z(r.to[1]))), r.width + 0.8, edge);
  roadPath(ring, RING.width, road);
  roadPath(roundabout, ROUNDABOUT.width, road);
  roadPath(oval, OVAL.width, road);
  for (const r of ROADS) roadPath((c) => (c.moveTo(X(r.from[0]), Z(r.from[1])), c.lineTo(X(r.to[0]), Z(r.to[1]))), r.width, road);
  if (!opts.detail) return;

  // Centre dashes.
  c.globalAlpha = 0.85;
  roadPath(ring, 0.3, PALETTE.paper, [3, 5]);
  roadPath(roundabout, 0.3, PALETTE.paper, [3, 5]);
  roadPath(roads, 0.3, PALETTE.paper, [3, 5]);
  c.globalAlpha = 1;
  // Kerbs on the oval: red/white, like a circuit.
  c.lineCap = "butt";
  roadPath(oval, OVAL.width + 1.6, PALETTE.paper);
  roadPath(oval, OVAL.width + 1.6, PALETTE.red, [1.6, 1.6]);
  roadPath(oval, OVAL.width, PALETTE.road);
  roadPath(oval, 0.3, PALETTE.paper, [2, 3]);
  c.lineCap = "round";
}

function paintGround(size: number) {
  const canvas = makeCanvas(size, size);
  const c = canvas.getContext("2d");
  if (!c) throw new Error("2d canvas unavailable");
  const s = size / EXTENT;
  const X = (x: number) => (x + ISLAND.half) * s;
  const Z = (z: number) => (z + ISLAND.half) * s;

  c.fillStyle = PALETTE.ground;
  c.fillRect(0, 0, size, size);
  // Speckle so the flat ground has some grain at distance.
  for (let i = 0; i < size * 6; i++) {
    const v = Math.random();
    c.fillStyle = v < 0.5 ? "rgba(255,240,230,0.035)" : "rgba(0,0,0,0.08)";
    c.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Plazas: lighter concrete under each zone and the pit.
  c.fillStyle = PALETTE.groundLight;
  for (const z of ZONE_LAYOUT) {
    c.beginPath();
    c.roundRect(X(z.center.x - z.center.r * 0.8), Z(z.center.z - z.center.r * 0.8), z.center.r * 1.6 * s, z.center.r * 1.6 * s, 3 * s);
    c.fill();
  }
  // Pit lane: forecourt with grid boxes.
  c.fillStyle = "#3d3533";
  c.fillRect(X(-22), Z(GARAGE.door - 26), 44 * s, 26 * s);
  c.strokeStyle = PALETTE.paper;
  c.lineWidth = 0.3 * s;
  for (let i = -1; i <= 1; i += 2) c.strokeRect(X(i * 5 - 2), Z(GARAGE.door - 12), 4 * s, 7 * s);

  // Arena floor with hazard border.
  c.fillStyle = "#332c2a";
  c.fillRect(X(-ARENA.half), Z(-ARENA.half), ARENA.half * 2 * s, ARENA.half * 2 * s);
  c.save();
  c.beginPath();
  c.rect(X(-ARENA.half), Z(-ARENA.half), ARENA.half * 2 * s, ARENA.half * 2 * s);
  c.rect(X(-ARENA.half + 1.4), Z(-ARENA.half + 1.4), (ARENA.half - 1.4) * 2 * s, (ARENA.half - 1.4) * 2 * s);
  c.clip("evenodd");
  for (let i = -60; i < 60; i += 2.4) {
    c.fillStyle = (Math.round(i / 2.4) & 1) === 0 ? PALETTE.red : PALETTE.ink;
    c.beginPath();
    c.moveTo(X(i), Z(-ARENA.half));
    c.lineTo(X(i + 1.2), Z(-ARENA.half));
    c.lineTo(X(i + 1.2 + 40), Z(ARENA.half));
    c.lineTo(X(i + 40), Z(ARENA.half));
    c.fill();
  }
  c.restore();

  paintRoads(c, size, { detail: true });

  // Rim: a painted border inside the sea wall.
  c.strokeStyle = PALETTE.paper;
  c.lineWidth = 0.5 * s;
  c.setLineDash([2 * s, 2 * s]);
  c.strokeRect(X(-ISLAND.half + 5), Z(-ISLAND.half + 5), (EXTENT - 10) * s, (EXTENT - 10) * s);
  c.setLineDash([]);
  return canvas;
}

/** A wedge (ramp) as a mesh and a convex-hull collider. */
function wedge(physics: Physics, group: THREE.Group, x: number, z: number, yaw: number, len: number, width: number, h: number, mat: THREE.Material) {
  const hw = width / 2;
  const pts = [
    [-hw, 0, 0],
    [hw, 0, 0],
    [-hw, 0, len],
    [hw, 0, len],
    [-hw, h, len],
    [hw, h, len],
  ];
  const geo = new THREE.BufferGeometry();
  const P = pts.map((p) => new THREE.Vector3(...(p as [number, number, number])));
  const tri = (a: number, b: number, c: number) => [P[a], P[b], P[c]];
  const faces = [...tri(0, 2, 4), ...tri(1, 5, 3), ...tri(0, 4, 5), ...tri(0, 5, 1), ...tri(2, 3, 5), ...tri(2, 5, 4), ...tri(0, 1, 3), ...tri(0, 3, 2)];
  geo.setFromPoints(faces);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const { R, world } = physics;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const flat = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => {
    flat[i * 3] = p[0] * cos + p[2] * sin + x;
    flat[i * 3 + 1] = p[1];
    flat[i * 3 + 2] = -p[0] * sin + p[2] * cos + z;
  });
  const desc = R.ColliderDesc.convexHull(flat);
  if (desc) world.createCollider(desc.setCollisionGroups(WORLD_GROUPS).setFriction(0.9));
}

export type Island = {
  group: THREE.Group;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  sky: THREE.Mesh;
  skyMat: THREE.ShaderMaterial;
  stars: THREE.Points;
  fog: THREE.Fog;
  groundCanvas: HTMLCanvasElement;
  lampMat: THREE.MeshLambertMaterial;
  setTime: (t: TimeOfDay) => void;
  followSun: (target: THREE.Vector3) => void;
};

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBottom;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunSize;
void main() {
  float y = vDir.y;
  vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-y * 3.0, 0.0, 1.0), 0.6));
  float d = max(dot(vDir, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(d, 900.0 / uSunSize) * 1.6 + pow(d, 12.0) * 0.35);
  gl_FragColor = vec4(col, 1.0);
}`;

type SkyPreset = { top: string; horizon: string; bottom: string; sun: string; sunDir: [number, number, number]; sunSize: number; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; fog: string; stars: number; lamps: number };

export const SKIES: Record<TimeOfDay, SkyPreset> = {
  day: { top: "#8a170a", horizon: "#ff7d4f", bottom: "#3a120a", sun: "#ffe0bd", sunDir: [-0.55, 0.42, -0.72], sunSize: 1.4, sunI: 3.1, hemiSky: "#ffc2a8", hemiGround: "#5a2a1c", hemiI: 1.55, fog: "#dc6444", stars: 0, lamps: 0.2 },
  dusk: { top: "#2c0812", horizon: "#cf3a4f", bottom: "#1a070b", sun: "#ff936a", sunDir: [-0.7, 0.12, -0.7], sunSize: 2.6, sunI: 1.6, hemiSky: "#d06a7c", hemiGround: "#2a1012", hemiI: 1.0, fog: "#7a2538", stars: 0.35, lamps: 1.2 },
  night: { top: "#050206", horizon: "#2e0c10", bottom: "#030102", sun: "#9fb0d6", sunDir: [0.4, 0.55, 0.6], sunSize: 0.8, sunI: 0.35, hemiSky: "#4a3550", hemiGround: "#0c0606", hemiI: 0.45, fog: "#170809", stars: 1, lamps: 2.6 },
};

export function buildIsland(physics: Physics, tierShadowMap: number, groundSize: number): Island {
  const group = new THREE.Group();
  const { R, world } = physics;

  // Ground.
  const groundCanvas = paintGround(groundSize);
  const groundTex = canvasTexture(groundCanvas, { anisotropy: 8 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(EXTENT, EXTENT), new THREE.MeshLambertMaterial({ map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  world.createCollider(R.ColliderDesc.cuboid(ISLAND.half, 2, ISLAND.half).setTranslation(0, -2, 0).setFriction(1).setCollisionGroups(WORLD_GROUPS));

  // Cliff: the island is a block; its sides read as a sea cliff.
  const cliffMat = lambert("#6a524a");
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(EXTENT + 0.2, 16, EXTENT + 0.2), cliffMat);
  cliff.position.y = -8.02;
  group.add(cliff);
  // Water.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), lambert(PALETTE.water));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -7;
  group.add(water);

  // Sea wall with a paper cap: the edge is a wall you can see, not an invisible one.
  const wallMat = lambert(PALETTE.concreteDark);
  const capMat = lambert(PALETTE.paper);
  const W = ISLAND.half - 1;
  for (const [x, z, hx, hz] of [
    [0, -W, ISLAND.half, 0.7],
    [0, W, ISLAND.half, 0.7],
    [-W, 0, 0.7, ISLAND.half],
    [W, 0, 0.7, ISLAND.half],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.5, hz * 2), wallMat);
    wall.position.set(x, 0.75, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(hx * 2 + 0.1, 0.18, hz * 2 + 0.1), capMat);
    cap.position.set(x, 1.55, z);
    group.add(cap);
    physics.box(x, 0.8, z, hx, 0.8, hz);
  }

  // Ramps and the raised deck.
  const rampMat = lambert(PALETTE.red);
  for (const [x, z, yaw, len, w, h] of RAMPS) wedge(physics, group, x, z, yaw, len, w, h, rampMat);
  {
    const d = DECK;
    const deckMat = lambert(PALETTE.concrete);
    const top = new THREE.Mesh(new THREE.BoxGeometry(d.hx * 2, d.h, d.hz * 2), deckMat);
    top.position.set(d.x, d.h / 2, d.z);
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
    physics.box(d.x, d.h / 2, d.z, d.hx, d.h / 2, d.hz);
    wedge(physics, group, d.x, d.z - d.hz - d.rampLen, 0, d.rampLen, d.hx * 2, d.h, deckMat);
    wedge(physics, group, d.x, d.z + d.hz + d.rampLen, Math.PI, d.rampLen, d.hx * 2, d.h, deckMat);
    // Rails on the deck so it reads as a structure.
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, d.hz * 2), lambert(PALETTE.paper));
      rail.position.set(d.x + s * (d.hx - 0.15), d.h + 0.45, d.z);
      group.add(rail);
      physics.box(d.x + s * (d.hx - 0.15), d.h + 0.45, d.z, 0.12, 0.45, d.hz);
    }
  }

  // Arena walls (Demolition Rush), open to the south.
  {
    const a = ARENA.half;
    const m = lambert(PALETTE.concreteDark);
    const segs: Array<[number, number, number, number]> = [
      [0, -a, a, 0.5],
      [-a, 0, 0.5, a],
      [a, 0, 0.5, a],
      [-a + 6, a, 6, 0.5],
      [a - 6, a, 6, 0.5],
    ];
    for (const [x, z, hx, hz] of segs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.2, hz * 2), m);
      wall.position.set(x, 0.6, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
      physics.box(x, 0.6, z, hx, 0.6, hz);
    }
  }

  // Sky dome.
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uSunSize: { value: 1 },
    },
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  group.add(sky);

  // Stars (night only).
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const u = Math.random() * 0.9 + 0.08;
    const t = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    sp[i * 3] = r * Math.cos(t) * 800;
    sp[i * 3 + 1] = u * 800;
    sp[i * 3 + 2] = r * Math.sin(t) * 800;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: PALETTE.cream, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  group.add(stars);

  // Light.
  const hemi = new THREE.HemisphereLight("#ffb39a", "#3a1810", 1.1);
  group.add(hemi);
  const sun = new THREE.DirectionalLight("#ffd7ae", 2.4);
  sun.castShadow = tierShadowMap > 0;
  sun.shadow.mapSize.set(tierShadowMap, tierShadowMap);
  const sc = sun.shadow.camera;
  sc.left = -45;
  sc.right = 45;
  sc.top = 45;
  sc.bottom = -45;
  sc.near = 1;
  sc.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  group.add(sun, sun.target);

  const fog = new THREE.Fog("#dc6444", 90, 300);
  const lampMat = new THREE.MeshLambertMaterial({ color: PALETTE.cream, emissive: "#ffe2b8", emissiveIntensity: 0.2, flatShading: true });

  let sunDir = new THREE.Vector3(...SKIES.day.sunDir).normalize();
  const setTime = (t: TimeOfDay) => {
    const p = SKIES[t];
    const u = skyMat.uniforms;
    (u.uTop.value as THREE.Color).set(p.top);
    (u.uHorizon.value as THREE.Color).set(p.horizon);
    (u.uBottom.value as THREE.Color).set(p.bottom);
    (u.uSunColor.value as THREE.Color).set(p.sun);
    sunDir = new THREE.Vector3(...p.sunDir).normalize();
    (u.uSunDir.value as THREE.Vector3).copy(sunDir);
    u.uSunSize.value = p.sunSize;
    sun.color.set(p.sun);
    sun.intensity = p.sunI;
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    hemi.intensity = p.hemiI;
    fog.color.set(p.fog);
    starMat.opacity = p.stars;
    lampMat.emissiveIntensity = p.lamps;
  };
  setTime("day");

  const followSun = (target: THREE.Vector3) => {
    // The shadow camera rides with the car: sharp shadows near, none far away.
    sun.target.position.copy(target);
    sun.position.copy(target).addScaledVector(sunDir, 120);
    sky.position.copy(target).setY(0);
    stars.position.copy(sky.position);
  };

  return { group, sun, hemi, sky, skyMat, stars, fog, groundCanvas, lampMat, setTime, followSun };
}

export function signMaterial(texture: THREE.Texture) {
  return basic("#ffffff", { map: texture, toneMapped: false });
}
