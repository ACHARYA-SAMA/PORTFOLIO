/**
 * World constants. Units are metres, seconds, kilograms (arcade-scaled).
 * Colours come from the site's tokens; the few extras (wood, brick, foliage,
 * water) are muted so the world still reads as the same brand.
 */

export const STEP = 1 / 60;
export const MAX_STEPS_PER_FRAME = 4;
export const GRAVITY = -24;

export const ISLAND = { half: 125, rim: 4 };

export const PALETTE = {
  red: "#e3170a",
  redHi: "#ff2a17",
  redLo: "#b80f05",
  ink: "#0d0d0d",
  asphalt: "#141414",
  paper: "#f3f1ec",
  cream: "#fff6ee",
  signal: "#c8ff2e",
  // World extras
  ground: "#5e4c46",
  groundLight: "#73625b",
  road: "#262322",
  concrete: "#b3aaa0",
  concreteDark: "#7c756e",
  wood: "#b8834d",
  woodDark: "#7c5230",
  brick: "#9e1c10",
  brickDark: "#6e140b",
  glass: "#cfe6ea",
  metal: "#55524f",
  steel: "#c9c4bc",
  foliage: "#43592b",
  foliageDark: "#2f4220",
  water: "#1d2b30",
} as const;

/** Body colours offered in customisation: tokens plus two extras. */
export const CAR_COLORS = [
  { id: "red", label: "Machine red", hex: PALETTE.red },
  { id: "ink", label: "Ink", hex: "#1b1b1b" },
  { id: "paper", label: "Paper", hex: PALETTE.paper },
  { id: "signal", label: "Signal", hex: PALETTE.signal },
  { id: "orange", label: "Pit orange", hex: "#ff6a1a" },
  { id: "steel", label: "Steel", hex: "#6b7a86" },
] as const;

/* ── Collision groups: (membership << 16) | filter ───────────── */

export const G_WORLD = 1 << 0;
export const G_CAR = 1 << 1;
export const G_PROP = 1 << 2;
export const G_DEBRIS = 1 << 3;

export const groups = (member: number, filter: number) => ((member & 0xffff) << 16) | (filter & 0xffff);

export const WORLD_GROUPS = groups(G_WORLD, G_CAR | G_PROP | G_DEBRIS);
export const CAR_GROUPS = groups(G_CAR, G_WORLD | G_PROP | G_DEBRIS);
export const PROP_GROUPS = groups(G_PROP, G_WORLD | G_CAR | G_PROP | G_DEBRIS);
export const debrisGroups = (debrisVsDebris: boolean) =>
  groups(G_DEBRIS, G_WORLD | G_CAR | G_PROP | (debrisVsDebris ? G_DEBRIS : 0));

/* ── Quality tiers ───────────────────────────────────────────── */

export type Tier = "low" | "medium" | "high";

export type TierConfig = {
  dpr: number;
  antialias: boolean;
  shadows: boolean;
  shadowMap: number;
  maxBodies: number;
  maxDebris: number;
  particles: number;
  debrisVsDebris: boolean;
  glassShards: boolean;
  fogFar: number;
  bloom: boolean;
  ambientLife: number;
};

export const TIERS: Record<Tier, TierConfig> = {
  high: { dpr: 1.75, antialias: true, shadows: true, shadowMap: 2048, maxBodies: 300, maxDebris: 2000, particles: 1600, debrisVsDebris: true, glassShards: true, fogFar: 300, bloom: true, ambientLife: 1 },
  medium: { dpr: 1.25, antialias: true, shadows: true, shadowMap: 1024, maxBodies: 160, maxDebris: 1000, particles: 900, debrisVsDebris: false, glassShards: true, fogFar: 240, bloom: false, ambientLife: 0.6 },
  low: { dpr: 1.3, antialias: false, shadows: false, shadowMap: 512, maxBodies: 100, maxDebris: 500, particles: 450, debrisVsDebris: false, glassShards: false, fogFar: 190, bloom: false, ambientLife: 0.3 },
};

export const TIER_ORDER: Tier[] = ["low", "medium", "high"];

/** First guess before any frame is measured. Touch devices start on the mobile tier. */
export function guessTier(): Tier {
  if (typeof window === "undefined") return "medium";
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (touch) return "low";
  const cores = navigator.hardwareConcurrency || 4;
  return cores >= 8 ? "high" : "medium";
}

/* ── Gameplay ────────────────────────────────────────────────── */

export const COMBO_WINDOW = 2.5;
export const COMBO_MAX = 10;
export const PAD_SPEED = 4.5; // m/s: slow enough on a pad and its panel opens
export const RUSH_SECONDS = 60;
export const LONG_JUMP = 25;
