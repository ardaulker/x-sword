// Counter for the tip cards shown in the first three local matches (kept on the device).
const KEY = 'xsword-coach';
export const COACH_STEPS = 3;

const read = () => {
  try { return Number(localStorage.getItem(KEY) ?? 0) || 0; } catch { return COACH_STEPS; }
};

// The next tip step; null once all three have been shown.
export const coachStep = () => (read() < COACH_STEPS ? read() : null);

export function markCoachSeen() {
  try { localStorage.setItem(KEY, String(Math.min(COACH_STEPS, read() + 1))); } catch { /* private tab */ }
}
