import type { MaterialId } from "./destruction";

/**
 * Every sound in the world is synthesised: oscillators, filtered noise and
 * envelopes. No samples, no music. The context is created on the first user
 * gesture; one master gain feeds a compressor so a pile-up never clips, and
 * heavy hits briefly duck the ambient bed.
 */

type Voice = { stop: number };

export type Sfx = "chime" | "tick" | "boost" | "horn" | "bolt" | "achievement" | "gate" | "click" | "door" | "land" | "thud" | "error";

export class WorldAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private ambientBus!: GainNode;
  private noise!: AudioBuffer;
  private engine: { a: OscillatorNode; b: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private squeal: { filter: BiquadFilterNode; gain: GainNode } | null = null;
  private wind: { filter: BiquadFilterNode; gain: GainNode } | null = null;
  private pad: { oscs: OscillatorNode[]; filter: BiquadFilterNode; gain: GainNode; chord: number; next: number } | null = null;
  private voices: Voice[] = [];
  enabled = false;

  /** Create the context. Must run inside a user gesture. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 1;
    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = 1;
    this.sfx.connect(comp);
    this.ambientBus.connect(comp);
    comp.connect(this.master);
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.buildLoops();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.08);
  }

  private loopNoise() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start();
    return src;
  }

  private buildLoops() {
    const ctx = this.ctx!;
    // Engine: saw + square an octave down, through a low-pass that opens with throttle.
    const a = ctx.createOscillator();
    a.type = "sawtooth";
    const b = ctx.createOscillator();
    b.type = "square";
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    a.connect(filter);
    b.connect(filter);
    filter.connect(gain).connect(this.sfx);
    a.start();
    b.start();
    this.engine = { a, b, filter, gain };

    // Tyre squeal: narrow band-passed noise.
    const sq = ctx.createBiquadFilter();
    sq.type = "bandpass";
    sq.frequency.value = 2100;
    sq.Q.value = 9;
    const sqg = ctx.createGain();
    sqg.gain.value = 0;
    this.loopNoise().connect(sq).connect(sqg).connect(this.sfx);
    this.squeal = { filter: sq, gain: sqg };

    // Wind at speed.
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 500;
    const wg = ctx.createGain();
    wg.gain.value = 0;
    this.loopNoise().connect(wf).connect(wg).connect(this.sfx);
    this.wind = { filter: wf, gain: wg };

    // Ambient bed: detuned saws, slow filter sweep, chords that drift every ~12 s.
    const pf = ctx.createBiquadFilter();
    pf.type = "lowpass";
    pf.frequency.value = 520;
    pf.Q.value = 0.7;
    const pg = ctx.createGain();
    pg.gain.value = 0.028;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(pf.frequency);
    lfo.start();
    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.detune.value = (i - 1.5) * 7;
      o.connect(pf);
      o.start();
      oscs.push(o);
    }
    pf.connect(pg).connect(this.ambientBus);
    this.pad = { oscs, filter: pf, gain: pg, chord: 0, next: 0 };
    this.setChord(0);
  }

  private static CHORDS = [
    [110, 164.81, 220, 261.63],
    [98, 146.83, 196, 246.94],
    [87.31, 130.81, 174.61, 220],
    [103.83, 155.56, 207.65, 246.94],
  ];

  private setChord(i: number) {
    if (!this.ctx || !this.pad) return;
    const t = this.ctx.currentTime;
    const chord = WorldAudio.CHORDS[i % WorldAudio.CHORDS.length];
    this.pad.oscs.forEach((o, k) => o.frequency.setTargetAtTime(chord[k], t, 2.5));
    this.pad.chord = i;
  }

  /** Continuous sounds, once per frame. speed in m/s. */
  update(speed: number, throttle: number, slip: number, boosting: boolean, grounded: boolean, time: number) {
    const ctx = this.ctx;
    if (!ctx || !this.enabled || !this.engine || !this.squeal || !this.wind || !this.pad) return;
    const t = ctx.currentTime;
    const s = Math.abs(speed);
    // Fake gears: pitch climbs, then drops back a little every ~9 m/s.
    const gear = (s % 9) / 9;
    const f = 34 + s * 1.9 + gear * 22 + throttle * 14 + (boosting ? 18 : 0);
    this.engine.a.frequency.setTargetAtTime(f, t, 0.05);
    this.engine.b.frequency.setTargetAtTime(f * 0.5 + 0.6, t, 0.05);
    this.engine.filter.frequency.setTargetAtTime(260 + throttle * 1300 + s * 22 + (boosting ? 900 : 0), t, 0.06);
    this.engine.gain.gain.setTargetAtTime(0.045 + throttle * 0.05 + Math.min(s / 40, 1) * 0.03, t, 0.08);
    const squeal = grounded ? Math.min(1, Math.max(0, (Math.abs(slip) - 3.5) / 8)) : 0;
    this.squeal.gain.gain.setTargetAtTime(squeal * 0.09, t, 0.05);
    this.squeal.filter.frequency.setTargetAtTime(1800 + squeal * 700, t, 0.1);
    const w = Math.min(1, s / 40);
    this.wind.gain.gain.setTargetAtTime(w * w * 0.12, t, 0.2);
    this.wind.filter.frequency.setTargetAtTime(300 + w * 1600, t, 0.2);
    if (time > this.pad.next) {
      this.pad.next = time + 12;
      this.setChord(this.pad.chord + 1);
    }
    // Forget finished voices in place (no new array per frame).
    let kept = 0;
    for (let i = 0; i < this.voices.length; i++) if (this.voices[i].stop > t) this.voices[kept++] = this.voices[i];
    this.voices.length = kept;
  }

  /** Quieten the engine loops (title screen, panels). */
  idle() {
    if (!this.ctx || !this.engine || !this.squeal || !this.wind) return;
    const t = this.ctx.currentTime;
    this.engine.gain.gain.setTargetAtTime(0.02, t, 0.2);
    this.squeal.gain.gain.setTargetAtTime(0, t, 0.1);
    this.wind.gain.gain.setTargetAtTime(0, t, 0.3);
  }

  private duck(amount: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.ambientBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(Math.max(0.25, 1 - amount), t + 0.03);
    g.setTargetAtTime(1, t + 0.15, 0.4);
  }

  private canPlay() {
    if (!this.ctx || !this.enabled) return false;
    if (this.voices.length > 18) return false;
    return true;
  }

  private env(peak: number, attack: number, decay: number, at = 0) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    this.voices.push({ stop: t + attack + decay });
    return { g, t, end: t + attack + decay + 0.05 };
  }

  private noiseHit(type: BiquadFilterType, freq: number, q: number, peak: number, decay: number, at = 0, sweepTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const { g, t, end } = this.env(peak, 0.004, decay, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + decay);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 1.5);
    src.stop(end);
  }

  private tone(type: OscillatorType, freq: number, peak: number, decay: number, at = 0, glideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    const { g, t, end } = this.env(peak, 0.005, decay, at);
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(end);
  }

  /** Material-specific break, scaled by impulse (0..1). */
  breakSound(material: MaterialId, intensity: number) {
    if (!this.canPlay()) return;
    const k = Math.min(1, Math.max(0.15, intensity));
    const r = 0.9 + Math.random() * 0.2;
    switch (material) {
      case "wood":
        this.noiseHit("bandpass", 1700 * r, 1.4, 0.5 * k, 0.12);
        this.tone("square", 210 * r, 0.12 * k, 0.05, 0, 90);
        this.noiseHit("lowpass", 400, 0.7, 0.3 * k, 0.18, 0.01);
        break;
      case "brick":
      case "concrete":
        this.noiseHit("lowpass", 650 * r, 0.8, 0.6 * k, 0.26);
        this.tone("sine", 72 * r, 0.5 * k, 0.22, 0, 45);
        this.duck(0.4 * k);
        break;
      case "glass":
        this.noiseHit("highpass", 3200 * r, 0.8, 0.35 * k, 0.32);
        for (let i = 0; i < 5; i++) this.tone("sine", 2600 + Math.random() * 3600, 0.06 * k, 0.25 + Math.random() * 0.5, i * 0.025);
        break;
      case "metal": {
        const f0 = 170 + Math.random() * 150;
        [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone("sine", f0 * m, (0.22 / (i + 1)) * k, 0.9 - i * 0.15));
        this.noiseHit("bandpass", 2400, 2, 0.12 * k, 0.05);
        this.duck(0.25 * k);
        break;
      }
      case "foliage":
        this.noiseHit("bandpass", 3600 * r, 0.6, 0.16 * k, 0.28);
        break;
      case "paper":
        this.noiseHit("bandpass", 2600 * r, 1.2, 0.1 * k, 0.16);
        this.noiseHit("bandpass", 2200 * r, 1.2, 0.08 * k, 0.12, 0.07);
        break;
    }
  }

  /** Car into something solid. */
  crash(intensity: number) {
    if (!this.canPlay()) return;
    const k = Math.min(1, intensity);
    this.noiseHit("lowpass", 900, 0.8, 0.45 * k, 0.2);
    this.tone("sine", 60, 0.45 * k, 0.18, 0, 38);
    this.duck(0.5 * k);
  }

  play(s: Sfx) {
    if (!this.canPlay()) return;
    switch (s) {
      case "chime":
        this.tone("sine", 880, 0.12, 0.5);
        this.tone("sine", 1318.5, 0.1, 0.7, 0.09);
        break;
      case "tick":
        this.tone("sine", 1800, 0.05, 0.03);
        break;
      case "click":
        this.tone("square", 1200, 0.04, 0.02);
        break;
      case "boost":
        this.noiseHit("bandpass", 380, 1.4, 0.3, 0.5, 0, 2600);
        break;
      case "horn":
        this.tone("square", 392, 0.08, 0.32);
        this.tone("square", 494, 0.07, 0.32);
        break;
      case "bolt":
        this.tone("sine", 1200, 0.1, 0.12, 0, 1800);
        this.tone("sine", 2400, 0.04, 0.1, 0.05);
        break;
      case "achievement":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone("triangle", f, 0.1, 0.4, i * 0.07));
        break;
      case "gate":
        this.tone("sine", 660, 0.1, 0.18);
        this.tone("sine", 990, 0.09, 0.25, 0.08);
        break;
      case "door":
        for (let i = 0; i < 10; i++) this.noiseHit("bandpass", 800 + i * 40, 3, 0.05, 0.06, i * 0.06);
        break;
      case "land":
        this.tone("sine", 80, 0.35, 0.16, 0, 45);
        this.noiseHit("lowpass", 500, 0.8, 0.2, 0.12);
        break;
      case "thud":
        this.tone("sine", 95, 0.25, 0.12, 0, 60);
        break;
      case "error":
        this.tone("square", 220, 0.06, 0.18, 0, 160);
        break;
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.engine = null;
    this.squeal = null;
    this.wind = null;
    this.pad = null;
  }
}
