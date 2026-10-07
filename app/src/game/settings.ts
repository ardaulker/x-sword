// Oyuncu ayarları: cihazda saklanır.

import { PLAYER_COLORS } from './look';
import { isUnlocked, skinById, themeById } from './themes';

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
  quick: boolean;       // önizlemesiz oyna: kareye dokununca hamle hemen oynanır
  fastBots: boolean;    // bot turları bekletmez
  theme: string;        // tahta teması (game/themes.ts)
  skin: string;         // senin yıldızında görünen animasyonlu efekt (game/themes.ts → SKINS)
}

const NORMAL_COLORS = ['#3BFF8F', '#FFC53D', '#FF5CC0', '#B392FF'];
const CB_COLORS = ['#56E0A6', '#F5D43B', '#FF8A5C', '#8FB8FF'];
export const paletteOf = (cb: boolean) => (cb ? CB_COLORS : NORMAL_COLORS);

const KEY = 'xsword-settings';
export const SPEED = { yavas: 1.45, normal: 1, hizli: 0.65 } as const;

function load(): Settings {
  const def: Settings = { sound: true, music: true, tips: true, dangerMap: false, volume: 0.8, haptics: true, speed: 'normal', danger: true, targets: true, numbers: true, colorBlind: false, quick: false, fastBots: false, theme: 'gece', skin: 'none' };
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}

export let settings = load();
// Geçerli (açık) efekt: kilitli bir efekt seçili kalmışsa görünmez.
export let activeSkin = 'none';

// Animasyon hızı bütün süreleri çarpar (tokens.css: --hiz-carpan).
// Renk körü modu oyuncu renklerini değiştirir: kodda PLAYER_COLORS, CSS'te --oyuncu-N.
export function applySettings() {
  const root = document.documentElement.style;
  root.setProperty('--hiz-carpan', String(SPEED[settings.speed]));
  const skin = skinById(settings.skin);
  activeSkin = isUnlocked(skin) ? skin.id : 'none';
  // Kilitli tema kalıntısı varsa varsayılana dön.
  const theme = themeById(settings.theme);
  const t = isUnlocked(theme) ? theme : themeById('gece');
  root.setProperty('--kare', t.kare); root.setProperty('--kare-2', t.kare2);
  root.setProperty('--bosluk', t.bosluk); root.setProperty('--tahta-cerceve', t.cerceve);
  paletteOf(settings.colorBlind).forEach((c, i) => { PLAYER_COLORS[i] = c; root.setProperty(`--oyuncu-${i + 1}`, c); });
}

export function saveSettings(next: Settings) {
  settings = next;
  applySettings();
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* gizli sekme */ }
}
