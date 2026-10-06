import { useEffect, useState } from 'react';
import { clockText } from '../game/names';
import { ICON } from '../game/look';

export function Icon({ d, size = 22, stroke = 2, color = 'currentColor', fill = 'none' }: {
  d: string; size?: number; stroke?: number; color?: string; fill?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === 'none' ? color : 'none'} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={d} />
    </svg>
  );
}

export function RingIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="10" aria-hidden="true" style={{ flex: 'none' }}>
      <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" />
      <polygon points="42,30 58,30 70,42 70,58 58,70 42,70 30,58 30,42" />
    </svg>
  );
}

// Maç saati: maç başlar başlamaz 00:00'dan sayar, maç bitince durur.
export function useMatchTime(start: number, end: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (end != null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  return clockText((end ?? now) - start);
}

export function MatchClock({ start, end }: { start: number; end: number | null }) {
  const t = useMatchTime(start, end);
  return (
    <span className="clock-chip" role="timer" aria-label={`Maç süresi ${t}`}>
      <Icon d={ICON.clock} size={13} stroke={2.2} />
      <span>{t}</span>
    </span>
  );
}
