"use client";

/**
 * Every sound on the site is synthesised with Web Audio. No files.
 * One master gain, one toggle, off by default. The AudioContext is only
 * created after a user gesture.
 */

import { soundOn } from "./store";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let lastClick = 0;
let gestureSeen = false;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function context() {
  if (typeof window === "undefined" || !gestureSeen) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function ready() {
  if (!soundOn.get()) return null;
  const c = context();
  return c && master && noise ? c : null;
}

/** Call from any user gesture. Toggling sound is itself a gesture. */
export function markGesture() {
  gestureSeen = true;
}

export function setSound(on: boolean) {
  markGesture();
  soundOn.set(on);
  if (on) context();
  else servoStop();
  try {
    sessionStorage.setItem("aa-sound", on ? "1" : "0");
  } catch {
    /* storage blocked */
  }
}

export function restoreSoundPreference() {
  try {
    if (sessionStorage.getItem("aa-sound") === "1") soundOn.set(true);
  } catch {
    /* storage blocked */
  }
}

function envelope(c: AudioContext, peak: number, attack: number, release: number) {
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

/** Drum landing: a short noise burst through a bandpass. */
export function playClick() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  if (t - lastClick < 0.014) return;
  lastClick = t;

  const src = c.createBufferSource();
  src.buffer = noise;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1700 + Math.random() * 1500;
  band.Q.value = 2.6;
  const g = envelope(c, 0.55, 0.002, 0.032);
  src.connect(band).connect(g).connect(master!);
  src.start(t, Math.random() * 0.8, 0.05);
}

/** Knob: a low pitched thump with a little body noise. */
export function playThunk() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
  const g = envelope(c, 0.8, 0.004, 0.2);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.25);

  const src = c.createBufferSource();
  src.buffer = noise;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 520;
  const ng = envelope(c, 0.35, 0.002, 0.07);
  src.connect(low).connect(ng).connect(master!);
  src.start(t, 0, 0.1);
}

/** Card eject: a filtered noise sweep. */
export function playWhoosh() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.4;
  band.frequency.setValueAtTime(2600, t);
  band.frequency.exponentialRampToValueAtTime(380, t + 0.32);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
  src.connect(band).connect(g).connect(master!);
  src.start(t, Math.random() * 0.5, 0.4);
}

/** Sticker pick-up. */
export function playPop() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(620, t);
  osc.frequency.exponentialRampToValueAtTime(190, t + 0.09);
  const g = envelope(c, 0.5, 0.003, 0.1);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.14);
}

/** Lock switch snap: a short bright tick. */
export function playSwitch() {
  const c = ready();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.03);
  const g = envelope(c, 0.18, 0.001, 0.04);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.06);
  playClick();
}

/* ── Servo whirr for the Unmask spotlight ────────────────────
   One persistent voice whose pitch and level follow the radius. */

let servo: { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;

export function servoUpdate(level: number) {
  const c = ready();
  if (!c) return;
  if (!servo) {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 6;
    const gain = c.createGain();
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(master!);
    osc.start();
    servo = { osc, filter, gain };
  }
  const t = c.currentTime;
  const k = Math.max(0, Math.min(1, level));
  servo.osc.frequency.setTargetAtTime(70 + 160 * k, t, 0.08);
  servo.filter.frequency.setTargetAtTime(300 + 1400 * k, t, 0.08);
  servo.gain.gain.setTargetAtTime(k > 0.02 ? 0.035 + 0.05 * k : 0, t, 0.12);
}

export function servoStop() {
  if (!servo || !ctx) return;
  servo.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}
