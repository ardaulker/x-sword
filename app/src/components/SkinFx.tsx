// Piece effects: an animated decoration around the star. Purely visual; no rule or move changes.
// Placed inside the piece (as a PieceGlyph child); it takes its size from the piece's box.

export function SkinFx({ id }: { id: string }) {
  if (id === 'flame') {
    return (
      <div className="fx fx-flame" aria-hidden="true">
        <svg viewBox="0 0 100 70" overflow="visible">
          <defs>
            <linearGradient id="fxFlameG" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#FF4D1A" /><stop offset=".55" stopColor="#FF9F1A" /><stop offset="1" stopColor="#FFE066" />
            </linearGradient>
          </defs>
          <path className="fl fl-a" d="M14 70 C2 48 18 38 14 12 C34 26 38 48 30 70 Z" fill="url(#fxFlameG)" />
          <path className="fl fl-b" d="M38 70 C26 40 46 30 44 0 C66 22 70 44 60 70 Z" fill="url(#fxFlameG)" />
          <path className="fl fl-c" d="M66 70 C56 50 72 40 70 16 C88 30 90 52 80 70 Z" fill="url(#fxFlameG)" />
        </svg>
        <span className="fx-ember e1" /><span className="fx-ember e2" /><span className="fx-ember e3" />
      </div>
    );
  }
  if (id === 'bolt') {
    return (
      <div className="fx fx-bolt" aria-hidden="true">
        <svg viewBox="0 0 100 100" overflow="visible">
          <circle className="ring" cx="50" cy="50" r="58" fill="none" stroke="#9BE8FF" strokeWidth="2.5" strokeDasharray="10 14" strokeLinecap="round" />
          <path className="bolt b1" d="M50 -14 L40 6 L54 8 L44 28" fill="none" stroke="#E8FBFF" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          <path className="bolt b2" d="M112 52 L92 44 L94 58 L74 50" fill="none" stroke="#E8FBFF" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          <path className="bolt b3" d="M-12 48 L8 56 L6 42 L26 50" fill="none" stroke="#E8FBFF" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (id === 'crystal') {
    return (
      <div className="fx fx-crystal" aria-hidden="true">
        <div className="orbit">
          {[0, 1, 2, 3].map(i => <span key={i} className="shard" style={{ transform: `rotate(${i * 90}deg) translateY(-78%)` }} />)}
        </div>
        <div className="glow" />
      </div>
    );
  }
  if (id === 'gold') {
    return (
      <div className="fx fx-gold" aria-hidden="true">
        <div className="halo-gold" />
        {[0, 1, 2].map(i => (
          <svg key={i} className={`spark sp${i}`} viewBox="0 0 20 20"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#FFE9A0" /></svg>
        ))}
      </div>
    );
  }
  return null;
}
