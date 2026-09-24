// Generative ambient score + diegetic sound, all synthesized in WebAudio:
// a sparse wooden flute over wind, crickets at night, the fire crackling near
// the hearth, footsteps, sips. No samples — everything is oscillators & noise.

import { clamp, lerp } from './util.js';
import { FIRE_POS } from './layout.js';

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];   // A minor pentatonic, 2 octaves
const BASE = 220;

export class AudioEngine {
  constructor() {
    this.started = false;
    this.muted = false;
    this.night = 0;
    this._stepSide = 1;
  }

  init() {
    if (this.started) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    this.master.connect(comp);
    comp.connect(ctx.destination);

    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.5;
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.8;
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9;
    this.musicBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.sfxBus.connect(this.master);

    // reverb
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(2.6, 2.8);
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.5;
    this.verb.connect(this.verbGain);
    this.verbGain.connect(this.musicBus);

    this.noise = this._noiseBuffer(2);
    this.started = true;

    this._wind();
    this._crickets();
    this._fluteLoop();
    this._fire();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (!this.muted) this.ctx.resume();
    });
  }

  _impulse(sec, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _noiseBuffer(sec) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _noiseSrc() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    return s;
  }

  // ---------------- ambience ----------------
  // Pink-ish noise (Voss/Kellet filter) long enough that the loop never
  // announces itself; the old 2 s white-noise loop gave the wind a hiss and
  // a repeating 'whoosh'.
  _pinkBuffer(sec) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * sec);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      // cross-fade the ends so the loop seam is inaudible
      const fade = Math.floor(rate * 0.5);
      for (let i = 0; i < fade; i++) {
        const a = i / fade;
        d[i] = d[i] * a + d[len - fade + i] * (1 - a);
      }
    }
    return buf;
  }

  // Wind: a soft low body plus a faint airy layer, each with its own slow,
  // smoothly wandering gust envelope that also opens the filter (gusts get
  // brighter as well as louder), drifting gently across the stereo field.
  _wind() {
    const c = this.ctx;
    const pink = this._pinkBuffer(11.3);
    this.windGain = c.createGain();
    this.windGain.gain.value = 0;
    this.windGain.gain.setTargetAtTime(1, c.currentTime, 3);    // fade in on entry
    this.windGain.connect(this.ambBus);
    const layer = (type, f0, q, level, rateHz) => {
      const src = c.createBufferSource();
      src.buffer = pink; src.loop = true;
      src.playbackRate.value = rateHz;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = f0; f.Q.value = q;
      const g = c.createGain(); g.gain.value = level * 0.5;
      const pan = c.createStereoPanner();
      src.connect(f); f.connect(g); g.connect(pan); pan.connect(this.windGain);
      src.start(0, Math.random() * 10);
      return { f, g, pan, f0, level };
    };
    const layers = [
      layer('lowpass', 380, 0.5, 0.20, 1.0),
      layer('bandpass', 950, 0.7, 0.045, 0.83),
    ];
    const gust = () => {
      if (!this.ctx) return;
      if (c.state !== 'running') { setTimeout(gust, 3000); return; }
      const t = c.currentTime;
      // mostly calm with occasional stronger gusts
      const strength = Math.random() < 0.22 ? 0.75 + Math.random() * 0.25 : 0.2 + Math.random() * 0.35;
      const tc = strength > 0.7 ? 1.4 : 2.6;
      for (const L of layers) {
        L.g.gain.setTargetAtTime(L.level * (0.25 + strength), t, tc);
        L.f.frequency.setTargetAtTime(L.f0 * (0.7 + strength * 0.8), t, tc * 1.2);
        L.pan.pan.setTargetAtTime((Math.random() - 0.5) * 0.7, t, 4);
      }
      setTimeout(gust, 2500 + Math.random() * 6000);
    };
    gust();
  }

  _crickets() {
    const c = this.ctx;
    this.cricketBus = c.createGain();
    this.cricketBus.gain.value = 0.0;
    this.cricketBus.connect(this.ambBus);
    for (const pan of [-0.55, 0.1, 0.6]) {
      const p = c.createStereoPanner(); p.pan.value = pan;
      p.connect(this.cricketBus);
      const chirp = () => {
        if (!this.ctx) return;
        if (c.state !== 'running') { setTimeout(chirp, 2000); return; }
        const t0 = c.currentTime + 0.05;
        const f = 4100 + Math.random() * 500;
        const pulses = 4 + Math.floor(Math.random() * 3);
        const osc = c.createOscillator(); osc.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0;
        osc.connect(g); g.connect(p);
        for (let i = 0; i < pulses; i++) {
          const t = t0 + i * 0.052;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.028, t + 0.008);
          g.gain.linearRampToValueAtTime(0, t + 0.026);
        }
        osc.start(t0); osc.stop(t0 + pulses * 0.052 + 0.05);
        setTimeout(chirp, 500 + Math.random() * 2400);
      };
      setTimeout(chirp, Math.random() * 1500);
    }
  }

  // ---------------- the flute ----------------
  _fluteNote(t, dur, freq, vel = 1) {
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 0;
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
    const osc2 = c.createOscillator(); osc2.type = 'triangle'; osc2.frequency.setValueAtTime(freq, t); osc2.detune.value = 4;
    const g2 = c.createGain(); g2.gain.value = 0.18;
    const vib = c.createOscillator(); vib.frequency.value = 5.1;
    const vibG = c.createGain(); vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(7, t + Math.min(0.6, dur * 0.5));
    vib.connect(vibG); vibG.connect(osc.detune); vibG.connect(osc2.detune);
    const breath = this._noiseSrc();
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 1.4;
    const bg = c.createGain(); bg.gain.value = 0.05;
    breath.connect(bp); bp.connect(bg); bg.connect(out);
    osc.connect(out); osc2.connect(g2); g2.connect(out);
    const lvl = 0.15 * vel;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(lvl, t + 0.09);
    out.gain.setTargetAtTime(lvl * 0.82, t + 0.12, dur * 0.4);
    out.gain.setTargetAtTime(0, t + dur, 0.12);
    out.connect(this.fluteOut);
    for (const n of [osc, osc2, vib, breath]) { n.start(t); n.stop(t + dur + 0.8); }
  }

  _drumHits(t, n) {
    const c = this.ctx;
    for (let i = 0; i < n; i++) {
      const th = t + i * (0.42 + (i % 2) * 0.22);
      const osc = c.createOscillator();
      osc.frequency.setValueAtTime(92, th);
      osc.frequency.exponentialRampToValueAtTime(50, th + 0.17);
      const g = c.createGain();
      g.gain.setValueAtTime(0.26, th);
      g.gain.exponentialRampToValueAtTime(0.001, th + 0.5);
      osc.connect(g); g.connect(this.musicBus); g.connect(this.verb);
      osc.start(th); osc.stop(th + 0.6);
      const tap = this._noiseSrc();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      const tg = c.createGain();
      tg.gain.setValueAtTime(0.07, th);
      tg.gain.exponentialRampToValueAtTime(0.001, th + 0.05);
      tap.connect(lp); lp.connect(tg); tg.connect(this.musicBus);
      tap.start(th); tap.stop(th + 0.08);
    }
  }

  _fluteLoop() {
    const c = this.ctx;
    this.fluteOut = c.createGain(); this.fluteOut.gain.value = 1;
    const delay = c.createDelay(1.0); delay.delayTime.value = 0.42;
    const fb = c.createGain(); fb.gain.value = 0.26;
    const wet = c.createGain(); wet.gain.value = 0.24;
    this.fluteOut.connect(this.musicBus);
    this.fluteOut.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(this.musicBus);
    this.fluteOut.connect(this.verb);

    let idx = 3 + Math.floor(Math.random() * 3);
    const phrase = () => {
      if (!this.ctx) return;
      if (c.state !== 'running') { setTimeout(phrase, 4000); return; }
      let t = c.currentTime + 0.1;
      const notes = 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < notes; i++) {
        idx += Math.random() < 0.72
          ? (Math.random() < 0.5 ? -1 : 1)
          : (Math.random() < 0.5 ? -2 : 2) * (Math.random() < 0.3 ? 2 : 1);
        idx = clamp(idx, 0, SCALE.length - 1);
        const freq = BASE * Math.pow(2, SCALE[idx] / 12);
        const dur = [0.55, 0.7, 0.95, 1.35, 1.9][Math.floor(Math.random() * 5)] *
          (i === notes - 1 ? 1.5 : 1);
        this._fluteNote(t, dur, freq, 0.85 + Math.random() * 0.3);
        t += dur * (0.92 + Math.random() * 0.14);
      }
      if (Math.random() < 0.3) this._drumHits(t + 1 + Math.random() * 2, 2 + Math.floor(Math.random() * 3));
      setTimeout(phrase, (t - c.currentTime) * 1000 + 3500 + Math.random() * 7000);
    };
    setTimeout(phrase, 2500);
  }

  // ---------------- fire ----------------
  _fire() {
    const c = this.ctx;
    this.fireGain = c.createGain(); this.fireGain.gain.value = 0;
    this.fireGain.connect(this.ambBus);
    const hiss = this._noiseSrc();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850;
    const hg = c.createGain(); hg.gain.value = 0.05;
    hiss.connect(lp); lp.connect(hg); hg.connect(this.fireGain);
    hiss.start();
    const pop = () => {
      if (!this.ctx) return;
      if (c.state !== 'running') { setTimeout(pop, 1500); return; }
      const t = c.currentTime + 0.02;
      const s = this._noiseSrc();
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 800 + Math.random() * 2600; bp.Q.value = 5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.16 + Math.random() * 0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.05);
      s.connect(bp); bp.connect(g); g.connect(this.fireGain);
      s.start(t); s.stop(t + 0.12);
      setTimeout(pop, 70 + Math.random() * 380);
    };
    pop();
  }

  // ---------------- one-shots ----------------
  step(running) {
    if (!this.started || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._stepSide *= -1;
    const s = this._noiseSrc();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = (620 + Math.random() * 300) * (running ? 1.15 : 1);
    bp.Q.value = 0.7;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 220;
    const g = c.createGain();
    g.gain.setValueAtTime(running ? 0.12 : 0.065, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    const pan = c.createStereoPanner(); pan.pan.value = this._stepSide * 0.12;
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(pan); pan.connect(this.sfxBus);
    s.start(t); s.stop(t + 0.12);
  }

  sip() {
    if (!this.started) return;
    const c = this.ctx;
    let t = c.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator();
      osc.frequency.setValueAtTime(330 - i * 55, t);
      osc.frequency.exponentialRampToValueAtTime(180 - i * 30, t + 0.07);
      const g = c.createGain();
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(g); g.connect(this.sfxBus);
      osc.start(t); osc.stop(t + 0.1);
      t += 0.13;
    }
    const ex = this._noiseSrc();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    ex.connect(lp); lp.connect(g); g.connect(this.sfxBus);
    ex.start(t); ex.stop(t + 0.35);
  }

  // a bite: a few short band-passed noise crunches, then a soft chew
  bite(soft = false) {
    if (!this.started) return;
    const c = this.ctx;
    let t = c.currentTime + 0.02;
    const n = soft ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const s = this._noiseSrc();
      const bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = (soft ? 900 : 2200) + Math.random() * 900; bp.Q.value = 1.4;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(soft ? 0.05 : 0.11, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07 + Math.random() * 0.03);
      s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
      s.start(t); s.stop(t + 0.12);
      t += 0.075 + Math.random() * 0.05;
    }
    for (let i = 0; i < 3; i++) {     // chewing
      t += 0.22;
      const s = this._noiseSrc();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      s.connect(lp); lp.connect(g); g.connect(this.sfxBus);
      s.start(t); s.stop(t + 0.2);
    }
  }

  uiTick() {
    if (!this.started || this.muted) return;
    const c = this.ctx;
    const t = c.currentTime;
    const s = this._noiseSrc();
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    s.connect(hp); hp.connect(g); g.connect(this.sfxBus);
    s.start(t); s.stop(t + 0.04);
  }

  toggleMute() {
    if (!this.started) return this.muted;
    this.muted = !this.muted;
    // unmuting is a user gesture — safe to revive a context suspended while hidden
    if (!this.muted && this.ctx.state !== 'running') this.ctx.resume();
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.2);
    return this.muted;
  }

  update(dt, px, pz, night) {
    if (!this.started) return;
    this.night = night;
    if (this.cricketBus)
      this.cricketBus.gain.setTargetAtTime(0.35 + 0.65 * night, this.ctx.currentTime, 0.5);
    if (this.fireGain) {
      const d = Math.hypot(px - FIRE_POS.x, pz - FIRE_POS.z);
      const prox = Math.pow(clamp(1 - d / 26, 0, 1), 2);
      this.fireGain.gain.setTargetAtTime(prox * 0.85, this.ctx.currentTime, 0.25);
    }
  }
}
