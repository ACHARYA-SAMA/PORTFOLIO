import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PALETTE, type Tier } from "../engine/config";
import type { Destruction } from "../engine/destruction";
import { canvasTexture, lambert } from "../engine/materials";
import { makeCanvas } from "../engine/textures";

/** Plank texture for crates and fences, drawn once. */
function plankTexture(base: string, dark: string, brace: boolean) {
  const c = makeCanvas(128, 128);
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = dark;
  g.lineWidth = 2;
  for (let y = 0; y < 128; y += 21) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
  }
  g.lineWidth = 10;
  g.strokeRect(5, 5, 118, 118);
  if (brace) {
    g.beginPath();
    g.moveTo(10, 118);
    g.lineTo(118, 10);
    g.stroke();
  }
  for (const [x, y] of [
    [10, 10],
    [118, 10],
    [10, 118],
    [118, 118],
  ]) {
    g.fillStyle = "#3a2a1c";
    g.fillRect(x - 2, y - 2, 4, 4);
  }
  const t = canvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

function stripeTexture(a: string, b: string) {
  const c = makeCanvas(64, 64);
  const g = c.getContext("2d")!;
  g.fillStyle = a;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = b;
  g.fillRect(0, 22, 64, 14);
  return canvasTexture(c);
}

export const CRATE_TEX = { wood: null as THREE.Texture | null };

export function defineArchetypes(d: Destruction, tier: Tier, lampMat: THREE.Material) {
  const cap = (n: number) => (tier === "low" ? Math.ceil(n * 0.6) : n);
  const crateMat = lambert("#ffffff", { map: plankTexture(PALETTE.wood, PALETTE.woodDark, true) });
  CRATE_TEX.wood = (crateMat as THREE.MeshLambertMaterial).map;

  d.define({ id: "crate", material: "wood", size: [1.1, 1.1, 1.1], visual: crateMat, pieces: 7, finePieces: 3, capacity: cap(220) });
  d.define({ id: "crate-s", material: "wood", size: [0.75, 0.75, 0.75], visual: crateMat, pieces: 5, finePieces: 3, capacity: cap(120) });
  // Karate boards: held in a rack (anchored), snap in two.
  d.define({ id: "board", material: "wood", size: [0.9, 0.55, 0.06], visual: lambert("#e2b77f"), pieces: 2, finePieces: 3, weights: [1, 0.2, 0], anchored: true, threshold: 2600, capacity: 48, scoreMul: 1.6 });
  d.define({ id: "brick", material: "brick", size: [0.7, 0.35, 0.35], visual: lambert("#ffffff"), pieces: 3, finePieces: 2, capacity: cap(720) });
  d.define({ id: "barrier", material: "concrete", size: [2.2, 0.9, 0.6], visual: lambert(PALETTE.concrete), pieces: 6, finePieces: 2, capacity: cap(70) });
  d.define({ id: "pillar", material: "concrete", size: [0.8, 3.2, 0.8], visual: lambert(PALETTE.concrete), pieces: 6, finePieces: 2, weights: [1, 1.4, 1], capacity: 24 });
  d.define({
    id: "glass",
    material: "glass",
    size: [1.6, 1.3, 0.06],
    visual: new THREE.MeshLambertMaterial({ color: PALETTE.glass, transparent: true, opacity: 0.5, emissive: "#9fd6e0", emissiveIntensity: 0.3, depthWrite: false }),
    pieces: 12,
    finePieces: 2,
    weights: [1, 1, 0],
    capacity: 60,
    castShadow: false,
  });

  // Barrels: red with an ink band; metal, they topple and clang.
  const barrelGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.05, 12);
  const barrelTex = stripeTexture(PALETTE.red, PALETTE.ink);
  d.define({ id: "barrel", material: "metal", size: [0.9, 1.05, 0.9], shape: "cylinder", geometry: barrelGeo, visual: lambert("#ffffff", { map: barrelTex }), capacity: cap(70) });

  // Cones: light, they fly.
  const coneGeo = mergeGeometries([new THREE.ConeGeometry(0.28, 0.8, 10).translate(0, 0.05, 0), new THREE.BoxGeometry(0.6, 0.08, 0.6).translate(0, -0.36, 0)]);
  d.define({ id: "cone", material: "metal", size: [0.6, 0.8, 0.6], geometry: coneGeo, visual: lambert("#ffffff", { map: stripeTexture(PALETTE.red, PALETTE.paper) }), capacity: cap(90) });

  // Lamp posts: anchored until hit hard, then they bend over and topple. Head glows at night.
  const pole = new THREE.CylinderGeometry(0.11, 0.15, 5.2, 8);
  const arm = new THREE.BoxGeometry(0.12, 0.12, 1.2).translate(0, 2.5, 0.5);
  const head = new THREE.BoxGeometry(0.42, 0.18, 0.62).translate(0, 2.42, 1.05);
  const lampGeo = mergeGeometries([mergeGeometries([pole, arm]), head], true);
  d.define({ id: "lamp", material: "metal", size: [0.3, 5.2, 0.3], geometry: lampGeo, visual: [lambert(PALETTE.ink), lampMat], anchored: true, threshold: 14000, capacity: cap(48) });

  // Hedges scatter into leaves.
  const hedgeGeo = new THREE.BoxGeometry(2.2, 1.1, 1, 2, 1, 1);
  const pos = hedgeGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + (pos.getY(i) > 0 ? Math.sin(i * 7.3) * 0.12 : 0));
  hedgeGeo.computeVertexNormals();
  d.define({ id: "hedge", material: "foliage", size: [2.2, 1.1, 1], geometry: hedgeGeo, visual: lambert(PALETTE.foliage), capacity: cap(140) });

  // Fence: two rails and three posts, splinters into planks.
  const fenceParts = [
    new THREE.BoxGeometry(2.4, 0.16, 0.08).translate(0, 0.2, 0),
    new THREE.BoxGeometry(2.4, 0.16, 0.08).translate(0, -0.15, 0),
    new THREE.BoxGeometry(0.12, 0.9, 0.12).translate(-1.1, 0, 0),
    new THREE.BoxGeometry(0.12, 0.9, 0.12).translate(0, 0, 0),
    new THREE.BoxGeometry(0.12, 0.9, 0.12).translate(1.1, 0, 0),
  ];
  d.define({ id: "fence", material: "wood", size: [2.4, 0.9, 0.12], geometry: mergeGeometries(fenceParts), visual: lambert(PALETTE.paper), pieces: 5, finePieces: 2, weights: [1, 0.6, 0], capacity: cap(160) });

  // Cans for the can pyramid.
  d.define({ id: "can", material: "metal", size: [0.36, 0.5, 0.36], shape: "cylinder", geometry: new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10), visual: lambert("#ffffff", { map: stripeTexture(PALETTE.paper, PALETTE.red) }), capacity: 40 });

  // Road signs: anchored, topple.
  const signGeo = mergeGeometries([new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.BoxGeometry(0.9, 0.6, 0.05).translate(0, 0.95, 0)]);
  d.define({ id: "signpost", material: "metal", size: [0.2, 2.4, 0.2], geometry: signGeo, visual: lambert(PALETTE.paper), anchored: true, threshold: 6000, capacity: 30 });

  // Wall panels (Team Radio buildings): plaster that breaks into slabs; posters ride on them.
  d.define({ id: "panel", material: "concrete", size: [2, 1.6, 0.25], pieces: 6, finePieces: 2, weights: [1, 1, 0.2], seed: 91 });
  // Big letters for LET'S TALK: knocked over, never broken.
  d.define({ id: "letter", material: "metal", size: [1.6, 2.4, 0.5] });
  // Labelled tech crates (custom meshes).
  d.define({ id: "tech-crate", material: "wood", size: [1.5, 1.5, 1.5], pieces: 9, finePieces: 3, scoreMul: 2 });
  // Rush props.
  d.define({ id: "tower-block", material: "wood", size: [1.2, 0.6, 1.2], visual: crateMat, pieces: 5, finePieces: 2, capacity: cap(160) });
}

/** Brick tones, applied per instance. */
export const BRICK_TONES = [PALETTE.brick, PALETTE.brickDark, "#b2281a", "#8c180d"];
