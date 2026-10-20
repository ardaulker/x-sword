// Feedback: vibration + sound. Every event has a short vibration and a sound: a recording from the chosen sound theme, or the
// synthesized version below.
// iOS Safari doesn't support vibration; it is silently skipped there (the phone app plays it natively through the XSwordGames plugin). Sound starts on the first tap (a browser rule).

import { settings } from './settings';
import type { SoundTheme } from './settings';
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
  // Two or more takes in a quick burst: one big combined strike (see strike()).
  combo: [],
  // Match start: a tick for 3, 2, 1, then the sword leaves its scabbard (a recording, with the synthesized playUnsheath as fallback).
  unsheath: [],
  bell: [],
  count: [[330, 0, 0.14, 'triangle', 0.12], [165, 0, 0.18, 'sine', 0.14]],
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
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => { const ac = audio(); if (ac) loadSamples(ac); }, { once: true });

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

// Recorded sounds. A name listed here plays its file (decoded once, kept in memory); the synthesized version below is
// the fallback while the file loads or if it cannot be loaded. Files live in app/public/sounds/ (sources: docs/third-party-licenses.md).
// Kenney's CC0 packs (RPG Audio, Impact Sounds, Interface Sounds, Sci-Fi Sounds), made by tools/make-sounds.py; the sword draw is Arda's file.
// Sound themes (settings.soundTheme): the classic files sit in sounds/, a theme's own files in sounds/<theme>/ and override them;
// THEME_SYNTH sounds are synthesized in that theme (the energy blade hums, no recording does that).
const RECORDED: SoundName[] = ['select', 'move', 'take', 'slash', 'slashBig', 'points', 'myTurn', 'turn', 'mode', 'collapse', 'out',
  'bonusGain', 'bonusUse', 'useStep', 'useDouble', 'useSwap', 'armor', 'win', 'lose', 'tick', 'count', 'bell'];
const THEME_RECORDED: Record<SoundTheme, SoundName[]> = {
  classic: [],
  future: ['take', 'slash', 'slashBig', 'combo', 'collapse', 'out', 'armor', 'useStep', 'useDouble', 'useSwap', 'unsheath'],
  energy: ['take', 'collapse', 'armor', 'useSwap'],
};
const THEME_SYNTH: Record<SoundTheme, SoundName[]> = { classic: [], future: [], energy: ['slash', 'slashBig', 'combo', 'unsheath'] };
const CLASSIC_FILES: Partial<Record<SoundName, string>> = {
  unsheath: 'sounds/sword-draw.m4a',
  ...Object.fromEntries(RECORDED.map(n => [n, `sounds/${n}.m4a`])),
};
const fileOf = (name: SoundName, theme: SoundTheme) =>
  THEME_RECORDED[theme].includes(name) ? `sounds/${theme}/${name}.m4a` : CLASSIC_FILES[name];
// Loudness per sound (the recordings are mastered at different levels; frequent ones stay quiet).
const SAMPLE_GAIN: Partial<Record<SoundName, number>> = { select: 0.5, move: 0.55, turn: 0.35, tick: 0.5, myTurn: 0.6, points: 0.6, take: 0.6, slash: 0.8, slashBig: 1, bell: 0.8 };
// Sounds that repeat a lot get a slightly different pitch each time, so a burst of them doesn't sound like a machine gun.
const VARY: SoundName[] = ['move', 'take', 'slash', 'slashBig', 'select', 'turn'];
// At most this many copies of one sound at once: a fast run of takes stays a run of strokes, not a wall of noise.
const MAX_VOICES = 2;
export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];
const samples = new Map<string, AudioBuffer | 'loading' | 'failed'>();
const voices = new Map<SoundName, number>();

function loadSamples(ac: AudioContext) {
  const theme = settings.soundTheme;
  for (const name of SOUND_NAMES) {
    const file = fileOf(name, theme);
    if (!file || samples.has(file)) continue;
    samples.set(file, 'loading');
    fetch(import.meta.env.BASE_URL + file)
      // The iPhone shell (capacitor://) answers local files with status 0, not 200: that is a success there too.
      .then(r => (r.ok || r.status === 0 ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(data => ac.decodeAudioData(data))
      .then(buf => samples.set(file, buf))
      .catch(e => { samples.set(file, 'failed'); console.warn(`X Sword: sound ${file} could not load:`, e instanceof Error ? e.message : e); });
  }
}

// Called when the player picks another sound theme: its files start loading at once.
export function preloadSounds() {
  const ac = ctx;
  if (ac) loadSamples(ac);
}

function playSample(ac: AudioContext, buf: AudioBuffer, t0: number, gain: number, rate = 1) {
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = gain * settings.volume;
  src.connect(g).connect(ac.destination);
  src.start(t0);
  return src;
}

export function sound(name: SoundName, opts?: { synth?: boolean; theme?: SoundTheme }) {
  if (!settings.sound || settings.volume <= 0) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const busy = voices.get(name) ?? 0;
  if (busy >= MAX_VOICES) return;
  voices.set(name, busy + 1);
  setTimeout(() => voices.set(name, Math.max(0, (voices.get(name) ?? 1) - 1)), 220);
  const t0 = ac.currentTime;
  const theme = opts?.theme ?? settings.soundTheme;
  if (THEME_SYNTH[theme].includes(name) && !opts?.synth) { playThemeSynth(ac, t0, name, theme); return; }
  const file = fileOf(name, theme);
  if (file && !opts?.synth) {
    const buf = samples.get(file);
    if (buf && buf !== 'loading' && buf !== 'failed') {
      const rate = VARY.includes(name) ? 0.95 + Math.random() * 0.1 : 1;
      playSample(ac, buf, t0, SAMPLE_GAIN[name] ?? 0.9, rate);
      if (name === 'combo') playBoom(ac, t0, 0.5);
      return;
    }
    loadSamples(ac);
  }
  if (name === 'slash' || name === 'slashBig') playSlash(ac, t0, name === 'slashBig');
  if (name === 'combo') playCombo(ac, t0, theme);
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

// A take's sword stroke. Takes that land within STRIKE_WINDOW of each other (a Double move that takes two, the Twin taking
// right after you, fast bots) are one burst: the first plays its stroke, the second adds one big combined strike, and the
// rest of the burst stays quiet so the strokes don't pile up into noise (Arda, 20 October 2026).
const STRIKE_WINDOW = 450;
let strikeAt = -Infinity, strikeRun = 0;
export function strike(big: boolean) {
  const now = performance.now();
  strikeRun = now - strikeAt < STRIKE_WINDOW ? strikeRun + 1 : 1;
  strikeAt = now;
  if (strikeRun === 1) sound(big ? 'slashBig' : 'slash');
  else if (strikeRun === 2) sound('combo');
}

// ------------------------------------------------------------ synthesized theme sounds

const noiseSource = (ac: AudioContext, secs: number) => {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * secs), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
};

// A low boom under a big strike: a sine that drops in pitch, and a short thud of low noise.
function playBoom(ac: AudioContext, t0: number, level: number) {
  const vol = level * settings.volume;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(34, t0 + 0.5);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.7 * vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
  o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.65);
  const n = noiseSource(ac, 0.3), lp = ac.createBiquadFilter(), ng = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 300;
  ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + 0.008); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  n.connect(lp).connect(ng).connect(ac.destination); n.start(t0); n.stop(t0 + 0.3);
}

// The combined strike when no recording is there: two blades crossing (two strokes a hair apart), a long ring and the boom.
function playCombo(ac: AudioContext, t0: number, theme: SoundTheme) {
  if (theme === 'energy') { playSaber(ac, t0, true); playSaber(ac, t0 + 0.07, true); playCrackle(ac, t0 + 0.12, 0.45); playBoom(ac, t0 + 0.1, 0.6); return; }
  const big = samples.get(fileOf('slashBig', theme) ?? '');
  if (big && big !== 'loading' && big !== 'failed') {
    playSample(ac, big, t0, 1, 0.88);
    playSample(ac, big, t0 + 0.06, 0.8, 1.12);
  } else {
    playSlash(ac, t0, true);
    playSlash(ac, t0 + 0.06, true);
  }
  for (const [f, gain, ring] of [[1320, 0.06, 1.4], [1980, 0.045, 1.1], [3170, 0.03, 0.7]] as const) {
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    og.gain.setValueAtTime(0.0001, t0 + 0.12);
    og.gain.exponentialRampToValueAtTime(gain * settings.volume, t0 + 0.135);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12 + ring);
    o.connect(og).connect(ac.destination); o.start(t0 + 0.12); o.stop(t0 + 0.17 + ring);
  }
  playBoom(ac, t0 + 0.1, 0.55);
}

// An energy blade swung through the air: a buzzing hum (two detuned sawtooth waves) that bends up and back down as the blade
// passes (a Doppler swoop), with a hiss of air on top. Not any film's sound: just a hum that moves.
function playSaber(ac: AudioContext, t0: number, big: boolean) {
  const dur = big ? 0.5 : 0.36, vol = (big ? 0.26 : 0.18) * settings.volume;
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.Q.value = 4;
  lp.frequency.setValueAtTime(700, t0); lp.frequency.exponentialRampToValueAtTime(2600, t0 + dur * 0.45); lp.frequency.exponentialRampToValueAtTime(600, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  lp.connect(g).connect(ac.destination);
  for (const base of [92, 93.7, 184.5]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + dur * 0.45); o.frequency.exponentialRampToValueAtTime(base * 0.85, t0 + dur);
    o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const air = noiseSource(ac, dur), bp = ac.createBiquadFilter(), ag = ac.createGain();
  bp.type = 'bandpass'; bp.Q.value = 2;
  bp.frequency.setValueAtTime(900, t0); bp.frequency.exponentialRampToValueAtTime(3800, t0 + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(1200, t0 + dur);
  ag.gain.setValueAtTime(0.0001, t0); ag.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + dur * 0.45); ag.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  air.connect(bp).connect(ag).connect(ac.destination); air.start(t0); air.stop(t0 + dur);
  if (big) playCrackle(ac, t0 + dur * 0.45, 0.25);
}

// Electric crackle: a handful of tiny bright noise clicks at random moments.
const playCrackle = (ac: AudioContext, t0: number, secs: number) => playCrackleTo(ac, ac.destination, t0, secs, 0.35 * settings.volume);
function playCrackleTo(ac: AudioContext, out: AudioNode, t0: number, secs: number, level = 0.3) {
  const hp = ac.createBiquadFilter(), g = ac.createGain();
  hp.type = 'highpass'; hp.frequency.value = 2500;
  g.gain.value = level;
  hp.connect(g).connect(out);
  const count = Math.round(secs * 40);
  for (let i = 0; i < count; i++) {
    const at = t0 + Math.random() * secs, n = noiseSource(ac, 0.012), cg = ac.createGain();
    cg.gain.setValueAtTime(Math.random() * 0.8 + 0.2, at); cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.01);
    n.connect(cg).connect(hp); n.start(at); n.stop(at + 0.012);
  }
}

// The blade switches on: the hum rises from a growl to its pitch with a flash of crackle, then settles and fades.
function playIgnite(ac: AudioContext, t0: number) {
  const vol = 0.24 * settings.volume;
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t0); lp.frequency.exponentialRampToValueAtTime(2200, t0 + 0.35); lp.frequency.exponentialRampToValueAtTime(900, t0 + 1.4);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.3); g.gain.setValueAtTime(vol, t0 + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
  lp.connect(g).connect(ac.destination);
  for (const base of [92, 93.7, 184.5]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.4, t0); o.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.32); o.frequency.exponentialRampToValueAtTime(base, t0 + 0.6);
    o.connect(lp); o.start(t0); o.stop(t0 + 1.65);
  }
  playCrackle(ac, t0 + 0.2, 0.3);
}

function playThemeSynth(ac: AudioContext, t0: number, name: SoundName, theme: SoundTheme) {
  if (name === 'slash' || name === 'slashBig') playSaber(ac, t0, name === 'slashBig');
  else if (name === 'combo') playCombo(ac, t0, theme);
  else if (name === 'unsheath') playIgnite(ac, t0);
}

// One event: sound + vibration together.
export function feel(name: SoundName, pattern?: number | readonly number[]) {
  sound(name);
  if (pattern != null) buzz(pattern);
}

// ------------------------------------------------------------ tension music
// Plays in a round where the arena will shrink and stops when the ring collapses or the match ends. All synthesized, one
// piece per sound theme: Classic a low hum, a heavy heartbeat and now and then a high, dissonant ring; Futuristic a pulsing
// synth arpeggio over a kick; Energy blade a deep buzzing drone that swells, with a slow pulse and electric crackle.

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
  const theme = settings.soundTheme;
  const tick = theme === 'future' ? futureMusic(ac, master, stops) : theme === 'energy' ? energyMusic(ac, master, stops) : classicMusic(ac, master, stops);
  const timer = window.setInterval(() => { if (!settings.music || settings.volume <= 0) stopTension(); else tick(); }, 120);
  tick();
  tension = { master, stops, timer };
}

// Each piece sets up its steady layers and returns a scheduler that queues the next beats ahead of time.
type Music = (ac: AudioContext, master: GainNode, stops: (() => void)[]) => () => void;

const classicMusic: Music = (ac, master, stops) => {
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
  return tick;
};

const kick = (ac: AudioContext, out: AudioNode, at: number, vol: number) => {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g).connect(out); o.start(at); o.stop(at + 0.24);
};

const futureMusic: Music = (ac, master) => {
  // A minor arpeggio in sixteenths through a filter that slowly opens, a kick on every beat; the line climbs a step every bar.
  const ARP = [110, 130.8, 164.8, 220, 164.8, 130.8, 110, 98];
  const BARS = [1, 1, 1.0595, 0.9439];
  const STEP = 0.125;
  let i = 0, next = ac.currentTime + 0.1;
  return () => {
    while (next < ac.currentTime + 0.3) {
      const bar = Math.floor(i / 16) % BARS.length;
      const f = ARP[i % ARP.length] * BARS[bar];
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f;
      lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.value = 600 + 900 * (0.5 + 0.5 * Math.sin(i / 20));
      g.gain.setValueAtTime(0.0001, next); g.gain.exponentialRampToValueAtTime(0.05, next + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, next + STEP * 0.9);
      o.connect(lp).connect(g).connect(master); o.start(next); o.stop(next + STEP);
      if (i % 4 === 0) kick(ac, master, next, 0.32);
      i++; next += STEP;
    }
  };
};

const energyMusic: Music = (ac, master, stops) => {
  // The drone: the blade's buzz an octave down, swelling slowly, plus a high whine that wavers.
  const lp = ac.createBiquadFilter(), hum = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 3;
  hum.gain.value = 0.06;
  lp.connect(hum).connect(master);
  for (const f of [46, 46.6, 92.3]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(lp); o.start(); stops.push(() => o.stop());
  }
  const lfo = ac.createOscillator(), lfoG = ac.createGain();
  lfo.frequency.value = 0.25; lfoG.gain.value = 220;
  lfo.connect(lfoG).connect(lp.frequency); lfo.start(); stops.push(() => lfo.stop());
  const whine = ac.createOscillator(), wg = ac.createGain(), vib = ac.createOscillator(), vibG = ac.createGain();
  whine.type = 'sine'; whine.frequency.value = 1480; wg.gain.value = 0.008;
  vib.frequency.value = 5.5; vibG.gain.value = 9;
  vib.connect(vibG).connect(whine.frequency);
  whine.connect(wg).connect(master); whine.start(); vib.start();
  stops.push(() => whine.stop(), () => vib.stop());
  let beat = 0, next = ac.currentTime + 0.1;
  const BEAT = 0.7;
  return () => {
    while (next < ac.currentTime + 0.3) {
      kick(ac, master, next, 0.26);
      if (beat % 3 === 2) playCrackleTo(ac, master, next + 0.35, 0.18);
      beat++; next += BEAT;
    }
  };
};

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
