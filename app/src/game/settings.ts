// Oyuncu ayarları: cihazda saklanır.

import { PLAYER_COLORS } from './look';

export interface Settings {
  sound: boolean;       // ses efektleri
  music: boolean;       // gerilim müziği
  tips: boolean;        // ilk üç maçın başında ipucu kartı
  volume: number;       // 0–1, efekt ve müzik için ortak seviye
  haptics: boolean;
  speed: 'yavas' | 'normal' | 'hizli';
  dangerMap: boolean;   // gelecek turda alınabileceğin bütün kareler soluk kırmızı
  danger: boolean;      // gidilebilir ama tehlikeli kareler kırmızı çizgili
  targets: boolean;     // botun hedef üçgeni (zor modda hep gizli)
  numbers: boolean;     // bütün taşlarda sıra numarası; kapalıyken yalnız oynayan ve sıradaki 3 taş
  colorBlind: boolean;  // renk körü paleti
}

const NORMAL_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF'];
const CB_COLORS = ['#56E0A6', '#F5D43B', '#FF8A5C', '#8FB8FF'];
export const paletteOf = (cb: boolean) => (cb ? CB_COLORS : NORMAL_COLORS);

const KEY = 'xsword-settings';
export const SPEED = { yavas: 1.45, normal: 1, hizli: 0.65 } as const;

function load(): Settings {
  const def: Settings = { sound: true, music: true, tips: true, dangerMap: false, volume: 0.8, haptics: true, speed: 'normal', danger: true, targets: true, numbers: true, colorBlind: false };
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}

export let settings = load();

// Animasyon hızı bütün süreleri çarpar (tokens.css: --hiz-carpan).
// Renk körü modu oyuncu renklerini değiştirir: kodda PLAYER_COLORS, CSS'te --oyuncu-N.
export function applySettings() {
  const root = document.documentElement.style;
  root.setProperty('--hiz-carpan', String(SPEED[settings.speed]));
  paletteOf(settings.colorBlind).forEach((c, i) => { PLAYER_COLORS[i] = c; root.setProperty(`--oyuncu-${i + 1}`, c); });
}

export function saveSettings(next: Settings) {
  settings = next;
  applySettings();
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* gizli sekme */ }
}
