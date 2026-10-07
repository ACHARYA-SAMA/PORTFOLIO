/**
 * Odometer drum engine.
 *
 * Each drum is drawn as a PROJECTED cylinder rather than a CSS 3D one:
 * large-radius preserve-3d cylinders tear into slices in Chrome. Six face
 * elements per drum are re-projected every frame. A face at offset `o`
 * from the drum's float position sits at angle a = (o − frac) · 34°,
 * translated by R·sin(a) and squashed by cos(a), with R = h / (2·sin 17°)
 * so neighbouring faces meet exactly at their chord.
 *
 * Plain requestAnimationFrame, one loop shared by every bank on the page,
 * running only while something moves. Time always comes from
 * performance.now(), never from the rAF timestamp.
 */

export const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:/+!?-&'";
export const DIGITS = "0123456789";

export const FACE_OFFSETS = [-2, -1, 0, 1, 2, 3] as const;

const STEP = (34 * Math.PI) / 180;
const HALF_PI = Math.PI / 2;
/** Cylinder radius expressed in face heights. */
const RADIUS = 1 / (2 * Math.sin((17 * Math.PI) / 180));
const BACK_C = 1.35;
/** Longest overshoot allowed, in character steps. Keeps long spins mechanical. */
const MAX_OVERSHOOT = 0.42;
const FLICK_RISE = 0.12;
const FLICK_LIFE = 0.95;

export type RollOrder = "ltr" | "rtl" | "center" | "random";

export type RollOptions = {
  /** Full extra rotations, per bank or per drum index. */
  extraTurns?: number | ((index: number) => number);
  order?: RollOrder;
  /** Milliseconds between drums. */
  stagger?: number;
  /** Milliseconds before the first drum moves. */
  delay?: number;
  /** Seconds, or a function of distance (in characters). */
  duration?: number | ((distance: number) => number);
};

type Tween = {
  from: number;
  to: number;
  start: number;
  duration: number;
  c: number;
  landed: boolean;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const backOut = (t: number, c: number) => {
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/** Peak overshoot of back-out, as a fraction of the travelled distance. */
const overshootOf = (c: number) => (4 * c * c * c) / (27 * (c + 1) * (c + 1));

/** Back-out constant for a distance: 1.35, softened so a long spin never overshoots by more than MAX_OVERSHOOT. */
function backConstantFor(distance: number) {
  if (distance * overshootOf(BACK_C) <= MAX_OVERSHOOT) return BACK_C;
  const target = MAX_OVERSHOOT / distance;
  let lo = 0;
  let hi = BACK_C;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (overshootOf(mid) > target) hi = mid;
    else lo = mid;
  }
  return lo;
}

const defaultDuration = (distance: number) => Math.min(0.6 + 0.022 * distance, 2.2);

/** Small rise then a damped spring back, in character steps. */
function flickOffset(t: number) {
  if (t < FLICK_RISE) {
    const k = t / FLICK_RISE;
    return 0.3 * (1 - (1 - k) * (1 - k) * (1 - k));
  }
  const tau = t - FLICK_RISE;
  return 0.3 * Math.exp(-7 * tau) * Math.cos(11 * tau);
}

/** Centre text across `count` drums, padding with spaces. */
export function padText(text: string, count: number) {
  const clean = text.toUpperCase().slice(0, count);
  const left = Math.floor((count - clean.length) / 2);
  return (" ".repeat(left) + clean).padEnd(count, " ");
}

/** Transform for a resting face, shared by SSR markup and the engine. */
export function faceTransform(offset: number, frac = 0) {
  const a = (offset - frac) * STEP;
  if (Math.abs(a) >= HALF_PI) return null;
  return `translate3d(0,${(RADIUS * Math.sin(a) * 100).toFixed(3)}%,0) scaleY(${Math.cos(a).toFixed(4)})`;
}

export function charAt(charset: string, index: number) {
  return charset[mod(index, charset.length)];
}

class Drum {
  pos = 0;
  tween: Tween | null = null;
  flickStart = -1;
  private base = Number.NaN;
  private frac = Number.NaN;

  constructor(
    readonly faces: HTMLElement[],
    public charset: string,
  ) {}

  get index() {
    return mod(Math.round(this.pos), this.charset.length);
  }

  get char() {
    return this.charset[this.index];
  }

  invalidate() {
    this.base = Number.NaN;
    this.frac = Number.NaN;
  }

  render(now: number) {
    let p = this.pos;
    if (this.flickStart >= 0) {
      const t = (now - this.flickStart) / 1000;
      if (t >= FLICK_LIFE) this.flickStart = -1;
      else p += flickOffset(t);
    }

    const whole = Math.floor(p);
    const frac = p - whole;

    if (whole !== this.base) {
      this.base = whole;
      for (let k = 0; k < this.faces.length; k++) {
        this.faces[k].textContent = charAt(this.charset, whole + FACE_OFFSETS[k]);
      }
    }

    if (frac === this.frac) return;
    this.frac = frac;

    for (let k = 0; k < this.faces.length; k++) {
      const style = this.faces[k].style;
      const transform = faceTransform(FACE_OFFSETS[k], frac);
      if (transform === null) {
        style.opacity = "0";
      } else {
        style.opacity = "1";
        style.transform = transform;
      }
    }
  }
}

/* ── Shared loop ─────────────────────────────────────────── */

const active = new Set<DrumBank>();
let frame = 0;

function loop() {
  frame = 0;
  const now = performance.now();
  active.forEach((bank) => {
    if (!bank.tick(now)) {
      active.delete(bank);
      bank.settle();
    }
  });
  if (active.size > 0) frame = requestAnimationFrame(loop);
}

function wake(bank: DrumBank) {
  if (!active.has(bank)) {
    active.add(bank);
    bank.root.classList.add("is-rolling");
  }
  if (!frame) frame = requestAnimationFrame(loop);
}

export type DrumBankOptions = {
  charset?: string;
  /** Called once per drum when it reaches its target (used for the click sound). */
  onLand?: () => void;
};

export class DrumBank {
  readonly drums: Drum[];
  visible = true;
  reduced = false;
  private waiters: Array<() => void> = [];

  constructor(
    readonly root: HTMLElement,
    private options: DrumBankOptions = {},
  ) {
    const charset = options.charset ?? CHARSET;
    this.drums = Array.from(root.querySelectorAll<HTMLElement>("[data-drum]")).map((cell) => {
      const faces = Array.from(cell.querySelectorAll<HTMLElement>("[data-face]"));
      const drum = new Drum(faces, charset);
      const centre = faces[FACE_OFFSETS.indexOf(0)]?.textContent ?? " ";
      drum.pos = Math.max(0, charset.indexOf(centre));
      return drum;
    });
  }

  get text() {
    return this.drums.map((d) => d.char).join("");
  }

  set onLand(fn: (() => void) | undefined) {
    this.options.onLand = fn;
  }

  /** Jump straight to a word, no motion. */
  set(text: string) {
    const padded = padText(text, this.drums.length);
    const now = performance.now();
    this.drums.forEach((drum, i) => {
      drum.tween = null;
      drum.pos = Math.max(0, drum.charset.indexOf(padded[i]));
      drum.render(now);
    });
    this.resolveWaiters();
  }

  /** Every drum to a random character, instantly. */
  scramble() {
    const now = performance.now();
    this.drums.forEach((drum) => {
      drum.tween = null;
      drum.pos = Math.floor(Math.random() * drum.charset.length);
      drum.render(now);
    });
  }

  /** Swap the character wheel while keeping what each drum currently shows. */
  setCharset(charset: string) {
    const now = performance.now();
    this.drums.forEach((drum) => {
      const ch = drum.char;
      drum.tween = null;
      drum.charset = charset;
      drum.pos = Math.max(0, charset.indexOf(ch));
      drum.invalidate();
      drum.render(now);
    });
  }

  roll(text: string, options: RollOptions = {}): Promise<void> {
    if (this.reduced) {
      this.set(text);
      return Promise.resolve();
    }

    const padded = padText(text, this.drums.length);
    const now = performance.now();
    const ranks = rankOrder(this.drums.length, options.order ?? "ltr");
    const stagger = options.stagger ?? 75;
    const delay = options.delay ?? 0;
    let moving = false;

    this.drums.forEach((drum, i) => {
      const n = drum.charset.length;
      const target = Math.max(0, drum.charset.indexOf(padded[i]));
      const extra =
        typeof options.extraTurns === "function" ? options.extraTurns(i) : (options.extraTurns ?? 0);

      // Always forward: next integer position at or past the current one that shows `target`.
      const from = drum.pos;
      const base = Math.ceil(from - 0.001);
      const to = base + mod(target - base, n) + Math.max(0, Math.round(extra)) * n;
      const distance = to - from;
      if (distance < 0.001) return;

      const duration =
        typeof options.duration === "function"
          ? options.duration(distance)
          : (options.duration ?? defaultDuration(distance));

      drum.tween = {
        from,
        to,
        start: now + delay + ranks[i] * stagger,
        duration: Math.max(0.05, duration) * 1000,
        c: backConstantFor(distance),
        landed: false,
      };
      moving = true;
    });

    if (!moving) return Promise.resolve();

    const done = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (this.visible) wake(this);
    else this.finishInstantly();
    return done;
  }

  flick(index: number) {
    if (this.reduced) return;
    const drum = this.drums[index];
    if (!drum || drum.tween) return;
    drum.flickStart = performance.now();
    wake(this);
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible && active.has(this)) this.finishInstantly();
    if (visible) {
      const now = performance.now();
      this.drums.forEach((d) => {
        d.invalidate();
        d.render(now);
      });
    }
  }

  /** Advance one frame. Returns false once nothing is moving. */
  tick(now: number) {
    if (!this.visible) {
      this.finishInstantly();
      return false;
    }

    let busy = false;
    for (const drum of this.drums) {
      const tw = drum.tween;
      if (tw) {
        const t = (now - tw.start) / tw.duration;
        if (t >= 1) {
          drum.pos = mod(tw.to, drum.charset.length);
          drum.tween = null;
          if (!tw.landed) this.options.onLand?.();
        } else if (t > 0) {
          drum.pos = tw.from + (tw.to - tw.from) * backOut(t, tw.c);
          if (!tw.landed && drum.pos >= tw.to - 0.02) {
            tw.landed = true;
            this.options.onLand?.();
          }
          busy = true;
        } else {
          busy = true;
        }
      }
      if (drum.flickStart >= 0) busy = true;
      drum.render(now);
    }
    return busy;
  }

  settle() {
    this.root.classList.remove("is-rolling");
    this.resolveWaiters();
  }

  destroy() {
    active.delete(this);
    this.resolveWaiters();
  }

  private finishInstantly() {
    const now = performance.now();
    this.drums.forEach((drum) => {
      if (drum.tween) {
        drum.pos = mod(drum.tween.to, drum.charset.length);
        drum.tween = null;
      }
      drum.flickStart = -1;
      drum.render(now);
    });
    active.delete(this);
    this.settle();
  }

  private resolveWaiters() {
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((w) => w());
  }
}

function rankOrder(count: number, order: RollOrder) {
  const ranks = Array.from({ length: count }, (_, i) => i);
  switch (order) {
    case "rtl":
      return ranks.map((i) => count - 1 - i);
    case "center": {
      const mid = (count - 1) / 2;
      return ranks.map((i) => Math.round(Math.abs(i - mid)));
    }
    case "random": {
      const shuffled = [...ranks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    default:
      return ranks;
  }
}
