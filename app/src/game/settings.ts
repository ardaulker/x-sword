// Player settings: stored on the device.

import { PLAYER_COLORS } from './look';
import { isUnlocked, skinById, themeById } from './themes';
import { legacySpeed, legacyTheme } from './legacy';

export interface Settings {
  sound: boolean;       // ses efektleri
  music: boolean;       // tension music
  tips: boolean;        // tip card at the start of the first three matches
  volume: number;       // 0–1, shared level for effects and music
  haptics: boolean;
  speed: 'slow' | 'normal' | 'fast';
  dangerMap: boolean;   // every square where you could be taken next round, in faint red
  danger: boolean;      // reachable but dangerous squares get red stripes
  targets: boolean;     // the bot's target triangle (always hidden on Hard)
  numbers: boolean;     // turn number on every piece; when off, only on the piece moving and the next 3
  colorBlind: boolean;  // color-blind palette
  quick: boolean;       // play without preview: tapping a square plays the move right away
  fastBots: boolean;    // bot rounds don't wait
  theme: string;        // board theme (game/themes.ts)
  skin: string;         // animated effect shown on your star (game/themes.ts → SKINS)
}

const NORMAL_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF'];
const CB_COLORS = ['#56E0A6', '#F5D43B', '#FF8A5C', '#8FB8FF'];
export const paletteOf = (cb: boolean) => (cb ? CB_COLORS : NORMAL_COLORS);

const KEY = 'xsword-settings';
export const SPEED = { slow: 1.45, normal: 1, fast: 0.65 } as const;

function load(): Settings {
  const def: Settings = { sound: true, music: true, tips: true, dangerMap: false, volume: 0.8, haptics: true, speed: 'normal', danger: true, targets: true, numbers: true, colorBlind: false, quick: false, fastBots: false, theme: 'night', skin: 'none' };
  try {
    const s = { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } as Settings;
    return { ...s, speed: legacySpeed(s.speed), theme: legacyTheme(s.theme) }; // values saved by older versions
  } catch { return def; }
}

export let settings = load();
// The active (unlocked) effect: a locked effect left selected is not shown.
export let activeSkin = 'none';

// Animation speed multiplies every duration (tokens.css: --speed-factor).
// Color-blind mode changes the player colors: PLAYER_COLORS in code, --player-N in CSS.
export function applySettings() {
  const root = document.documentElement.style;
  root.setProperty('--speed-factor', String(SPEED[settings.speed]));
  const skin = skinById(settings.skin);
  activeSkin = isUnlocked(skin) ? skin.id : 'none';
  // Fall back to the default if a locked theme is left selected.
  const theme = themeById(settings.theme);
  const t = isUnlocked(theme) ? theme : themeById('night');
  root.setProperty('--square', t.square); root.setProperty('--square-2', t.square2);
  root.setProperty('--void', t.voidColor); root.setProperty('--board-frame', t.frameColor);
  paletteOf(settings.colorBlind).forEach((c, i) => { PLAYER_COLORS[i] = c; root.setProperty(`--player-${i + 1}`, c); });
}

export function saveSettings(next: Settings) {
  settings = next;
  applySettings();
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private tab */ }
}
