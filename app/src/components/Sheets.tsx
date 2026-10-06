import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  NEUTRALS_BY_STARS, SIZE_BY_STARS, nextMode, pieceById, takeDirs, walkDirs,
} from '../../../engine/rules.js';
import type { GameState, Level, Piece } from '../../../engine/rules.js';
import { targetOf } from '../../../engine/bots.js';
import type { GameController, Setup, TakeEvent } from '../game/controller';
import { CROSS, DANGER, HAZARD_TXT, ICE, ICON, PLAYER_COLORS, PLUS, TXT, colorOf, diamondOf, seatOf } from '../game/look';
import { attackersOfMe } from '../game/threats';
import { BOT_NAMES, ME, labelOf, modeLower, seatName } from '../game/names';
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

// ------------------------------------------------------------ taş bilgisi

function Diagram({ st, p, kind }: { st: GameState; p: Piece; kind: 'walk' | 'take' }) {
  const mode = nextMode(st, p);
  const dirs = kind === 'walk' ? walkDirs(p, mode) : takeDirs(p, mode);
  const straight = dirs[0][0] === 0 || dirs[0][1] === 0;
  const cells = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      const on = dirs.some(([dr, dc]) => dr === r && dc === c);
      const mid = r === 0 && c === 0;
      const bg = mid ? '#232D5E' : on ? (kind === 'walk' ? 'rgba(233,240,255,.22)' : 'rgba(255,59,92,.24)') : '#1A2452';
      cells.push(
        <div key={`${r},${c}`} className="dia-cell" style={{ background: bg }}>
          {mid && <Mini st={st} p={p} size={38} />}
          {on && kind === 'walk' && <svg viewBox="0 0 100 100"><path d="M50 37 A13 13 0 1 1 49.99 37 Z" fill={ICE} /></svg>}
          {on && kind === 'take' && <svg viewBox="0 0 100 100"><path d={straight ? PLUS : CROSS} fill="none" stroke={DANGER} strokeWidth="11" strokeLinecap="round" /></svg>}
        </div>,
      );
    }
  }
  return (
    <div className="dia">
      <div className="dia-title">{kind === 'walk' ? 'YÜRÜR' : 'ALIR'}</div>
      <div className="dia-grid">{cells}</div>
      <div className="dia-text">{straight ? 'Düz' : 'Çapraz'} · {kind === 'walk' ? 'tek kare' : straight ? '+' : '×'}</div>
    </div>
  );
}

export function InfoSheet({ ctl, id }: { ctl: GameController; id: string }) {
  const st = ctl.state;
  const p = pieceById(st, id);
  const me = ctl.myStar();
  if (!p) return null;
  const close = () => ctl.closeSheet();
  let title: string, sub: string, order: string;
  if (p.kind === 'star') {
    const mode = nextMode(st, p);
    title = `${p.seat === ME ? 'Sen' : seatName(st, p.seat)} · yıldız`;
    sub = `${mode === st.mode ? 'Bu tur' : 'Sonraki tur'} ${modeLower(mode)} gider ve alır`;
  } else if (p.kind === 'twin') {
    title = 'İkiz · aynan';
    sub = 'Senden hemen sonra, senin yönünde oynar';
  } else {
    title = `${BOT_NAMES[p.kind]} bot · #${p.label}`;
    sub = p.kind === 'red' ? 'Kare: düz yürür · ×: çapraz alır' : 'Elmas: çapraz yürür · +: düz alır';
  }
  // Sıra maç başında bir kez karılır; botun numarası da bu sıradaki yeridir.
  order = `Sıra ${st.matchOrder.indexOf(p.id) + 1} / ${st.matchOrder.length}`;
  const target = p.alive ? targetOf(st, p) : null;
  const threatensMe = me.alive && p.id !== me.id && attackersOfMe(st, me).some(q => q.id === p.id);
  return (
    <SheetFrame label={title} onClose={close}>
      <div className="info-head">
        <Mini st={st} p={p} size={52} grey={!p.alive} />
        <div className="info-titles">
          <div className="info-title">{title}</div>
          <div className="info-sub">{sub}</div>
        </div>
        <div className="info-order">{order}</div>
      </div>
      <div className="info-diagrams">
        <Diagram st={st} p={p} kind="walk" />
        <Diagram st={st} p={p} kind="take" />
      </div>
      {target && (
        <div className="info-target">
          <span className="info-target-label">HEDEFİ</span>
          <Mini st={st} p={target} size={26} />
          <span style={{ color: PLAYER_COLORS[target.seat], fontWeight: 700 }}>
            {target.seat === ME ? `Sen (${seatName(st, ME)})` : seatName(st, target.seat)}
          </span>
          <span className="info-target-dist">{Math.max(Math.abs(target.r - p.r), Math.abs(target.c - p.c))} kare uzakta</span>
        </div>
      )}
      {threatensMe && (
        <div className="info-warn">
          <Icon d={ICON.warn} size={18} stroke={2.2} />
          <span>Bu tur seni alabilir</span>
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-block" onClick={close}>Kapat</button>
    </SheetFrame>
  );
}

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

export function MenuSheet({ ctl, onStart }: { ctl: GameController; onStart: (s: Setup) => void }) {
  const [players, setPlayers] = useState(ctl.setup.players);
  const [level, setLevel] = useState<Level>(ctl.setup.level);
  const close = () => ctl.closeSheet();
  const size = SIZE_BY_STARS[players];
  return (
    <SheetFrame label="Menü" onClose={close}>
      <div className="sheet-head">
        <div className="sheet-title">Yeni maç</div>
        <button type="button" className="round-btn" aria-label="Kapat" onClick={close}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
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
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={close}>Kapat</button>
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...ctl.setup, players, level })}>Yeni maç başlat</button>
      </div>
    </SheetFrame>
  );
}
