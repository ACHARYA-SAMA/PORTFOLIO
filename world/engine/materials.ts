import * as THREE from "three";

/**
 * Shared, flat-shaded materials. One instance per colour/variant for the
 * whole world, so draw calls batch and nothing is compiled twice. Everything
 * created here is disposed together when the world unmounts.
 */

const cache = new Map<string, THREE.Material>();
const textures = new Set<THREE.Texture>();

type Opts = { emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; side?: THREE.Side; map?: THREE.Texture; vertexColors?: boolean; flat?: boolean; depthWrite?: boolean };

export function lambert(color: string, opts: Opts = {}): THREE.MeshLambertMaterial {
  const key = `l|${color}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? ""}|${opts.transparent ?? ""}|${opts.opacity ?? ""}|${opts.side ?? ""}|${opts.map?.uuid ?? ""}|${opts.vertexColors ?? ""}|${opts.flat ?? true}|${opts.depthWrite ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshLambertMaterial;
  const m = new THREE.MeshLambertMaterial({
    color,
    flatShading: opts.flat ?? true,
    emissive: opts.emissive ?? "#000000",
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    map: opts.map ?? null,
    vertexColors: opts.vertexColors ?? false,
    depthWrite: opts.depthWrite ?? true,
  });
  cache.set(key, m);
  return m;
}

/** Unlit colour, for emissive signage that should read the same day or night. */
export function basic(color: string, opts: { transparent?: boolean; opacity?: number; map?: THREE.Texture; side?: THREE.Side; depthWrite?: boolean; toneMapped?: boolean } = {}) {
  const key = `b|${color}|${opts.transparent ?? ""}|${opts.opacity ?? ""}|${opts.map?.uuid ?? ""}|${opts.side ?? ""}|${opts.depthWrite ?? ""}|${opts.toneMapped ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshBasicMaterial;
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    map: opts.map ?? null,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: opts.depthWrite ?? true,
    toneMapped: opts.toneMapped ?? true,
  });
  cache.set(key, m);
  return m;
}

export function track<T extends THREE.Texture>(t: T): T {
  textures.add(t);
  return t;
}

/** Canvas → texture with sane defaults for signage. */
export function canvasTexture(canvas: HTMLCanvasElement, opts: { repeat?: boolean; anisotropy?: number } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opts.anisotropy ?? 4;
  if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return track(t);
}

/** Dispose a short-lived texture now and stop tracking it (popping labels). */
export function release(t: THREE.Texture | null | undefined) {
  if (!t) return;
  textures.delete(t);
  t.dispose();
}

export function disposeMaterials() {
  cache.forEach((m) => m.dispose());
  cache.clear();
  textures.forEach((t) => t.dispose());
  textures.clear();
}
