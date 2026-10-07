import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../components/bits';
import { feel } from '../game/haptics';
import { paletteOf, saveSettings, settings } from '../game/settings';
import { PieceGlyph } from '../components/PieceGlyph';
import type { Settings } from '../game/settings';
import './RulesScreen.css';
import { Flag } from '../components/Flag';
import { LANGS, setLang, tr, useLang } from '../i18n';
import { SKINS, THEMES, isUnlocked, needProgress, needText } from '../game/themes';
import type { Need } from '../game/themes';
import { SkinFx } from '../components/SkinFx';
import { loadStats } from '../game/stats';

const speeds = (): [Settings['speed'], string, string][] => [
  ['slow', tr('Slow'), tr('Slide 320 ms · bot turn ~2 s')],
  ['normal', tr('Normal'), tr('Slide 220 ms · bot turn ~1.2 s')],
  ['fast', tr('Fast'), tr('Slide 140 ms · bot turn ~0.8 s')],
];

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="rule set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div className="rule-text"><h3>{label}</h3><p>{sub}</p></div>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

// Big preview of a locked style: what it looks like, how it unlocks and the progress.
function PeekCard({ title, need, stats, children, onClose }: { title: string; need: null | Need; stats: ReturnType<typeof loadStats>; children: ReactNode; onClose: () => void }) {
  const have = need ? needProgress({ need }, stats) : 0;
  return (
    <div className="peek" role="status">
      <div className="peek-pv">{children}</div>
      <div className="peek-text">
        <b>{title}</b>
        <span>{tr('Preview · locked')}</span>
        {need && <small>{tr('To unlock: {need}', { need: needText({ need }) })} ({have}/{need.n})</small>}
        {need && <div className="peek-bar" aria-hidden="true"><i style={{ width: `${Math.round((100 * have) / need.n)}%` }} /></div>}
      </div>
      <button type="button" className="round-btn" aria-label={tr('Close')} onClick={onClose}><Icon d="M6 6 L18 18 M18 6 L6 18" size={16} stroke={2.4} /></button>
    </div>
  );
}

// inGame: opened during a match; settings that change the game are hidden (only sound, vibration and language remain).
export function SettingsScreen({ onBack, onRules, inGame = false }: { onBack: () => void; onRules?: () => void; inGame?: boolean }) {
  const lang = useLang();
  const [s, setS] = useState(settings);
  const stats = loadStats();
  // Tapping a locked style doesn't select it; it opens the big preview so players see what they would get.
  const [peek, setPeek] = useState<{ kind: 'skin' | 'theme'; id: string } | null>(null);
  const update = (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); saveSettings(next); };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Settings')}</h1>
      </header>
      <div className="rules-body">
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Language')}</h3><p>{tr('All game text appears in the language you pick.')}</p></div>
          <div className="seg lang-seg" role="radiogroup" aria-label={tr('Language')}>
            {LANGS.map(l => (
              <button key={l.code} type="button" role="radio" aria-checked={lang === l.code} className={lang === l.code ? 'is-on' : ''} aria-label={l.name} title={l.name} onClick={() => setLang(l.code)}>
                <Flag lang={l.code} width={38} />
              </button>
            ))}
          </div>
        </div>
        {onRules && (
          <button type="button" className="rule set-row" onClick={onRules}>
            <div className="rule-text"><h3>{tr('How to play')}</h3><p>{tr('Rules, points and how bonuses are earned.')}</p></div>
          </button>
        )}
        <Toggle label={tr('Sound effects')} sub={tr('Sounds for moves, takes, points, turns, bonuses and match end.')} on={s.sound}
          onChange={v => { update({ sound: v }); if (v) feel('select'); }} />
        <Toggle label={tr('Music')} sub={tr('Tense music that plays in rounds where the arena will shrink.')} on={s.music}
          onChange={v => update({ music: v })} />
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Volume')}</h3></div>
          <input type="range" className="vol" min={0} max={100} value={Math.round(s.volume * 100)} aria-label={tr('Volume')}
            onChange={e => update({ volume: Number(e.target.value) / 100 })} onPointerUp={() => feel('select')} />
        </div>
        <Toggle label={tr('Vibration')} sub={tr("On supported phones. On iPhone the browser doesn't allow vibration.")} on={s.haptics}
          onChange={v => { update({ haptics: v }); if (v) feel('select', 20); }} />
        {!inGame && (
          <>
        <Toggle label={tr('Tips')} sub={tr('Shows a short tip card at the start of your first three matches.')} on={s.tips}
          onChange={v => update({ tips: v })} />
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Animation speed')}</h3><p>{tr('Piece slides, the mode card, the ring collapse: all play at this speed.')}</p></div>
          <div className="seg" role="radiogroup" aria-label={tr('Animation speed')}>
            {speeds().map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={s.speed === v} className={s.speed === v ? 'is-on' : ''} onClick={() => update({ speed: v })}>
                <b>{t}</b>
              </button>
            ))}
          </div>
          <p className="set-note">{speeds().find(x => x[0] === s.speed)?.[2]}</p>
        </div>
        <Toggle label={tr('Play without preview')} sub={tr('Tapping a square plays the move right away. No confirm screen.')} on={s.quick}
          onChange={v => update({ quick: v })} />
        <Toggle label={tr('Play bots fast')} sub={tr("Bot rounds don't wait. Moves are played all at once.")} on={s.fastBots}
          onChange={v => update({ fastBots: v })} />
        <Toggle label={tr('Danger indicator')} sub={tr('Marks squares that pieces able to take you can reach with red stripes.')} on={s.danger}
          onChange={v => update({ danger: v })} />
        <Toggle label={tr('Danger map')} sub={tr('Shows every square where a piece could take you next round in pale red.')} on={s.dangerMap}
          onChange={v => update({ dangerMap: v })} />
        <Toggle label={tr('Bot target marker')} sub={tr("The triangle on a bot's edge shows the color of the player it chases. Always hidden on Hard.")} on={s.targets}
          onChange={v => update({ targets: v })} />
        <Toggle label={tr('Bot order numbers')} sub={tr('When off, numbers show only on the piece playing and the next 3.')} on={s.numbers}
          onChange={v => update({ numbers: v })} />
        <div className="rule set-col">
          <Toggle label={tr('Color assist')} sub={tr('Uses a separate color palette so player colors are easier to tell apart. The emblems already differ.')} on={s.colorBlind}
            onChange={v => update({ colorBlind: v })} />
          <div className="set-swatches" aria-hidden="true">
            {paletteOf(s.colorBlind).map((_, i) => <PieceGlyph key={`${i}${s.colorBlind}`} kind="star" seat={i} size={36} diamond={false} />)}
          </div>
        </div>
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Piece effect')}</h3><p>{tr('Shown on your star. Unlocked by achievements.')}</p></div>
          <div className="theme-grid" role="radiogroup" aria-label={tr('Piece effect')}>
            {SKINS.map(k => {
              const open = isUnlocked(k, stats);
              return (
                <button key={k.id} type="button" role="radio" aria-checked={s.skin === k.id}
                  className={`theme-chip${s.skin === k.id ? ' is-on' : ''}${open ? '' : ' is-locked'}${peek?.id === k.id && peek.kind === 'skin' ? ' is-peek' : ''}`}
                  onClick={() => { if (open) { update({ skin: k.id }); setPeek(null); } else setPeek({ kind: 'skin', id: k.id }); }}>
                  <span className="skin-pv" aria-hidden="true">
                    <PieceGlyph kind="star" seat={0} size={34} diamond={false}><SkinFx id={k.id} /></PieceGlyph>
                    {!open && <Icon d="M7 11 V8 A5 5 0 0 1 17 8 V11 M6 11 H18 V20 H6 Z" size={16} stroke={2.2} />}
                  </span>
                  <b>{k.name()}</b>
                  {!open && k.need && <small>{needText(k)} ({needProgress(k, stats)}/{k.need.n})</small>}
                </button>
              );
            })}
          </div>
          {peek?.kind === 'skin' && (() => {
            const k = SKINS.find(x => x.id === peek.id)!;
            return (
              <PeekCard title={k.name()} need={k.need} stats={stats} onClose={() => setPeek(null)}>
                <PieceGlyph kind="star" seat={0} size={76} diamond={false}><SkinFx id={k.id} /></PieceGlyph>
              </PeekCard>
            );
          })()}
        </div>
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Board theme')}</h3><p>{tr('New themes unlock as you play.')}</p></div>
          <div className="theme-grid" role="radiogroup" aria-label={tr('Board theme')}>
            {THEMES.map(t => {
              const open = isUnlocked(t, stats);
              return (
                <button key={t.id} type="button" role="radio" aria-checked={s.theme === t.id}
                  className={`theme-chip${s.theme === t.id ? ' is-on' : ''}${open ? '' : ' is-locked'}${peek?.id === t.id && peek.kind === 'theme' ? ' is-peek' : ''}`}
                  onClick={() => { if (open) { update({ theme: t.id }); setPeek(null); } else setPeek({ kind: 'theme', id: t.id }); }}>
                  <span className="theme-sw" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${t.square} 50%, ${t.square2} 50%)`, boxShadow: `inset 0 0 0 5px ${t.frameColor}` }}>
                    {!open && <Icon d="M7 11 V8 A5 5 0 0 1 17 8 V11 M6 11 H18 V20 H6 Z" size={16} stroke={2.2} />}
                  </span>
                  <b>{t.name()}</b>
                  {!open && t.need && <small>{needText(t)} ({needProgress(t, stats)}/{t.need.n})</small>}
                </button>
              );
            })}
          </div>
          {peek?.kind === 'theme' && (() => {
            const t = THEMES.find(x => x.id === peek.id)!;
            return (
              <PeekCard title={t.name()} need={t.need} stats={stats} onClose={() => setPeek(null)}>
                <div className="peek-board" style={{ background: t.frameColor }}>
                  {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ background: (Math.floor(i / 7) + i) % 2 ? t.square2 : t.square }} />)}
                  <span className="peek-star"><PieceGlyph kind="star" seat={0} size={22} diamond={false} /></span>
                </div>
              </PeekCard>
            );
          })()}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
