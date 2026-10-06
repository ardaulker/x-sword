// Oyuncu ayarları: cihazda saklanır.

export interface Settings {
  sound: boolean;
  haptics: boolean;
  speed: 'yavas' | 'normal' | 'hizli';
}

const KEY = 'xsword-settings';
export const SPEED = { yavas: 1.45, normal: 1, hizli: 0.65 } as const;

function load(): Settings {
  const def: Settings = { sound: true, haptics: true, speed: 'normal' };
  try { return { ...def, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return def; }
}

export let settings = load();

// Animasyon hızı bütün süreleri çarpar (tokens.css: --hiz-carpan).
export function applySettings() {
  document.documentElement.style.setProperty('--hiz-carpan', String(SPEED[settings.speed]));
}

export function saveSettings(next: Settings) {
  settings = next;
  applySettings();
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* gizli sekme */ }
}
