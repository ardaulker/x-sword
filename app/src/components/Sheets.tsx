import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NEUTRALS_BY_STARS, POINTS, SIZE_BY_STARS, SOLO_SIZES, maxNeutrals, pieceById, ranking, starOf } from '../../../engine/rules.js';
import type { GameState, Level, Piece } from '../../../engine/rules.js';
import type { GameController, Setup, TakeEvent } from '../game/controller';
import { HAZARD_TXT, ICON, TXT, colorOf, diamondOf, seatOf } from '../game/look';
import { ME, labelOf, seatName } from '../game/names';
import { PLAYER_COLORS } from '../game/look';
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
export function SetupSheet({ setup, onStart, onClose, onHome, onRules, onEnd }: {
  setup: Setup; onStart: (s: Setup) => void; onClose: () => void; onHome?: () => void; onRules?: () => void; onEnd?: () => void;
}) {
  const [players, setPlayers] = useState(setup.players);
  const [level, setLevel] = useState<Level>(setup.level);
  const [boardSize, setBoardSize] = useState(setup.boardSize);
  const [bots, setBots] = useState(setup.bots);
  const size = players === 1 ? boardSize : SIZE_BY_STARS[players];
  const maxBots = maxNeutrals(boardSize);
  const botCount = Math.min(bots, maxBots);
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
      {players === 1 && (
        <>
          <div className="field-label">TAHTA</div>
          <div className="seg" role="radiogroup" aria-label="Tahta boyutu">
            {SOLO_SIZES.map(n => (
              <button key={n} type="button" role="radio" aria-checked={boardSize === n} className={boardSize === n ? 'is-on' : ''} onClick={() => setBoardSize(n)}>
                <b>{n}×{n}</b>
              </button>
            ))}
          </div>
          <div className="field-label">ARENA BOTU: {botCount}</div>
          <div className="bots-row">
            <input type="range" min={2} max={maxBots} value={botCount} aria-label="Arena botu sayısı" onChange={e => setBots(Number(e.target.value))} />
            <button type="button" className="btn btn-ghost bots-max" onClick={() => setBots(maxBots)}>Maks {maxBots}</button>
          </div>
        </>
      )}
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
          ? `Sen, aynan İkiz ve ${botCount} arena botu · tahta ${size}×${size}. Bütün botları temizle.`
          : `Sen ve ${players - 1} yapay zekâ oyuncu · tahta ${size}×${size} · ${NEUTRALS_BY_STARS[players]} arena botu.`}
        {level === 'kolay' ? ' İlk sen oynarsın.' : level === 'zor' ? ' Botların hedefi gizli.' : ''}
      </div>
      {(onRules || onEnd) && (
        <div className="btn-row" style={{ marginBottom: 8 }}>
          {onRules && <button type="button" className="btn btn-ghost" onClick={onRules}>Nasıl oynanır?</button>}
          {onEnd && <button type="button" className="btn btn-ghost" onClick={onEnd}>Maçı bitir</button>}
        </div>
      )}
      <div className="btn-row">
        {onHome
          ? <button type="button" className="btn btn-ghost" onClick={onHome}>Ana menü</button>
          : <button type="button" className="btn btn-ghost" onClick={onClose}>Kapat</button>}
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...setup, players, level, boardSize, bots: botCount })}>Başlat</button>
      </div>
    </SheetFrame>
  );
}

// Çok oyunculu maçta menü: odadan çıkış.
export function LeaveSheet({ onLeave, onClose }: { onLeave: () => void; onClose: () => void }) {
  return (
    <SheetFrame label="Maçtan çık" onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">Maçtan çık?</div>
        <button type="button" className="round-btn" aria-label="Kapat" onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <p className="menu-note">Çıkarsan yerine yapay zekâ oynar. Odayı sen kurduysan maç herkes için biter.</p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
        <button type="button" className="btn btn-main" style={{ background: 'var(--danger)' }} onClick={onLeave}>Maçtan çık</button>
      </div>
    </SheetFrame>
  );
}

// Maç sonu özeti: başlık, senin istatistiklerin, sıralama.
export function ResultsSheet({ ctl, time, onAgain, againLabel, onClose }: {
  ctl: GameController; time: string; onAgain?: () => void; againLabel: string; onClose: () => void;
}) {
  const st = ctl.state;
  const me = st.seats[ME];
  const won = st.winner === ME;
  const order = ranking(st);
  const lasted = (i: number) => (st.seats[i].out ? st.seats[i].outRound ?? st.round : st.round);
  const pending = st.decided && !st.over;
  const title = won ? 'Kazandın!' : st.solo ? 'Alındın' : `${seatName(st, st.winner ?? order[0])} kazandı`;
  return (
    <SheetFrame label="Maç sonucu" onClose={onClose}>
      <div className="res-head">
        <div className="res-title" style={{ color: won ? PLAYER_COLORS[ME] : undefined }}>{title}</div>
        <div className="res-sub">{pending ? 'Rakip yıldız kalmadı. Botlarla savaşa devam edebilirsin' : st.solo ? (won ? 'Arenada bot kalmadı' : 'Bir dahaki sefere') : `${order.indexOf(ME) + 1}. oldun`} · {time}</div>
      </div>
      <div className="res-stats">
        <div><b>{me.score}</b><span>Skor</span></div>
        <div><b>{me.takes}</b><span>Alma</span></div>
        <div><b>{lasted(ME)}</b><span>Tur ayakta</span></div>
      </div>
      {!st.solo && (
        <ol className="rank-list">
          {order.map((seat, i) => {
            const s = st.seats[seat], p = starOf(st, seat)!;
            return (
              <li key={seat} className={`rank-row${seat === ME ? ' is-me' : ''}`}>
                <span className="rank-no">{i + 1}.</span>
                <PieceGlyph kind="star" seat={seat} size={20} diamond={false} grey={!p.alive} />
                <span className="rank-name" style={{ color: PLAYER_COLORS[seat] }}>{seat === ME ? 'Sen' : seatName(st, seat)}</span>
                <span className="rank-meta">{s.takes} alma · {lasted(seat)} tur{s.bonus ? ` · +${s.bonus}` : ''}</span>
                <span className="rank-score">{s.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="btn-row">
        {pending ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => ctl.endNow()}>Bitir</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.resume()}>Devam et</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onClose}>Tahtaya bak</button>
        )}
        {!pending && onAgain && <button type="button" className="btn btn-main" onClick={onAgain}>{againLabel}</button>}
      </div>
    </SheetFrame>
  );
}
