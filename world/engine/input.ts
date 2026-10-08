import type { Device } from "./store";

/**
 * One input state for keyboard, gamepad (standard mapping) and the touch
 * controls. Continuous controls are read each frame from `axes`; one-shot
 * actions queue up and the game drains them once per frame.
 */

export type Action =
  | "start"
  | "interact"
  | "respawn"
  | "rebuild"
  | "camera"
  | "freeLook"
  | "time"
  | "mute"
  | "horn"
  | "photo"
  | "portfolio"
  | "help"
  | "pause"
  | "debug";

const KEY_ACTIONS: Record<string, Action> = {
  KeyE: "interact",
  KeyR: "respawn",
  KeyB: "rebuild",
  KeyC: "camera",
  KeyF: "freeLook",
  KeyN: "time",
  KeyM: "mute",
  KeyH: "horn",
  KeyK: "photo",
  KeyP: "portfolio",
  Escape: "pause",
  Backquote: "debug",
  Enter: "start",
};

// Standard gamepad buttons → actions (south/east are held controls, see poll()).
const PAD_ACTIONS: Array<[number, Action]> = [
  [2, "interact"],
  [3, "respawn"],
  [4, "horn"],
  [5, "camera"],
  [8, "rebuild"],
  [9, "pause"],
  [11, "freeLook"],
];

export type Axes = { throttle: number; brake: number; steer: number; handbrake: boolean; boost: boolean; lookX: number; lookY: number };

export class Input {
  readonly axes: Axes = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false, lookX: 0, lookY: 0 };
  readonly touch = { x: 0, y: 0, active: false, boost: false, drift: false };
  device: Device = "keyboard";
  onDevice: ((d: Device) => void) | null = null;
  /** Set while a text field or modal owns the keyboard. */
  suspended = false;
  /** Runs inside the key event itself (needed for window.open). Return true to consume. */
  onImmediate: ((action: Action) => boolean) | null = null;

  private keys = new Set<string>();
  private queue: Action[] = [];
  private padPrev: boolean[] = [];
  private attached = false;

  private setDevice(d: Device) {
    if (this.device === d) return;
    this.device = d;
    this.onDevice?.(d);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    this.setDevice("keyboard");
    if (e.key === "?") {
      e.preventDefault();
      if (!e.repeat) this.queue.push("help");
      return;
    }
    // Never steal browser/OS shortcuts.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      // Keep the page from scrolling, unless a control (button, link) has focus and wants Space.
      if (!(e.code === "Space" && target?.closest("button, a, [role='button']"))) e.preventDefault();
    }
    this.keys.add(e.code);
    if (e.repeat) return;
    const action = KEY_ACTIONS[e.code];
    if (!action || (this.suspended && action !== "pause" && action !== "help" && action !== "interact")) return;
    if (this.onImmediate?.(action)) return;
    if (this.suspended && action === "interact") {
      // E still closes an open panel.
      this.queue.push(action);
      return;
    }
    this.queue.push(action);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch") this.setDevice("touch");
    else if (e.pointerType === "mouse" && this.device === "touch") this.setDevice("keyboard");
  };

  private onPadConnect = () => this.setDevice("gamepad");

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("pointerdown", this.onPointer, { passive: true });
    window.addEventListener("gamepadconnected", this.onPadConnect);
  }

  detach() {
    this.attached = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("gamepadconnected", this.onPadConnect);
    this.keys.clear();
    this.queue.length = 0;
  }

  push(action: Action) {
    this.queue.push(action);
  }

  /** Drain queued actions into `out` (reused array, no allocation). */
  drain(out: Action[]) {
    out.length = 0;
    for (let i = 0; i < this.queue.length; i++) out.push(this.queue[i]);
    this.queue.length = 0;
    return out;
  }

  private down(...codes: string[]) {
    for (const c of codes) if (this.keys.has(c)) return true;
    return false;
  }

  /** Recompute continuous axes from every source. Call once per frame. */
  poll() {
    const a = this.axes;
    const k = this.suspended ? false : true;
    let throttle = k && this.down("KeyW", "ArrowUp") ? 1 : 0;
    let brake = k && this.down("KeyS", "ArrowDown") ? 1 : 0;
    let steer = (k && this.down("KeyA", "ArrowLeft") ? 1 : 0) - (k && this.down("KeyD", "ArrowRight") ? 1 : 0);
    let handbrake = k && this.down("Space");
    let boost = k && this.down("ShiftLeft", "ShiftRight");
    let lookX = 0;
    let lookY = 0;

    // Touch stick: up drives, down brakes/reverses.
    const t = this.touch;
    if (t.active) {
      steer = -t.x;
      throttle = Math.max(throttle, Math.max(0, -t.y) > 0.15 ? Math.min(1, -t.y * 1.25) : 0);
      brake = Math.max(brake, Math.max(0, t.y) > 0.25 ? Math.min(1, t.y * 1.25) : 0);
    }
    if (t.boost) boost = true;
    if (t.drift) handbrake = true;

    // Gamepad (standard mapping).
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== "standard") continue;
      const sx = pad.axes[0] ?? 0;
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      const used = Math.abs(sx) > 0.2 || rt > 0.1 || lt > 0.1 || pad.buttons.some((b) => b.pressed);
      if (used) this.setDevice("gamepad");
      if (Math.abs(sx) > 0.12) steer = -Math.sign(sx) * ((Math.abs(sx) - 0.12) / 0.88);
      if (rt > 0.05) throttle = Math.max(throttle, rt);
      if (lt > 0.05) brake = Math.max(brake, lt);
      if (pad.buttons[0]?.pressed) boost = true;
      if (pad.buttons[1]?.pressed) handbrake = true;
      const rx = pad.axes[2] ?? 0;
      const ry = pad.axes[3] ?? 0;
      if (Math.abs(rx) > 0.15) lookX = rx;
      if (Math.abs(ry) > 0.15) lookY = ry;
      for (const [i, action] of PAD_ACTIONS) {
        const p = !!pad.buttons[i]?.pressed;
        if (p && !this.padPrev[i]) this.queue.push(action);
        this.padPrev[i] = p;
      }
      // Start also starts the game from the title screen.
      if (pad.buttons[9]?.pressed && !this.padPrev[99]) this.queue.push("start");
      this.padPrev[99] = !!pad.buttons[9]?.pressed;
      break;
    }

    a.throttle = throttle;
    a.brake = brake;
    a.steer = Math.max(-1, Math.min(1, steer));
    a.handbrake = handbrake;
    a.boost = boost;
    a.lookX = lookX;
    a.lookY = lookY;
  }
}
