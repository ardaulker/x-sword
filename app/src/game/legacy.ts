// Values saved by older versions, when identifiers were Turkish (renamed to English on 2026-10-08).
// Saves in localStorage and shared replay links may still carry them, so they are mapped on load.

const LEVELS: Record<string, string> = { kolay: 'easy', zor: 'hard' };
const MODES: Record<string, string> = { DUZ: 'STRAIGHT', CAPRAZ: 'DIAGONAL' };
const SPEEDS: Record<string, string> = { yavas: 'slow', hizli: 'fast' };
const THEMES: Record<string, string> = { gece: 'night', zumrut: 'emerald', kor: 'ember', buz: 'ice', mor: 'violet' };

export const legacyLevel = <T extends string>(v: T): T => (LEVELS[v] ?? v) as T;
export const legacyMode = <T extends string>(v: T): T => (MODES[v] ?? v) as T;
export const legacySpeed = <T extends string>(v: T): T => (SPEEDS[v] ?? v) as T;
export const legacyTheme = (v: string) => THEMES[v] ?? v;

// createGame / createPuzzle options from an old save or replay link.
export function legacyOpts<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = { ...o };
  if (out.rules == null) out.rules = 1; // saved before rules versions existed: played by the original rules
  if (typeof out.neutralLevel === 'string') out.neutralLevel = legacyLevel(out.neutralLevel);
  if (Array.isArray(out.seats)) out.seats = out.seats.map((s: Record<string, unknown>) => (typeof s?.level === 'string' ? { ...s, level: legacyLevel(s.level) } : s));
  const pz = out.puzzle as Record<string, unknown> | undefined;
  if (pz && typeof pz.mode === 'string') out.puzzle = { ...pz, mode: legacyMode(pz.mode) };
  return out as T;
}
