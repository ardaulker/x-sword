// Phone app bridge. Today the game runs on the web; the iOS and Android apps will come as a Capacitor shell.
// In that shell a small native plugin we will write ("XSwordGames") provides:
//   iOS     → silent sign-in with Game Center + Game Center saved games (iCloud)
//   Android → silent sign-in with Google Play Games Services v2 + Play Games saved games
// On the web there is no plugin: every function quietly does nothing and the guest profile is used.
// The plugin contract is the NativeGames interface below; this file won't change once the native side is written.
// Details and setup steps: docs/profile-infrastructure.md

import { getProfile, updateProfile, cleanName } from './profile';
import type { Provider } from './profile';
import { mergeProgress, parseProgress, progressCode, readProgress, writeProgress } from './progress';

export interface NativePlayer { provider: Exclude<Provider, 'guest'>; playerId: string; displayName: string }

interface NativeGames {
  signIn(): Promise<NativePlayer>;                        // silent sign-in; opens the system sheet if needed
  loadSnapshot(): Promise<{ data: string | null }>;       // progress in the platform cloud save (progressCode format)
  saveSnapshot(opts: { data: string }): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { XSwordGames?: NativeGames };
}

const cap = () => (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
const games = () => cap()?.Plugins?.XSwordGames ?? null;

export const platform = (): 'ios' | 'android' | 'web' => {
  const p = cap()?.isNativePlatform?.() ? cap()?.getPlatform?.() : 'web';
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
  } catch {
    // Sign-in refused or no network: the guest profile and the on-device progress are used.
  }
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
