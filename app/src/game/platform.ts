// Telefon uygulaması köprüsü. Oyun bugün web'de çalışır; iOS ve Android uygulaması Capacitor kabuğuyla gelecek.
// O kabukta bizim yazacağımız küçük bir yerel eklenti ("XSwordGames") şunları sağlar:
//   iOS     → Game Center ile sessiz giriş + Game Center kayıtlı oyun (iCloud)
//   Android → Google Play Games Services v2 ile sessiz giriş + Play Games kayıtlı oyun
// Web'de eklenti yoktur: bütün fonksiyonlar sessizce hiçbir şey yapmaz ve misafir profil kullanılır.
// Eklentinin sözleşmesi aşağıdaki NativeGames arayüzüdür; yerel taraf yazılınca bu dosya değişmez.
// Ayrıntı ve kurulum adımları: docs/profil-altyapisi.md

import { getProfile, updateProfile, cleanName } from './profile';
import type { Provider } from './profile';
import { mergeProgress, parseProgress, progressCode, readProgress, writeProgress } from './progress';

export interface NativePlayer { provider: Exclude<Provider, 'guest'>; playerId: string; displayName: string }

interface NativeGames {
  signIn(): Promise<NativePlayer>;                        // sessiz giriş; gerekirse sistem penceresini açar
  loadSnapshot(): Promise<{ data: string | null }>;       // platform bulut kaydındaki ilerleme (progressCode biçimi)
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

// Uygulama açılınca: platform hesabıyla bağlan, buluttaki ilerlemeyle birleştir. Web'de hiçbir şey yapmaz.
export async function bootPlatform() {
  const g = games();
  if (!g) return;
  try {
    const player = await g.signIn();
    const p = getProfile();
    const name = cleanName(player.displayName);
    // Adını hiç değiştirmemiş oyuncuya platformdaki adı öner (değiştirdiyse onunki kalır).
    const keepName = p.provider !== 'guest' || !/^\S+ \d{3}$/.test(p.name);
    updateProfile({ provider: player.provider, providerId: player.playerId, providerName: name || null, ...(keepName || !name ? {} : { name }) });
    await syncCloud();
  } catch {
    // Giriş reddedildi ya da ağ yok: misafir profil ve cihazdaki ilerleme kullanılır.
  }
}

// Buluttaki ilerlemeyi cihazdakiyle birleştirir ve sonucu ikisine de yazar. Maç sonunda da çağrılır.
export async function syncCloud() {
  const g = games();
  if (!g || getProfile().provider === 'guest') return;
  try {
    const { data } = await g.loadSnapshot();
    const remote = data ? parseProgress(data) : null;
    const merged = remote ? mergeProgress(readProgress(), remote) : readProgress();
    writeProgress(merged);
    await g.saveSnapshot({ data: progressCode(merged) });
  } catch { /* sonra yeniden denenir */ }
}
