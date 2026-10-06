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
import { tr } from '../i18n';

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
      rows.push(<div key={`h${e.round}`} className="log-head">{tr('TUR {n}', { n: e.round })}{e.round === st.round ? tr(' · BU TUR') : ''}</div>);
      lastRound = e.round;
    }
    const a = e.attackerId ? pieceById(st, e.attackerId) : null;
    const v = pieceById(st, e.victimId)!;
    rows.push(
      <div key={e.key} className="log-row">
        {a ? <Mini st={st} p={a} size={26} /> : <span className="log-ring"><RingIcon size={20} /></span>}
        <span className="log-name" style={{ color: a ? (a.kind === 'star' || a.kind === 'twin' ? colorOf(a) : TXT) : HAZARD_TXT }}>
          {a ? labelOf(st, a) : tr('Halka')}
        </span>
        <Icon d={ICON.sword} size={20} color="#A9B4DA" />
        <Mini st={st} p={v} size={26} grey />
        <span className="log-victim">{labelOf(st, v)}</span>
        {a?.kind === 'star' && <span className="log-points" style={{ color: colorOf(a) }}>+{POINTS[v.kind]}</span>}
      </div>,
    );
  }
  return (
    <SheetFrame label={tr('Savaş kaydı')} onClose={close}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Savaş kaydı')}</div>
        <button type="button" className="round-btn" aria-label={tr('Kapat')} onClick={close}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="log-list">
        {rows.length ? rows : <div className="log-empty">{tr('Henüz kimse alınmadı.')}</div>}
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ ipucu (ilk üç maç)

export function CoachSheet({ step, onDone }: { step: number; onDone: () => void }) {
  const tips: [string, string[]][] = [
    [tr('Başlarken'), [
      tr('Yanan karelerden birine dokun, önizlemeyi gör, Onayla\'ya bas.'),
      tr('Şekil yönü söyler: kare düz, elmas çapraz. Her tur mod değişir.'),
      tr('Çizgili kare tehlikeli: orada bir taş seni alabilir.'),
    ]],
    [tr('Botları oku'), [
      tr('Bir bota dokun: yolları ve kimi kovaladığı tahtada görünür.'),
      tr('Kızıl bot düz yürür, çapraz alır. Çelik bot çapraz yürür, düz alır.'),
      tr('Taşın üstündeki numara sıradaki yeridir: küçük numara önce oynar.'),
    ]],
    [tr('Arena ve bonuslar'), [
      tr('Her 6 turda dış halka çöker. Turuncu çizgili halkada kalma.'),
      tr('Bonuslar puan ve hayatta kalmayla gelir. Paneldeki bonusa dokun, sonra kareyi seç.'),
      tr('Tek oyunculuda bütün botları temizle: İkiz seni taklit eder, seni alamaz.'),
    ]],
  ];
  const [title, lines] = tips[Math.min(step, tips.length - 1)];
  return (
    <SheetFrame label={title} onClose={onDone}>
      <div className="sheet-head">
        <div className="sheet-title">{title}</div>
        <div className="coach-step">{step + 1} / {tips.length}</div>
      </div>
      <ul className="coach-list">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      <div className="btn-row">
        <button type="button" className="btn btn-main" onClick={onDone}>{tr('Anladım')}</button>
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ menü (ana menü gelene kadar)

const levelLabels = (): [Level, string][] => [['kolay', tr('Kolay')], ['normal', tr('Normal')], ['zor', tr('Zor')]];

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
    <SheetFrame label={tr('Yeni maç')} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Yeni maç')}</div>
        <button type="button" className="round-btn" aria-label={tr('Kapat')} onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="field-label">{tr('OYUNCU SAYISI')}</div>
      <div className="seg" role="radiogroup" aria-label={tr('Oyuncu sayısı')}>
        {[1, 2, 3, 4].map(n => (
          <button key={n} type="button" role="radio" aria-checked={players === n} className={players === n ? 'is-on' : ''} onClick={() => setPlayers(n)}>
            <b>{n === 1 ? tr('Tek') : n}</b><span>{n === 1 ? tr("İkiz'le") : `${SIZE_BY_STARS[n]}×${SIZE_BY_STARS[n]}`}</span>
          </button>
        ))}
      </div>
      {players === 1 && (
        <>
          <div className="field-label">{tr('TAHTA')}</div>
          <div className="seg" role="radiogroup" aria-label={tr('Tahta boyutu')}>
            {SOLO_SIZES.map(n => (
              <button key={n} type="button" role="radio" aria-checked={boardSize === n} className={boardSize === n ? 'is-on' : ''} onClick={() => setBoardSize(n)}>
                <b>{n}×{n}</b>
              </button>
            ))}
          </div>
          <div className="field-label">{tr('ARENA BOTU: {n}', { n: botCount })}</div>
          <div className="bots-row">
            <input type="range" min={2} max={maxBots} value={botCount} aria-label={tr('Arena botu sayısı')} onChange={e => setBots(Number(e.target.value))} />
            <button type="button" className="btn btn-ghost bots-max" onClick={() => setBots(maxBots)}>{tr('Maks {n}', { n: maxBots })}</button>
          </div>
        </>
      )}
      <div className="field-label">{tr('BOT ZORLUĞU')}</div>
      <div className="seg" role="radiogroup" aria-label={tr('Bot zorluğu')}>
        {levelLabels().map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'is-on' : ''} onClick={() => setLevel(v)}>
            <b>{t}</b>
          </button>
        ))}
      </div>
      <div className="menu-note">
        {players === 1
          ? tr('Sen, aynan İkiz ve {bots} arena botu · tahta {size}×{size}. Bütün botları temizle.', { bots: botCount, size })
          : tr('Sen ve {ai} yapay zekâ oyuncu · tahta {size}×{size} · {bots} arena botu.', { ai: players - 1, size, bots: NEUTRALS_BY_STARS[players] })}
        {level === 'kolay' ? tr(' İlk sen oynarsın.') : level === 'zor' ? tr(' Botların hedefi gizli.') : ''}
      </div>
      {(onRules || onEnd) && (
        <div className="btn-row" style={{ marginBottom: 8 }}>
          {onRules && <button type="button" className="btn btn-ghost" onClick={onRules}>{tr('Nasıl oynanır?')}</button>}
          {onEnd && <button type="button" className="btn btn-ghost" onClick={onEnd}>{tr('Maçı bitir')}</button>}
        </div>
      )}
      <div className="btn-row">
        {onHome
          ? <button type="button" className="btn btn-ghost" onClick={onHome}>{tr('Ana menü')}</button>
          : <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('Kapat')}</button>}
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...setup, players, level, boardSize, bots: botCount })}>{tr('Başlat')}</button>
      </div>
    </SheetFrame>
  );
}

// Çok oyunculu maçta menü: odadan çıkış.
export function LeaveSheet({ onLeave, onClose }: { onLeave: () => void; onClose: () => void }) {
  return (
    <SheetFrame label={tr('Maçtan çık')} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Maçtan çık?')}</div>
        <button type="button" className="round-btn" aria-label={tr('Kapat')} onClick={onClose}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <p className="menu-note">{tr('Çıkarsan yerine yapay zekâ oynar. Odayı sen kurduysan maç herkes için biter.')}</p>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('Vazgeç')}</button>
        <button type="button" className="btn btn-main" style={{ background: 'var(--danger)' }} onClick={onLeave}>{tr('Maçtan çık')}</button>
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
  const title = won ? tr('Kazandın!') : st.solo ? tr('Alındın') : tr('{name} kazandı', { name: seatName(st, st.winner ?? order[0]) });
  return (
    <SheetFrame label={tr('Maç sonucu')} onClose={onClose}>
      <div className="res-head">
        <div className="res-title" style={{ color: won ? PLAYER_COLORS[ME] : undefined }}>{title}</div>
        <div className="res-sub">{pending ? tr('Rakip yıldız kalmadı. Botlarla savaşa devam edebilirsin') : st.solo ? (won ? tr('Arenada bot kalmadı') : tr('Bir dahaki sefere')) : tr('{n}. oldun', { n: order.indexOf(ME) + 1 })} · {time}</div>
      </div>
      <div className="res-stats">
        <div><b>{me.score}</b><span>{tr('Skor')}</span></div>
        <div><b>{me.takes}</b><span>{tr('Alma')}</span></div>
        <div><b>{lasted(ME)}</b><span>{tr('Tur ayakta')}</span></div>
      </div>
      {!st.solo && (
        <ol className="rank-list">
          {order.map((seat, i) => {
            const s = st.seats[seat], p = starOf(st, seat)!;
            return (
              <li key={seat} className={`rank-row${seat === ME ? ' is-me' : ''}`}>
                <span className="rank-no">{i + 1}.</span>
                <PieceGlyph kind="star" seat={seat} size={20} diamond={false} grey={!p.alive} />
                <span className="rank-name" style={{ color: PLAYER_COLORS[seat] }}>{seat === ME ? tr('Sen') : seatName(st, seat)}</span>
                <span className="rank-meta">{tr('{n} alma', { n: s.takes })} · {tr('{n} tur', { n: lasted(seat) })}{s.bonus ? ` · +${s.bonus}` : ''}</span>
                <span className="rank-score">{s.score}</span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="btn-row">
        {pending ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => ctl.endNow()}>{tr('Bitir')}</button>
            <button type="button" className="btn btn-main" onClick={() => ctl.resume()}>{tr('Devam et')}</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onClose}>{tr('Tahtaya bak')}</button>
        )}
        {!pending && onAgain && <button type="button" className="btn btn-main" onClick={onAgain}>{againLabel}</button>}
      </div>
    </SheetFrame>
  );
}
