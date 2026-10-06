// İlk üç yerel maçta gösterilen ipucu kartlarının sayacı (cihazda saklanır).
const KEY = 'xsword-coach';
export const COACH_STEPS = 3;

const read = () => {
  try { return Number(localStorage.getItem(KEY) ?? 0) || 0; } catch { return COACH_STEPS; }
};

// Sıradaki ipucu adımı; üçü de gösterildiyse null.
export const coachStep = () => (read() < COACH_STEPS ? read() : null);

export function markCoachSeen() {
  try { localStorage.setItem(KEY, String(Math.min(COACH_STEPS, read() + 1))); } catch { /* gizli sekme */ }
}
