import * as THREE from "three";
import { SCENES, parseCaption } from "@/lib/content";
import { sceneText } from "@/lib/scenes";
import { PALETTE } from "../../engine/config";
import type { Game } from "../../engine/game";
import { basic, canvasTexture, lambert, track } from "../../engine/materials";
import { CanvasDrums, FONTS, makeCanvas } from "../../engine/textures";
import { block, sign } from "../common";
import { BILLBOARD, GARAGE, LANDMARK } from "../layout";
import type { ZoneHooks } from "./index";

/* ── The garage the car rolls out of ─────────────────────────── */

function garage(game: Game) {
  const ctx = game.ctx;
  const { x, z } = GARAGE;
  const front = z - 7;
  const W = 14;
  const H = 6;
  const red = PALETTE.red;
  // Shell (walls are physics too).
  const parts: Array<[number, number, number, number, number, number, string]> = [
    [0.6, H, 14, x - W / 2, H / 2, z, red],
    [0.6, H, 14, x + W / 2, H / 2, z, red],
    [W, H, 0.6, x, H / 2, z + 7, red],
    [W + 0.6, 0.5, 14.6, x, H + 0.25, z, PALETTE.ink],
    [3.8, H, 0.6, x - 5.1, H / 2, front, red],
    [3.8, H, 0.6, x + 5.1, H / 2, front, red],
    [6.4, 1.6, 0.6, x, 5.2, front, red],
  ];
  for (const [w, h, d, px, py, pz, c] of parts) {
    block(ctx, w, h, d, px, py, pz, c);
    game.physics.box(px, py, pz, w / 2, h / 2, d / 2);
  }
  // Paper trim and the pit board.
  block(ctx, W + 0.8, 0.25, 0.8, x, H - 0.1, front - 0.1, PALETTE.paper, 0, false);
  sign(ctx, "PIT GARAGE", x, 5.2, front - 0.32, Math.PI, 6.2, 1.4, { bg: PALETTE.ink, fg: PALETTE.paper, font: "display", emissive: true });
  // Interior: a strip light and a tool wall.
  const strip = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.4), basic(PALETTE.cream, { toneMapped: false }));
  strip.position.set(x, H - 0.4, z);
  ctx.group.add(strip);
  block(ctx, 10, 2.4, 0.3, x, 1.2, z + 6.6, PALETTE.ink);
  for (let i = -3; i <= 3; i++) block(ctx, 0.6, 0.12, 0.3, x + i * 1.3, 1.6 + (i % 2) * 0.4, z + 6.4, PALETTE.steel);

  // Roll-up door: slats texture, rolls up on start.
  const c = makeCanvas(256, 256);
  const g = c.getContext("2d")!;
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? "#1d1d1d" : "#262626";
    g.fillRect(0, i * 16, 256, 16);
  }
  g.fillStyle = PALETTE.signal;
  g.fillRect(0, 240, 256, 16);
  const door = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4.4, 0.18), lambert("#ffffff", { map: canvasTexture(c) }));
  door.position.set(x, 2.2, front);
  door.castShadow = true;
  ctx.group.add(door);
  const doorCollider = game.physics.box(x, 2.2, front, 3.2, 2.2, 0.12);

  let opening = -1;
  ctx.addUpdate((dt) => {
    if (opening < 0) return;
    opening = Math.min(1, opening + dt / 0.9);
    const e = 1 - (1 - opening) ** 3;
    door.scale.y = Math.max(0.05, 1 - e * 0.95);
    door.position.y = 2.2 + e * 2.1 + (1 - door.scale.y) * 0.1;
  });
  return {
    open: () => {
      if (opening >= 0) return;
      opening = 0;
      doorCollider.setEnabled(false);
      game.audio.play("door");
    },
  };
}

/* ── The odometer gantry over the spine road ────────────────── */

function captionCanvas(text: string, canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  g.fillStyle = PALETTE.paper;
  g.fillRect(0, 0, w, h);
  const size = h * 0.42;
  g.textBaseline = "middle";
  // Same emphasis rule as the site: *asterisks* are black italic.
  const words = parseCaption(text);
  const measure = (wd: { text: string; em: boolean }) => {
    g.font = wd.em ? `italic 400 ${size}px ${FONTS.serif}` : `400 ${size}px ${FONTS.serif}`;
    return g.measureText(wd.text).width;
  };
  const space = size * 0.28;
  let total = 0;
  words.forEach((wd, i) => (total += measure(wd) + (i > 0 && !wd.glue ? space : 0)));
  let cx = Math.max(w * 0.04, (w - total) / 2);
  words.forEach((wd, i) => {
    if (i > 0 && !wd.glue) cx += space;
    g.font = wd.em ? `italic 400 ${size}px ${FONTS.serif}` : `400 ${size}px ${FONTS.serif}`;
    g.fillStyle = wd.em ? PALETTE.ink : "#3a3a3a";
    g.fillText(wd.text, cx, h * 0.52);
    cx += g.measureText(wd.text).width;
  });
}

function gantry(game: Game) {
  const ctx = game.ctx;
  const { x, z } = LANDMARK;
  for (const s of [-1, 1]) {
    block(ctx, 1.3, 9.4, 1.3, x + s * 9, 4.7, z, PALETTE.ink);
    game.physics.box(x + s * 9, 4.7, z, 0.65, 4.7, 0.65);
  }
  block(ctx, 20, 3.6, 1.5, x, 8.4, z, PALETTE.red);
  block(ctx, 20.4, 0.3, 1.7, x, 10.3, z, PALETTE.paper, 0, false);

  const drums = new CanvasDrums(9, sceneText(0), { cell: 112 });
  const ratio = drums.canvas.height / drums.canvas.width;
  const mat = basic("#ffffff", { map: drums.texture, toneMapped: false });
  for (const s of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 14.5 * ratio), mat);
    face.position.set(x, 8.55, z + s * 0.77);
    face.rotation.y = s > 0 ? 0 : Math.PI;
    ctx.group.add(face);
  }
  const capCanvas = makeCanvas(1600, 140);
  captionCanvas(SCENES[0].caption, capCanvas);
  const capTex = track(new THREE.CanvasTexture(capCanvas));
  capTex.colorSpace = THREE.SRGBColorSpace;
  const capMat = basic("#ffffff", { map: capTex, toneMapped: false });
  for (const s of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.4), capMat);
    cap.position.set(x, 5.9, z + s * 0.2);
    cap.rotation.y = s > 0 ? 0 : Math.PI;
    ctx.group.add(cap);
  }
  block(ctx, 16.4, 1.6, 0.3, x, 5.9, z, PALETTE.ink, 0, false);

  let scene = 0;
  let next = 3.6;
  ctx.addUpdate((_, t) => {
    drums.update(t);
    if (t < next) return;
    next = t + 3.6;
    scene = (scene + 1) % SCENES.length;
    drums.roll(sceneText(scene), t, 0.06);
    captionCanvas(SCENES[scene].caption, capCanvas);
    capTex.needsUpdate = true;
  });
}

/* ── Unmask billboard: armour, until the headlights find the face ── */

const BB_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BB_FRAG = /* glsl */ `
uniform sampler2D uPortrait;
uniform sampler2D uArmour;
uniform vec3 uL0;
uniform vec3 uL1;
uniform vec3 uDir;
uniform float uCosOut;
uniform float uCosIn;
uniform float uRange;
uniform float uAmbient;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormal;
float cone(vec3 lp) {
  vec3 L = vWorld - lp;
  float d = length(L);
  vec3 n = L / max(d, 0.001);
  float a = smoothstep(uCosOut, uCosIn, dot(n, uDir));
  float r = 1.0 - smoothstep(uRange * 0.55, uRange, d);
  float facing = step(0.0, dot(vNormal, -n));
  return a * r * facing;
}
void main() {
  float k = clamp(cone(uL0) + cone(uL1), 0.0, 1.0);
  vec3 arm = texture2D(uArmour, vUv).rgb;
  vec3 por = texture2D(uPortrait, vUv).rgb;
  vec3 col = mix(arm * uAmbient, por * (0.7 + 0.5 * k), k);
  col += vec3(0.5, 0.85, 1.0) * k * (1.0 - k) * 0.5;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function billboard(game: Game) {
  const ctx = game.ctx;
  const { x, z, yaw } = BILLBOARD;
  const loader = new THREE.TextureLoader();
  const load = (src: string) => {
    const t = track(loader.load(src));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: BB_VERT,
    fragmentShader: BB_FRAG,
    uniforms: {
      uPortrait: { value: load("/images/arman-portrait.jpg") },
      uArmour: { value: load("/images/arman-ironman.jpg") },
      uL0: { value: new THREE.Vector3(0, -99, 0) },
      uL1: { value: new THREE.Vector3(0, -99, 0) },
      uDir: { value: new THREE.Vector3(0, 0, 1) },
      uCosOut: { value: Math.cos(0.55) },
      uCosIn: { value: Math.cos(0.3) },
      uRange: { value: 34 },
      uAmbient: { value: 1 },
    },
  });
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = yaw;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), mat);
  face.position.y = 6;
  g.add(face);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 8.6, 0.3), lambert(PALETTE.ink));
  frame.position.set(0, 6, -0.18);
  frame.castShadow = true;
  g.add(frame);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.4), lambert(PALETTE.ink));
    post.position.set(s * 2.2, 1.1, -0.2);
    g.add(post);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 0.6), basic("#ffffff", { map: makeLabel("Headlights on the face to unmask"), toneMapped: false }));
  plate.position.set(0, 1.6, 0.0);
  g.add(plate);
  ctx.group.add(g);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (const s of [-1, 1]) game.physics.box(x + s * 2.2 * cos, 1.1, z - s * 2.2 * sin, 0.2, 1.1, 0.2);
  game.physics.box(x, 6, z, 3.3, 4.3, 0.2, { y: yaw });

  const l = new THREE.Vector3();
  ctx.addUpdate(() => {
    const car = game.car.group;
    const u = mat.uniforms;
    (u.uL0.value as THREE.Vector3).copy(l.set(0.56, 0.2, 1.3).applyQuaternion(car.quaternion).add(car.position));
    (u.uL1.value as THREE.Vector3).copy(l.set(-0.56, 0.2, 1.3).applyQuaternion(car.quaternion).add(car.position));
    (u.uDir.value as THREE.Vector3).set(0, -0.08, 1).normalize().applyQuaternion(car.quaternion);
  });
  return {
    setNight: (ambient: number) => {
      mat.uniforms.uAmbient.value = ambient;
    },
    dispose: () => mat.dispose(),
  };
}

function makeLabel(text: string) {
  const c = makeCanvas(1024, 96);
  const g = c.getContext("2d")!;
  g.fillStyle = PALETTE.ink;
  g.fillRect(0, 0, 1024, 96);
  g.fillStyle = PALETTE.signal;
  g.font = `600 40px ${FONTS.mono}`;
  (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "6px";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text.toUpperCase(), 512, 50);
  return canvasTexture(c);
}

export function buildPit(game: Game): ZoneHooks {
  const door = garage(game);
  gantry(game);
  const bb = billboard(game);
  // A few crates in the pit lane to warm up on.
  game.destruction.spawn("crate", 6.5, 0.55, 74, 0.2);
  game.destruction.spawn("crate", 7.7, 0.55, 74.4, -0.1);
  game.destruction.spawn("crate", 7.1, 1.66, 74.2, 0.3);
  for (let i = 0; i < 4; i++) game.destruction.spawn("cone", -5 + i * 1.6, 0.4, 70 - i * 0.6, i);
  return {
    onStart: () => door.open(),
    onTime: (t) => bb.setNight(t === "day" ? 1 : t === "dusk" ? 0.5 : 0.16),
  };
}
