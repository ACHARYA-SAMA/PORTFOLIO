/**
 * Pre-fracture: split a box into cuboid chunks once, at load, and reuse the
 * set for every instance of that archetype. A recursive random kd-split
 * (cut the longest weighted axis somewhere between 32% and 68%) reads far
 * less regular than a grid, and every piece stays a cuboid, so each chunk is
 * one cuboid collider and one scaled instance of a unit box.
 */

export type ChunkDef = { ox: number; oy: number; oz: number; sx: number; sy: number; sz: number };

/** Small deterministic PRNG so fracture sets are identical every visit. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

type Box = { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };

export function fractureBox(size: [number, number, number], pieces: number, weights: [number, number, number] = [1, 1, 1], seed = 7, minSize = 0.04): ChunkDef[] {
  const rand = rng(seed);
  const [sx, sy, sz] = size;
  let boxes: Box[] = [{ x0: -sx / 2, y0: -sy / 2, z0: -sz / 2, x1: sx / 2, y1: sy / 2, z1: sz / 2 }];
  let guard = 0;
  while (boxes.length < pieces && guard++ < pieces * 8) {
    // Split the box with the largest weighted extent.
    let bi = 0;
    let best = -1;
    let axis = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const e = [(b.x1 - b.x0) * weights[0], (b.y1 - b.y0) * weights[1], (b.z1 - b.z0) * weights[2]];
      for (let a = 0; a < 3; a++) {
        const jitter = e[a] * (0.85 + rand() * 0.3);
        if (jitter > best) {
          best = jitter;
          bi = i;
          axis = a;
        }
      }
    }
    const b = boxes[bi];
    const lo = axis === 0 ? b.x0 : axis === 1 ? b.y0 : b.z0;
    const hi = axis === 0 ? b.x1 : axis === 1 ? b.y1 : b.z1;
    if (hi - lo < minSize * 2) break;
    const cut = lo + (hi - lo) * (0.32 + rand() * 0.36);
    const a: Box = { ...b };
    const c: Box = { ...b };
    if (axis === 0) {
      a.x1 = cut;
      c.x0 = cut;
    } else if (axis === 1) {
      a.y1 = cut;
      c.y0 = cut;
    } else {
      a.z1 = cut;
      c.z0 = cut;
    }
    boxes = [...boxes.slice(0, bi), a, c, ...boxes.slice(bi + 1)];
  }
  return boxes.map((b) => ({
    ox: (b.x0 + b.x1) / 2,
    oy: (b.y0 + b.y1) / 2,
    oz: (b.z0 + b.z1) / 2,
    sx: b.x1 - b.x0,
    sy: b.y1 - b.y0,
    sz: b.z1 - b.z0,
  }));
}

/** Second level: split each coarse chunk again, for a disintegration. */
export function refine(chunks: ChunkDef[], perChunk: number, seed = 11): ChunkDef[] {
  const out: ChunkDef[] = [];
  chunks.forEach((c, i) => {
    for (const f of fractureBox([c.sx, c.sy, c.sz], perChunk, [1, 1, 1], seed + i * 13, 0.03)) {
      out.push({ ox: c.ox + f.ox, oy: c.oy + f.oy, oz: c.oz + f.oz, sx: f.sx, sy: f.sy, sz: f.sz });
    }
  });
  return out;
}
