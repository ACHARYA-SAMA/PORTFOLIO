/**
 * Everything the world remembers, shared by the game (writes) and the
 * portfolio's trophy cabinet (reads). Versioned keys, localStorage only,
 * every access wrapped: private windows and blocked storage just mean
 * nothing is remembered. No accounts, no network.
 * TODO: online leaderboard (hook only; there is deliberately no backend).
 */
import { CHANNELS } from "./content";

const PREFIX = "arman:v1:";

export const KEYS = {
  stats: `${PREFIX}stats`,
  achievements: `${PREFIX}achievements`,
  bolts: `${PREFIX}bolts`,
  visited: `${PREFIX}visited`,
  car: `${PREFIX}car`,
  prefs: `${PREFIX}prefs`,
  skipIntro: `${PREFIX}skip-intro`,
} as const;

export type Stats = {
  boards: number;
  destroyed: number;
  bestRush: number;
  bestCombo: number;
  longestJump: number;
  rebuilds: number;
  horn: number;
};

export const EMPTY_STATS: Stats = { boards: 0, destroyed: 0, bestRush: 0, bestCombo: 0, longestJump: 0, rebuilds: 0, horn: 0 };

export type Quality = "auto" | "low" | "medium" | "high";
export type TimeOfDay = "day" | "dusk" | "night";
export type Prefs = { quality: Quality; time: TimeOfDay; replays: boolean };
export const DEFAULT_PREFS: Prefs = { quality: "auto", time: "day", replays: true };

export type Car = { color: string; plate: string };

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw) as unknown;
    return value === null || value === undefined ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress lives for this visit only */
  }
}

export function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string, on: boolean) {
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const readStats = (): Stats => ({ ...EMPTY_STATS, ...readJSON<Partial<Stats>>(KEYS.stats, {}) });
export const readList = (key: string): string[] => {
  const v = readJSON<unknown>(key, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};
export const readNumbers = (key: string): number[] => {
  const v = readJSON<unknown>(key, []);
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
};

/** True once the world has written anything at all. */
export function hasPlayed() {
  try {
    return window.localStorage.getItem(KEYS.stats) !== null || window.localStorage.getItem(KEYS.visited) !== null;
  } catch {
    return false;
  }
}

export function resetProgress() {
  for (const key of [KEYS.stats, KEYS.achievements, KEYS.bolts, KEYS.visited]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/* ── Achievements: about the player's driving, never about Arman ── */

export type Achievement = { id: string; label: string; detail: string; hidden?: boolean };

export const channelAchievementId = (name: string) => `channel-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-break", label: "First break", detail: "Broke something on purpose." },
  { id: "board-breaker", label: "Board breaker", detail: "Ten boards snapped at the Dojo." },
  { id: "clean-lap", label: "Clean lap", detail: "All seven Race Log gates, in order." },
  ...CHANNELS.map((c) => ({ id: channelAchievementId(c.name), label: `Channel cleared: ${c.name}`, detail: `Every ${c.name} crate in the Telemetry field.` })),
  { id: "full-telemetry", label: "Full telemetry", detail: "Every crate in the field." },
  { id: "all-bolts", label: "Bolt collector", detail: "All 40 hex bolts." },
  { id: "grand-tour", label: "Grand tour", detail: "Visited every zone." },
  { id: "long-jump", label: "Long jump", detail: "Over 25 m between take-off and landing." },
  { id: "combo-10", label: "Combo ×10", detail: "Ten breaks, never more than 2.5 s apart." },
  { id: "polite", label: "Polite driver", detail: "Used the horn ten times.", hidden: true },
  { id: "facilities", label: "Facilities team", detail: "Rebuilt the world five times.", hidden: true },
  { id: "roof", label: "Wrong way up", detail: "Five seconds on the roof.", hidden: true },
  { id: "manual", label: "Read the manual", detail: "Opened the controls sheet.", hidden: true },
  { id: "press-kit", label: "Press kit", detail: "Saved a photo from photo mode.", hidden: true },
  { id: "far-corner", label: "Cartographer", detail: "Found the island’s far corner.", hidden: true },
  { id: "roundabout", label: "Going round", detail: "A full lap of the roundabout.", hidden: true },
];

export const BOLT_COUNT = 40;
