// Feedback: vibration + sound. Every event has a short vibration and a synthesized sound (no audio files).
// iOS Safari doesn't support vibration; it is silently skipped there (the phone app plays it natively through the XSwordGames plugin). Sound starts on the first tap (a browser rule).

import { settings } from './settings';
import { nativeHaptic } from './platform';

// Every event has its own rhythm, recognizable even with eyes closed:
// select a short tick · confirm a bit longer · take (short-short-long) · taking a star (twice as strong) ·
// being taken or knocked out (long-short-long-short-very long) · shrink (rumble) · armor (light hit, long hum) ·
// earning a bonus (rising triplet) · using a bonus (double tick) · mode change (two waves) · end of match win / loss.
export const BUZZ = {
  select: 8,
  confirm: 18,
  take: [22, 30, 22, 30, 55],
  takeStar: [30, 25, 30, 25, 30, 25, 90],
  takenOrOut: [90, 40, 90, 40, 160],
  lastSeconds: 8,
  collapse: [45, 30, 45, 30, 45, 30, 130],
  mode: [10, 60, 10, 60, 24],
  myTurn: 14,
  bonusGain: [12, 35, 20, 35, 32],
  bonusUse: [18, 30, 18],
  armor: [12, 25, 80],
  win: [40, 40, 40, 40, 40, 40, 140],
  lose: [140, 60, 100, 60, 60],
} as const;

export function buzz(pattern: number | readonly number[]) {
  if (!settings.haptics) return;
  if (nativeHaptic(pattern)) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // Some browsers don't allow vibration before the user has touched the page.
  }
}

// ------------------------------------------------------------ sound

type Note = [freq: number, at: number, dur: number, type?: OscillatorType, gain?: number];

const SOUNDS: Record<string, Note[]> = {
  select: [[660, 0, 0.05, 'triangle', 0.08]],
  move: [[420, 0, 0.07, 'triangle', 0.1]],
  take: [[220, 0, 0.08, 'square', 0.12], [660, 0.05, 0.12, 'triangle', 0.12]],
  points: [[880, 0, 0.06, 'sine', 0.1], [1320, 0.06, 0.1, 'sine', 0.1]],
  myTurn: [[523, 0, 0.08, 'sine', 0.1], [784, 0.08, 0.12, 'sine', 0.1]],
  turn: [[330, 0, 0.04, 'sine', 0.05]],
  mode: [[392, 0, 0.1, 'triangle', 0.08], [523, 0.1, 0.12, 'triangle', 0.08]],
  collapse: [[110, 0, 0.35, 'sawtooth', 0.12], [82, 0.1, 0.4, 'sawtooth', 0.1]],
  out: [[392, 0, 0.15, 'square', 0.1], [262, 0.15, 0.2, 'square', 0.1], [196, 0.35, 0.35, 'square', 0.1]],
  bonusGain: [[660, 0, 0.07, 'sine', 0.1], [880, 0.07, 0.07, 'sine', 0.1], [1175, 0.14, 0.14, 'sine', 0.1]],
  bonusUse: [[1047, 0, 0.06, 'triangle', 0.1], [784, 0.06, 0.1, 'triangle', 0.1]],
  armor: [[1568, 0, 0.12, 'triangle', 0.12], [1175, 0.08, 0.18, 'triangle', 0.08]],
  // One sound per bonus when you use it: a dash, a quick double tap, a swap that crosses.
  useStep: [[392, 0, 0.05, 'triangle', 0.1], [587, 0.05, 0.1, 'triangle', 0.1]],
  useDouble: [[784, 0, 0.05, 'triangle', 0.1], [784, 0.09, 0.05, 'triangle', 0.1], [1047, 0.18, 0.12, 'triangle', 0.1]],
  useSwap: [[880, 0, 0.08, 'sine', 0.09], [440, 0, 0.08, 'sine', 0.09], [440, 0.08, 0.1, 'sine', 0.09], [880, 0.08, 0.1, 'sine', 0.09]],
  // The sword strokes are built from noise (see playSlash); the note lists stay empty.
  slash: [],
  slashBig: [],
  // Match start: the sword leaves its scabbard (playUnsheath), a tick for 3, 2, 1 and a rising pair for the start.
  unsheath: [],
  bell: [],
  count: [[330, 0, 0.14, 'triangle', 0.12], [165, 0, 0.18, 'sine', 0.14]],
  go: [[523, 0, 0.1, 'triangle', 0.12], [784, 0.08, 0.1, 'triangle', 0.12], [1047, 0.16, 0.28, 'triangle', 0.12]],
  win: [[523, 0, 0.12, 'triangle', 0.12], [659, 0.12, 0.12, 'triangle', 0.12], [784, 0.24, 0.12, 'triangle', 0.12], [1047, 0.36, 0.35, 'triangle', 0.12]],
  lose: [[330, 0, 0.2, 'sine', 0.1], [262, 0.2, 0.2, 'sine', 0.1], [196, 0.4, 0.45, 'sine', 0.1]],
  tick: [[1000, 0, 0.03, 'square', 0.04]],
};
export type SoundName = keyof typeof SOUNDS;

let ctx: AudioContext | null = null;
const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Unlock audio on the first tap (iOS and Chrome require a user gesture).
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => audio(), { once: true });

// A sword stroke: a band of noise that sweeps up (the whoosh) and a short metallic ring after it.
function playSlash(ac: AudioContext, t0: number, big: boolean) {
  const len = Math.floor(ac.sampleRate * 0.3);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(500, t0);
  bp.frequency.exponentialRampToValueAtTime(3400, t0 + 0.17);
  const g = ac.createGain();
  const peak = (big ? 0.34 : 0.2) * settings.volume;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (big ? 0.28 : 0.2));
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t0); src.stop(t0 + 0.3);
  // The ring: two inharmonic high partials, quick to fade.
  for (const [f, gain] of [[2140, 0.05], [3210, 0.03]] as const) {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    og.gain.setValueAtTime(0.0001, t0 + 0.11);
    og.gain.exponentialRampToValueAtTime(gain * (big ? 1.6 : 1) * settings.volume, t0 + 0.125);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + (big ? 0.5 : 0.34));
    o.connect(og).connect(ac.destination);
    o.start(t0 + 0.11); o.stop(t0 + 0.55);
  }
}

// A sword drawn slowly from its scabbard, cinematic: a click at the mouth of the scabbard, a long scrape of metal that
// swells and climbs in pitch with a flutter that speeds up, a low leather rumble underneath, and a long ringing "shing"
// as the blade comes free. About 1.3 s of scrape, the ring rings out for two seconds more.
function playUnsheath(ac: AudioContext, t0: number) {
  const dur = 1.3;
  const noise = (secs: number) => {
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * secs), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    return src;
  };
  const vol = settings.volume;
  // The click: the guard leaves the mouth of the scabbard.
  const click = noise(0.05), cbp = ac.createBiquadFilter(), cg = ac.createGain();
  cbp.type = 'bandpass'; cbp.frequency.value = 2600; cbp.Q.value = 1.5;
  cg.gain.setValueAtTime(0.0001, t0); cg.gain.exponentialRampToValueAtTime(0.25 * vol, t0 + 0.004); cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  click.connect(cbp).connect(cg).connect(ac.destination); click.start(t0); click.stop(t0 + 0.05);

  // The scrape: narrow band of noise sweeping up, swelling, with a flutter that speeds up.
  const scrape = noise(dur + 0.05), bp = ac.createBiquadFilter(), g = ac.createGain();
  bp.type = 'bandpass'; bp.Q.value = 6;
  bp.frequency.setValueAtTime(700, t0 + 0.03);
  bp.frequency.exponentialRampToValueAtTime(5000, t0 + dur);
  const peak = 0.3 * vol;
  g.gain.setValueAtTime(0.0001, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + 0.3);
  g.gain.exponentialRampToValueAtTime(peak, t0 + dur - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.03);
  const lfo = ac.createOscillator(), lfoG = ac.createGain();
  lfo.frequency.setValueAtTime(14, t0); lfo.frequency.linearRampToValueAtTime(34, t0 + dur);
  lfoG.gain.value = peak * 0.4;
  lfo.connect(lfoG).connect(g.gain);
  scrape.connect(bp).connect(g).connect(ac.destination);
  scrape.start(t0 + 0.03); scrape.stop(t0 + dur + 0.08); lfo.start(t0); lfo.stop(t0 + dur + 0.08);

  // The leather rumble: low noise that fades out in the first half.
  const rumble = noise(0.8), lp = ac.createBiquadFilter(), rg = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 420;
  rg.gain.setValueAtTime(0.0001, t0 + 0.02); rg.gain.exponentialRampToValueAtTime(0.2 * vol, t0 + 0.12); rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
  rumble.connect(lp).connect(rg).connect(ac.destination); rumble.start(t0 + 0.02); rumble.stop(t0 + 0.85);

  // The ring: a metallic "shing" as the tip clears, partials that fade slowly (the higher the faster).
  for (const [f, gain, ring] of [[1900, 0.1, 2.2], [2850, 0.075, 1.8], [4300, 0.05, 1.3], [6100, 0.03, 0.9]] as const) {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    og.gain.setValueAtTime(0.0001, t0 + dur - 0.1);
    og.gain.exponentialRampToValueAtTime(gain * vol, t0 + dur - 0.07);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + ring);
    o.connect(og).connect(ac.destination);
    o.start(t0 + dur - 0.1); o.stop(t0 + dur + ring + 0.05);
  }
}

// A bell struck twice: a bright strike with inharmonic partials that ring out.
function playBell(ac: AudioContext, t0: number) {
  for (const at of [0, 0.42]) {
    for (const [mult, gain, ring] of [[1, 0.2, 1.3], [2.76, 0.1, 0.9], [5.4, 0.06, 0.55], [8.93, 0.03, 0.3]] as const) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 880 * mult;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(gain * settings.volume, t0 + at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + ring);
      o.connect(g).connect(ac.destination);
      o.start(t0 + at); o.stop(t0 + at + ring + 0.05);
    }
  }
}

export function sound(name: SoundName) {
  if (!settings.sound || settings.volume <= 0) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime;
  if (name === 'slash' || name === 'slashBig') playSlash(ac, t0, name === 'slashBig');
  if (name === 'unsheath') playUnsheath(ac, t0);
  if (name === 'bell') playBell(ac, t0);
  for (const [freq, at, dur, type = 'sine', gain = 0.1] of SOUNDS[name]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(gain * settings.volume, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0 + at);
    o.stop(t0 + at + dur + 0.02);
  }
}

// One event: sound + vibration together.
export function feel(name: SoundName, pattern?: number | readonly number[]) {
  sound(name);
  if (pattern != null) buzz(pattern);
}

// ------------------------------------------------------------ tension music
// Plays in a round where the arena will shrink and stops when the ring collapses or the match ends: a low hum,
// a heavy heartbeat and now and then a high, dissonant ring. All synthesized.

let tension: { master: GainNode; stops: (() => void)[]; timer: number } | null = null;

export function startTension() {
  if (tension || !settings.music || settings.volume <= 0) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(settings.volume, ac.currentTime + 0.8);
  master.connect(ac.destination);
  const stops: (() => void)[] = [];

  // Hum: two slightly detuned sawtooth waves through a low-pass filter.
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 180;
  const hum = ac.createGain(); hum.gain.value = 0.07;
  lp.connect(hum).connect(master);
  for (const f of [55, 58.3]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(lp); o.start(); stops.push(() => o.stop());
  }
  // The filter slowly opens and closes.
  const lfo = ac.createOscillator(), lfoG = ac.createGain();
  lfo.frequency.value = 0.18; lfoG.gain.value = 70;
  lfo.connect(lfoG).connect(lp.frequency); lfo.start(); stops.push(() => lfo.stop());

  // Heartbeat and ring, scheduled ahead.
  let beat = 0, next = ac.currentTime + 0.1;
  const BEAT = 0.55;
  const tick = () => {
    while (next < ac.currentTime + 0.3) {
      const thump = (at: number, vol: number) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(95, at); o.frequency.exponentialRampToValueAtTime(38, at + 0.16);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
        o.connect(g).connect(master); o.start(at); o.stop(at + 0.22);
      };
      thump(next, 0.3);
      thump(next + 0.17, 0.18);
      if (beat % 4 === 3) {
        for (const f of [466, 659]) { // a tritone ring
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'triangle'; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, next + 0.3);
          g.gain.exponentialRampToValueAtTime(0.025, next + 0.33);
          g.gain.exponentialRampToValueAtTime(0.0001, next + 1.2);
          o.connect(g).connect(master); o.start(next + 0.3); o.stop(next + 1.25);
        }
      }
      beat++; next += BEAT;
    }
  };
  const timer = window.setInterval(() => { if (!settings.music || settings.volume <= 0) stopTension(); else tick(); }, 120);
  tick();
  tension = { master, stops, timer };
}

export function stopTension() {
  if (!tension) return;
  const { master, stops, timer } = tension;
  tension = null;
  clearInterval(timer);
  const ac = ctx;
  if (!ac) return;
  try {
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
  } catch { /* yoksay */ }
  setTimeout(() => { stops.forEach(s => { try { s(); } catch { /* already stopped */ } }); master.disconnect(); }, 400);
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) stopTension(); });
