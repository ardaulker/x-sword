// Geri bildirim: titreşim + ses. Her olayın kısa bir titreşimi ve sentezlenmiş bir sesi var (dosya yok).
// iOS Safari titreşimi desteklemez; orada sessizce atlanır. Ses ilk dokunuşta açılır (tarayıcı kuralı).

import { settings } from './settings';

export const BUZZ = {
  select: 10,
  confirm: 20,
  take: [30, 40, 20],
  takenOrOut: [60, 50, 60],
  lastSeconds: 8,
  collapse: 60,
  mode: [10, 80, 10],
  myTurn: 12,
  bonusGain: [15, 40, 15],
  bonusUse: 12,
} as const;

export function buzz(pattern: number | readonly number[]) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // Bazı tarayıcılar kullanıcı dokunmadan titreşime izin vermez.
  }
}

// ------------------------------------------------------------ ses

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

// İlk dokunuşta sesi aç (iOS ve Chrome kullanıcı etkileşimi ister).
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => audio(), { once: true });

export function sound(name: SoundName) {
  if (!settings.sound) return;
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const t0 = ac.currentTime;
  for (const [freq, at, dur, type = 'sine', gain = 0.1] of SOUNDS[name]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + at);
    g.gain.exponentialRampToValueAtTime(gain, t0 + at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0 + at);
    o.stop(t0 + at + dur + 0.02);
  }
}

// Bir olay: ses + titreşim birlikte.
export function feel(name: SoundName, pattern?: number | readonly number[]) {
  sound(name);
  if (pattern != null) buzz(pattern);
}
