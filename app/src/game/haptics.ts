// Titreşim desenleri (handoff bölüm 7). iOS Safari titreşimi desteklemez; orada sessizce atlanır.

export const BUZZ = {
  select: 10,
  confirm: 20,
  take: [30, 40, 20],
  takenOrOut: [60, 50, 60],
  lastSeconds: 8,
  collapse: 60,
  mode: [10, 80, 10],
} as const;

export function buzz(pattern: number | readonly number[]) {
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // Bazı tarayıcılar kullanıcı dokunmadan titreşime izin vermez.
  }
}
