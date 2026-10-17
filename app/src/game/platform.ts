// Phone app bridge. The game runs on the web and, inside a Capacitor shell (app/ios, later app/android), as the phone app.
// In the shell a small native plugin ("XSwordGames") provides:
//   iOS     → silent sign-in with Game Center + Game Center saved games (iCloud)
//   Android → silent sign-in with Google Play Games Services v2 + Play Games saved games
// On the web there is no plugin: every function quietly does nothing and the guest profile is used.
// The plugin contract is the NativeGames interface below.
// Details and setup steps: docs/profile-infrastructure.md

import { Capacitor, registerPlugin } from '@capacitor/core';
import { getProfile, updateProfile, cleanName } from './profile';
import type { Provider } from './profile';
import { mergeProgress, parseProgress, progressCode, readProgress, writeProgress } from './progress';

export interface NativePlayer { provider: Exclude<Provider, 'guest'>; playerId: string; displayName: string }

interface NativeGames {
  signIn(): Promise<NativePlayer>;                        // silent sign-in; opens the system sheet if needed
  loadSnapshot(): Promise<{ data: string | null }>;       // progress in the platform cloud save (progressCode format)
  saveSnapshot(opts: { data: string }): Promise<void>;
  // Plays a vibration rhythm: alternating vibrate / pause durations in ms (the same format as navigator.vibrate).
  // iOS has no web vibration, so the phone app does it natively (Core Haptics); Android can use the Vibrator service.
  haptic?(opts: { pattern: number[] }): Promise<void>;
}

// The native plugin (app/ios/App/App/XSwordGamesPlugin.swift) is registered by the shell; on the web it does not exist.
const plugin = registerPlugin<NativeGames>('XSwordGames');
const games = () => (Capacitor.isPluginAvailable('XSwordGames') ? plugin : null);

export const platform = (): 'ios' | 'android' | 'web' => {
  const p = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
  return p === 'ios' || p === 'android' ? p : 'web';
};

// On app start: connect the platform account and merge with the progress in the cloud. Does nothing on the web.
export async function bootPlatform() {
  const g = games();
  if (!g) return;
  try {
    const player = await g.signIn();
    const p = getProfile();
    const name = cleanName(player.displayName);
    // Give a player who never changed their name the platform name (a changed name is kept).
    const keepName = p.provider !== 'guest' || !/^\S+ \d{3}$/.test(p.name);
    updateProfile({ provider: player.provider, providerId: player.playerId, providerName: name || null, ...(keepName || !name ? {} : { name }) });
    await syncCloud();
  } catch (e) {
    // Sign-in refused or no network: the guest profile and the on-device progress are used.
    console.info('X Sword: Game Center sign-in not available:', e instanceof Error ? e.message : e);
  }
}

// In the phone app: plays the rhythm natively and returns true. On the web (or without the plugin) returns false.
export function nativeHaptic(pattern: number | readonly number[]): boolean {
  const g = games();
  if (!g?.haptic) return false;
  g.haptic({ pattern: typeof pattern === 'number' ? [pattern] : [...pattern] }).catch(() => {});
  return true;
}

// Merges the cloud progress with the on-device progress and writes the result to both. Also called at the end of a match.
export async function syncCloud() {
  const g = games();
  if (!g || getProfile().provider === 'guest') return;
  try {
    const { data } = await g.loadSnapshot();
    const remote = data ? parseProgress(data) : null;
    const merged = remote ? mergeProgress(readProgress(), remote) : readProgress();
    writeProgress(merged);
    await g.saveSnapshot({ data: progressCode(merged) });
  } catch { /* retried later */ }
}
