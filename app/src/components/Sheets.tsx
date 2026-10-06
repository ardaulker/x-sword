import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { POINTS, isWinner, SIZE_BY_STARS, BOARD_SIZES, defaultNeutrals, maxNeutrals, pieceById, ranking, starOf } from '../../../engine/rules.js';
import type { GameState, Level, Piece } from '../../../engine/rules.js';
import type { GameController, Setup, TakeEvent } from '../game/controller';
import { HAZARD_TXT, ICON, TXT, colorOf, diamondOf, seatOf } from '../game/look';
import { ME, labelOf, seatName, winnerLine } from '../game/names';
import { PLAYER_COLORS } from '../game/look';
import { Icon, RingIcon } from './bits';
import { PieceGlyph } from './PieceGlyph';
import { shareReplay, shareResult } from '../game/share';
import { PUZZLES } from '../game/puzzles';
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
      tr('Soluk kırmızı kareler: gelecek tur orada bir taş seni alabilir.'),
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
  const [page, setPage] = useState(Math.min(step, tips.length - 1));
  const [title, lines] = tips[page];
  const last = page === tips.length - 1;
  return (
    <SheetFrame label={title} onClose={onDone}>
      <div className="sheet-head">
        <div className="sheet-title">{title}</div>
        <div className="coach-step">{page + 1} / {tips.length}</div>
      </div>
      <ul className="coach-list">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      <div className="coach-dots" role="tablist" aria-label={tr('İpucu sayfaları')}>
        {tips.map((_, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === page} aria-label={tr('Sayfa {n}', { n: i + 1 })}
            className={i === page ? 'is-on' : ''} onClick={() => setPage(i)} />
        ))}
      </div>
      <div className="btn-row">
        {page > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPage(page - 1)}>{tr('Geri')}</button>}
        {last
          ? <button type="button" className="btn btn-main" onClick={onDone}>{tr('Anladım')}</button>
          : <button type="button" className="btn btn-main" onClick={() => setPage(page + 1)}>{tr('İleri')}</button>}
      </div>
    </SheetFrame>
  );
}

// ------------------------------------------------------------ menü (ana menü gelene kadar)

const levelLabels = (): [Level, string][] => [['kolay', tr('Kolay')], ['normal', tr('Normal')], ['zor', tr('Zor')]];

function Opt({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="opt-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="opt-text"><b>{label}</b><small>{sub}</small></span>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

// Duraklatma menüsü: yerel maçta menü düğmesine basınca açılır; oyun bu sırada durur.
export function PauseSheet({ onResume, onNew, onRestart, onSettings, onHome, onEnd }: {
  onResume: () => void; onNew: () => void; onRestart: () => void; onSettings: () => void; onHome: () => void; onEnd?: () => void;
}) {
  const row = (label: string, on: () => void, main = false) => (
    <button type="button" className={`btn ${main ? 'btn-main' : 'btn-ghost'} pause-btn`} onClick={on}>{label}</button>
  );
  return (
    <SheetFrame label={tr('Duraklatıldı')} onClose={onResume}>
      <div className="sheet-head">
        <div className="sheet-title">{tr('Duraklatıldı')}</div>
        <button type="button" className="round-btn" aria-label={tr('Kapat')} onClick={onResume}><Icon d={ICON.close} size={18} stroke={2.2} /></button>
      </div>
      <div className="pause-list">
        {row(tr('Devam et'), onResume, true)}
        {onEnd && row(tr('Maçı bitir'), onEnd)}
        {row(tr('Yeniden başlat'), onRestart)}
        {row(tr('Yeni oyun'), onNew)}
        {row(tr('Ayarlar'), onSettings)}
        {row(tr('Ana menü'), onHome)}
      </div>
    </SheetFrame>
  );
}

// Maç ayarı: ana menüden "Oyuna başla" ile ve oyun içindeki menü düğmesiyle açılır.
export function SetupSheet({ setup, onStart, onClose, onHome, onRules, onEnd }: {
  setup: Setup; onStart: (s: Setup) => void; onClose: () => void; onHome?: () => void; onRules?: () => void; onEnd?: () => void;
}) {
  const [players, setPlayers] = useState(setup.players);
  const [level, setLevel] = useState<Level>(setup.level);
  const [aiLevel, setAiLevel] = useState<Level>(setup.aiLevel);
  const [personas, setPersonas] = useState(!!setup.personas);
  const [obstacles, setObstacles] = useState(!!setup.obstacles);
  const [teams, setTeams] = useState(!!setup.teams);
  const [pickedSize, setBoardSize] = useState(setup.boardSize);
  // Bot sayısına dokunulmadıysa (null) tahtaya ve oyuncu sayısına göre varsayılan kalabalık kullanılır.
  const [picked, setBots] = useState<number | null>(
    setup.bots === defaultNeutrals(setup.players, Math.max(setup.boardSize, SIZE_BY_STARS[setup.players])) ? null : setup.bots);
  const minSize = SIZE_BY_STARS[players];
  const size = Math.max(pickedSize, minSize);
  const maxBots = maxNeutrals(size);
  const botCount = Math.min(picked ?? defaultNeutrals(players, size), maxBots);
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
      {(
        <>
          <div className="field-label">{tr('TAHTA')}</div>
          <div className="seg" role="radiogroup" aria-label={tr('Tahta boyutu')}>
            {BOARD_SIZES.map(n => (
              <button key={n} type="button" role="radio" aria-checked={size === n} disabled={n < minSize} className={size === n ? 'is-on' : ''} onClick={() => setBoardSize(n)}>
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
      {players > 1 && (
        <>
          <div className="field-label">{tr('RAKİP ZEKÂSI')}</div>
          <div className="seg" role="radiogroup" aria-label={tr('Rakip zekâsı')}>
            {levelLabels().map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={aiLevel === v} className={aiLevel === v ? 'is-on' : ''} onClick={() => setAiLevel(v)}>
                <b>{t}</b>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="field-label">{tr('ARENA BOTU ZEKÂSI')}</div>
      <div className="seg" role="radiogroup" aria-label={tr('Arena botu zekâsı')}>
        {levelLabels().map(([v, t]) => (
          <button key={v} type="button" role="radio" aria-checked={level === v} className={level === v ? 'is-on' : ''} onClick={() => setLevel(v)}>
            <b>{t}</b>
          </button>
        ))}
      </div>
      <div className="field-label">{tr('SEÇENEKLER')}</div>
      <div className="opts">
        {players > 1 && <Opt label={tr('Rakip kişilikleri')} sub={tr('Yapay zekâ rakipler avcı, temkinli ya da fırsatçı oynar.')} on={personas} onChange={setPersonas} />}
        {players === 4 && <Opt label={tr("Takımlı (2'ye 2)")} sub={tr('Karşılıklı köşeler takım olur; takım arkadaşını alamazsın.')} on={teams} onChange={setTeams} />}
        <Opt label={tr('Engel kareleri')} sub={tr('Tahtaya birbirine değmeyen kapalı kareler koyar.')} on={obstacles} onChange={setObstacles} />
      </div>
      <div className="menu-note">
        {players === 1
          ? tr('Sen, aynan İkiz ve {bots} arena botu · tahta {size}×{size}. Bütün botları temizle.', { bots: botCount, size })
          : tr('Sen ve {ai} yapay zekâ oyuncu · tahta {size}×{size} · {bots} arena botu.', { ai: players - 1, size, bots: botCount })}
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
        <button type="button" className="btn btn-main" onClick={() => onStart({ ...setup, players, level, aiLevel, boardSize: size, bots: botCount, daily: null, puzzle: null, personas: players > 1 && personas, obstacles, teams: players === 4 && teams })}>{tr('Başlat')}</button>
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
export function ResultsSheet({ ctl, time, onAgain, againLabel, onClose, onPuzzle }: {
  ctl: GameController; time: string; onAgain?: () => void; againLabel: string; onClose: () => void;
  onPuzzle?: (id: number | null) => void; // bulmaca bitti: sonraki bulmaca (id) ya da liste (null)
}) {
  const st = ctl.state;
  const me = st.seats[ME];
  const won = isWinner(st, ME);
  const [shared, setShared] = useState(false);
  const [linked, setLinked] = useState(false);
  const daily = ctl.setup.daily ?? null;
  const order = ranking(st);
  const lasted = (i: number) => (st.seats[i].out ? st.seats[i].outRound ?? st.round : st.round);
  const pending = st.decided && !st.over;
  const title = won ? tr('Kazandın!') : st.solo ? tr('Alındın') : winnerLine(st, order[0]);
  if (st.puzzle && onPuzzle) {
    const id = ctl.setup.puzzle ?? 1;
    const def = PUZZLES.find(p => p.id === id);
    const stars = won && def ? (st.puzzle.used <= def.par ? 3 : 2) : 0;
    const next = PUZZLES.find(p => p.id === id + 1);
    return (
      <SheetFrame label={tr('Bulmaca')} onClose={onClose}>
        <div className="res-head">
          <div className="res-daily">{tr('Bulmaca {n}', { n: id })}</div>
          <div className="res-title" style={{ color: won ? PLAYER_COLORS[ME] : undefined }}>{won ? tr('Çözüldü!') : tr('Çözülemedi')}</div>
          <div className="puzzle-stars res-stars" aria-label={tr('{n} yıldız', { n: stars })}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div className="res-sub">{tr('{a}/{b} hamle kullandın', { a: st.puzzle.used, b: st.puzzle.limit })}</div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={() => onPuzzle(null)}>{tr('Bulmacalar')}</button>
          <button type="button" className="btn btn-ghost" onClick={() => ctl.restart()}>{tr('Tekrar dene')}</button>
          {won && next && <button type="button" className="btn btn-main" onClick={() => onPuzzle(next.id)}>{tr('Sonraki')}</button>}
        </div>
      </SheetFrame>
    );
  }
  return (
    <SheetFrame label={tr('Maç sonucu')} onClose={onClose}>
      <div className="res-head">
        {daily && <div className="res-daily">{tr('Günlük {date}', { date: daily })}</div>}
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
        {!pending && (
          <button type="button" className="btn btn-ghost" onClick={async () => { const r = await shareResult({ st, time, daily }); setShared(r !== 'shared'); }}>
            {shared ? tr('Kopyalandı') : tr('Paylaş')}
          </button>
        )}
        {!pending && onAgain && <button type="button" className="btn btn-main" onClick={onAgain}>{daily ? tr('Tekrar dene') : againLabel}</button>}
      </div>
      {!pending && ctl.replaySpec() && (
        <button type="button" className="link-btn res-link" onClick={async () => { await shareReplay(ctl); setLinked(true); }}>
          {linked ? tr('Bağlantı kopyalandı') : tr('Maçın tekrarını paylaş')}
        </button>
      )}
    </SheetFrame>
  );
}
