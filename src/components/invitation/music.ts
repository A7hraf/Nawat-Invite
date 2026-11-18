/**
 * Background music for invitations.
 *  - "builtin:<preset>" → a gentle melody generated with the Web Audio API (no files, no licence issues)
 *  - "file:<url>"       → an uploaded/licensed track, looped
 * Playback must start from a user gesture (the opening tap).
 */
export type MusicSource = { kind: "builtin"; preset: string } | { kind: "file"; url: string } | null;

type Preset = { scale: number[]; melody: number[]; bpm: number; drone: number[]; wave: OscillatorType; decay: number; vol: number };

const D = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25, 587.33, 622.25, 739.99]; // D Hijaz
const N = [293.66, 329.63, 349.23, 392.0, 440.0, 466.16, 554.37, 587.33, 659.25, 698.46]; // D Nahawand-ish
const PRESETS: Record<string, Preset> = {
  "hijaz-qanun": { scale: D, bpm: 76, drone: [73.42, 110, 146.83], wave: "triangle", decay: 1.9, vol: 0.14,
    melody: [4, -1, 3, 2, -1, 1, 2, -1, 0, -1, -1, -1, -1, -1, 2, 3, 4, -1, 5, 4, 3, -1, 2, -1, 1, 2, 1, 0, -1, -1, -1, -1, 7, -1, 6, 5, -1, 4, 5, -1, 4, -1, 3, 2, -1, 1, 2, -1, 3, -1, 2, 1, -1, 0, 1, 2, 0, -1, -1, -1, -1, -1, -1, -1] },
  "nahawand-harp": { scale: N, bpm: 66, drone: [73.42, 110], wave: "sine", decay: 2.6, vol: 0.16,
    melody: [0, 2, 4, 7, 4, 2, -1, -1, 1, 3, 5, 8, 5, 3, -1, -1, 2, 4, 6, 9, 6, 4, -1, -1, 4, 3, 2, 1, 0, -1, -1, -1] },
  "royal-strings": { scale: N, bpm: 58, drone: [73.42, 110, 146.83, 220], wave: "sawtooth", decay: 3.2, vol: 0.05,
    melody: [7, -1, -1, 6, 5, -1, 4, -1, 5, -1, -1, 4, 3, -1, 2, -1, 4, -1, -1, 3, 2, -1, 1, -1, 0, -1, -1, -1, -1, -1, -1, -1] },
};

export class InvitationMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private dry: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private audio: HTMLAudioElement | null = null;
  private step = 0;
  private next = 0;
  on = false;

  constructor(private source: MusicSource) {}

  start() {
    if (!this.source) return;
    if (this.source.kind === "file") {
      this.audio ??= Object.assign(new Audio(this.source.url), { loop: true, volume: 0.6 });
      this.audio.play().then(() => { this.on = true; }).catch(() => { this.on = false; });
      return;
    }
    if (this.ctx) { this.set(true); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const preset = PRESETS[this.source.preset] ?? PRESETS["hijaz-qanun"]!;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    const rev = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.55; rev.connect(wet); wet.connect(master);
    const dry = (this.dry = ctx.createGain()); dry.gain.value = 0.7; dry.connect(master); dry.connect(rev);
    const delay = ctx.createDelay(); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    dry.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(rev);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520; lp.connect(master); lp.connect(rev);
    preset.drone.forEach((f, k) => {
      const o = ctx.createOscillator(); o.type = k === 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (k - 1) * 4;
      const g = ctx.createGain(); g.gain.value = k >= 2 ? 0.016 : 0.038; o.connect(g); g.connect(lp); o.start();
      const l = ctx.createOscillator(); l.frequency.value = 0.07 + k * 0.03; const lg = ctx.createGain(); lg.gain.value = 0.01; l.connect(lg); lg.connect(g.gain); l.start();
    });
    this.next = ctx.currentTime + 0.4;
    this.timer = setInterval(() => this.schedule(preset), 90);
    this.set(true);
  }

  private schedule(p: Preset) {
    const ctx = this.ctx!;
    const spb = 60 / p.bpm / 2;
    while (this.next < ctx.currentTime + 0.35) {
      const n = p.melody[this.step % p.melody.length]!;
      if (n >= 0) this.pluck(p, p.scale[n]!, this.next, p.vol);
      if (this.step % 16 === 0) this.pluck(p, 146.83, this.next, p.vol * 0.55);
      this.step++; this.next += spb;
    }
  }

  private pluck(p: Preset, f: number, at: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain(), flt = ctx.createBiquadFilter();
    o.type = p.wave; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.003; g2.gain.value = 0.35;
    flt.type = "lowpass"; flt.frequency.setValueAtTime(p.wave === "sawtooth" ? 1400 : 3200, at); flt.frequency.exponentialRampToValueAtTime(700, at + 1.2);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(flt); flt.connect(this.dry!);
    const attack = p.wave === "sawtooth" ? 0.35 : 0.006;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + p.decay);
    o.start(at); o2.start(at); o.stop(at + p.decay + 0.1); o2.stop(at + p.decay + 0.1);
  }

  set(on: boolean) {
    this.on = on;
    if (this.audio) { if (on) void this.audio.play().catch(() => undefined); else this.audio.pause(); return; }
    if (!this.ctx || !this.master) return;
    if (on && this.ctx.state === "suspended") void this.ctx.resume();
    const g = this.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, on ? 0.8 : 0.25);
  }

  toggle() { if (!this.ctx && !this.audio) this.start(); else this.set(!this.on); return this.on; }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    void this.ctx?.close();
    this.audio?.pause();
    this.ctx = null; this.audio = null;
  }
}
