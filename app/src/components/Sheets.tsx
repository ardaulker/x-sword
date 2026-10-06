import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NEUTRALS_BY_STARS, POINTS, SIZE_BY_STARS, pieceById } from '../../../engine/rules.js';
import type { GameState, Level, Piece } from '../../../engine/rules.js';
import type { GameController, Setup, TakeEvent } from '../game/controller';
import { HAZARD_TXT, ICON, TXT, colorOf, diamondOf, seatOf } from '../game/look';
import { labelOf } from '../game/names';
import { Icon, RingIcon } from './bits';
import { PieceGlyph } from './PieceGlyph';

// Alttan açılan kart; arka plan kararır, dışına dokununca kapanır.
function SheetFrame({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

const Mini = ({ st, p, size, grey }: { st: GameState; p: Piece; size: number; grey?: boolean }) => (
  <PieceGlyph kind={p.kind} seat={seatOf(p)} size={size} diamond={diamondOf(p, st.mode)} grey={grey} />
);

// ------------------------------------------------------------ savaş kaydı

export function LogSheet({ ctl, events }: { ctl: GameController; events: TakeEvent[] }) {
  const st = ctl.state;
  const close = () => ctl.closeSheet();
  const rows: ReactNode[] = [];
  let lastRound = -1;
  for (const e of [...events].reverse()) {
    if (e.round !== lastRound) {
      rows.push(<div key={`h${e.round}`} className="log-head">TUR {e.round}{e.round === st.round ? ' · BU TUR' : ''}</div>);
      lastRound = e.round;
    }
    const a = e.attackerId ? pieceById(st, e.attackerId) : null;
    const v = pieceById(st, e.victimId)!;
    rows.push(
      <div key={e.key} className="log-row">
        {a ? <Mini st={st} p={a} size={26} /> : <span className="log-ring"><RingIcon size={20} /></span>}
        <span className="log-name" style={{ color: a ? (a.kind === 'star' || a.kind === 'twin' ? colorOf(a) : TXT) : HAZARD_TXT }}>
          {a ? labelOf(st, a) : 'Halka'}
        </span>
        <Icon d={ICON.sword} size={20} color="#A9B4DA" />
        <Mini st={st} p={v} size={26} grey />
        <span className="log-victim">{labelOf(st, v)}</span>
        {a?.kind === 'star' && <span className="log-points" style={{ color: colorOf(a) }}>+{POINTS[v.kind]}</span>}
      </div>,
    );
  }
  return (
    <SheetFrame label="Savaş kaydı" onClose={close}>
      <div className="sheet-head">
        <div className="sheet-title">Savaş kaydı</div>
        <button type="button" className="round-btn" aria-label="Kapat" onClick={close}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="log-list">
        {rows.length ? rows : <div className="log-empty">Henüz kimse alınmadı.</div>}
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ menü (ana menü gelene kadar)

const LEVEL_LABELS: [Level, string][] = [['kolay', 'Kolay'], ['normal', 'Normal'], ['zor', 'Zor']];

// Maç ayarı: ana menüden "Oyuna başla" ile ve oyun içindeki menü düğmesiyle açılır.
export function SetupSheet({ setup, onStart, onClose, onHome }: {
  setup: Setup; onStart: (s: Setup) => void; onClose: () => void; onHome?: () => void;
}) {
  const [players, setPlayers] = useState(setup.players);
  const [level, setLevel] = useState<Level>(setup.level);
  const size = SIZE_BY_STARS[players];
  return (
    <SheetFrame label="Yeni maç" onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">Yeni maç</div>
        <button type="button" className="round-btn" aria-label="Kapat" onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="field-label">OYUNCU SAYISI</div>
      <div className="seg" role="radiogroup" aria-label="Oyuncu sayısı">
        {[1, 2, 3, 4].map(n => (
          <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'is-on' : ''} onClick={() => setPlayers(n)}>
            <b>{n === 1 ? 'Tek' : n}</b><span>{n === 1 ? "İkiz'le" : `${SIZE_BY_STARS[n]}×${SIZE_BY_STARS[n]}`}</span>
          </button>
        ))}
      </div>
      <div className="field-label">BOT ZORLUĞU</div>
      <div className="seg" role="radiogroup" aria-label="Bot zorluğu">
        {LEVEL_LABELS.map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'is-on' : ''} onClick={() => setLevel(v)}>
            <b>{t}</b>
          </button>
        ))}
      </div>
      <div className="menu-note">
        {players === 1
          ? `Sen, aynan İkiz ve ${NEUTRALS_BY_STARS[1]} arena botu · tahta ${size}×${size}. Son kalan sen ol.`
          : `Sen ve ${players - 1} yapay zekâ oyuncu · tahta ${size}×${size} · ${NEUTRALS_BY_STARS[players]} arena botu.`}
        {level === 'kolay' ? ' İlk sen oynarsın.' : level === 'zor' ? ' Botların hedefi gizli.' : ''}
      </div>
      <div className="btn-row">
        {onHome
          ? <button type="button" className="btn btn-ghost" onClick={onHome}>Ana menü</button>
          : <button type="button" className="btn btn-ghost" onClick={onClose}>Kapat</button>}
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...setup, players, level })}>Başlat</button>
      </div>
    </SheetFrame>
  );
}
