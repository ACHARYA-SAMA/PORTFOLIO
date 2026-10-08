import { create } from "zustand";
import type { Tier } from "./config";
import type { TimeOfDay } from "@/lib/progress";
import type { ZoneId } from "@/lib/zones";

/**
 * UI-facing game state. Only things the HUD renders live here, and they
 * change at human speed (a zone entered, a toast, a score tick). Per-frame
 * numbers (speed, boost, heading) live in `telemetry`, a plain mutable
 * object the HUD polls on its own rAF, so React never re-renders per frame.
 */

export type Phase = "loading" | "title" | "intro" | "play" | "leaving" | "fallback";
export type CameraMode = "chase" | "far" | "top";
export type Device = "keyboard" | "gamepad" | "touch";

export type Toast = { id: number; kind: "achievement" | "ticket" | "info" | "label"; title: string; body?: string; meta?: string };

export type RushState = { active: boolean; timeLeft: number; score: number; best: number };
export type DojoState = { active: boolean; timeLeft: number; boards: number; best: number };

export type UIState = {
  phase: Phase;
  paused: boolean;
  helpOpen: boolean;
  zoneMenuOpen: boolean;
  customizeOpen: boolean;
  panel: ZoneId | null;
  prompt: string | null;
  banner: { id: number; text: string } | null;
  toasts: Toast[];
  score: number;
  combo: number;
  bolts: number;
  tier: Tier;
  tierManual: boolean;
  time: TimeOfDay;
  sound: boolean;
  cameraMode: CameraMode;
  photo: boolean;
  device: Device;
  hint: boolean;
  debug: boolean;
  rush: RushState;
  dojo: DojoState;
  /** Reason the world did not start (fallback phase). */
  fallback: string | null;
  loadProgress: number;
};

const INITIAL: UIState = {
  phase: "loading",
  paused: false,
  helpOpen: false,
  zoneMenuOpen: false,
  customizeOpen: false,
  panel: null,
  prompt: null,
  banner: null,
  toasts: [],
  score: 0,
  combo: 0,
  bolts: 0,
  tier: "medium",
  tierManual: false,
  time: "day",
  sound: false,
  cameraMode: "chase",
  photo: false,
  device: "keyboard",
  hint: false,
  debug: false,
  rush: { active: false, timeLeft: 0, score: 0, best: 0 },
  dojo: { active: false, timeLeft: 0, boards: 0, best: 0 },
  fallback: null,
  loadProgress: 0,
};

export const useUI = create<UIState>(() => ({ ...INITIAL }));

/** Back to a clean slate when the world unmounts (so returning to / starts fresh). */
export const resetUI = () => useUI.setState({ ...INITIAL, rush: { ...INITIAL.rush }, dojo: { ...INITIAL.dojo } });

export const ui = {
  get: useUI.getState,
  set: useUI.setState,
};

let toastId = 0;
export function pushToast(toast: Omit<Toast, "id">, ms = 3600) {
  const id = ++toastId;
  ui.set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
  window.setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
}

let bannerId = 0;
export function showBanner(text: string) {
  const id = ++bannerId;
  ui.set({ banner: { id, text } });
  window.setTimeout(() => {
    if (ui.get().banner?.id === id) ui.set({ banner: null });
  }, 2600);
}

/** Per-frame numbers for the HUD, written by the game loop, read by the HUD's own rAF. */
export const telemetry = {
  speed: 0, // km/h, signed
  boost: 1, // 0..1 energy
  boosting: false,
  heading: 0, // radians, world yaw of the car
  x: 0,
  z: 0,
  comboTime: 0, // seconds left in the combo window
  fps: 0,
  frameMs: 0,
  physicsMs: 0,
  drawCalls: 0,
  triangles: 0,
  bodies: 0,
  activeBodies: 0,
  debris: 0,
  particles: 0,
  pool: "",
  memory: "",
};

/** The running game registers its command handler here so the HUD can reach it. */
export type Command =
  | "start"
  | "rebuild"
  | "respawn"
  | "camera"
  | "time"
  | "mute"
  | "horn"
  | "photo"
  | "portfolio"
  | "help"
  | "pause"
  | "resume"
  | "closePanel"
  | "interact"
  | "resetProgress"
  | "rushStart"
  | "dojoStart";

type Handler = (cmd: Command, arg?: unknown) => void;
let handler: Handler | null = null;
export const setCommandHandler = (h: Handler | null) => {
  handler = h;
};
export const command = (cmd: Command, arg?: unknown) => handler?.(cmd, arg);
