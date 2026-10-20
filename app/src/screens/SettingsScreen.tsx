import { useState } from 'react';
import { Icon } from '../components/bits';
import { feel, preloadSounds, sound } from '../game/haptics';
import { SOUND_THEMES, paletteOf, saveSettings, settings } from '../game/settings';
import { PieceGlyph } from '../components/PieceGlyph';
import type { Settings } from '../game/settings';
import './RulesScreen.css';
import { Flag } from '../components/Flag';
import { LANGS, setLang, tr, useLang } from '../i18n';
import { SkinPicker, ThemePicker } from '../components/SkinPicker';

const speeds = (): [Settings['speed'], string, string][] => [
  ['slow', tr('Slow'), tr('Slide 320 ms · bot turn ~2 s')],
  ['normal', tr('Normal'), tr('Slide 220 ms · bot turn ~1.2 s')],
  ['fast', tr('Fast'), tr('Slide 140 ms · bot turn ~0.8 s')],
];

const soundThemeName = (t: Settings['soundTheme']) => (t === 'future' ? tr('Futuristic') : t === 'energy' ? tr('Energy blade') : tr('Classic'));

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="rule set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div className="rule-text"><h3>{label}</h3><p>{sub}</p></div>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

// inGame: opened during a match; settings that change the game are hidden (only sound, vibration and language remain).
export function SettingsScreen({ onBack, onRules, onLegal, inGame = false }: { onBack: () => void; onRules?: () => void; onLegal?: () => void; inGame?: boolean }) {
  const lang = useLang();
  const [s, setS] = useState(settings);
  // Tapping a locked style doesn't select it; it opens the big preview so players see what they would get.
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
          <div className="rule-text"><h3>{tr('Sound theme')}</h3><p>{tr('Sword strokes, takes and the shrink music change with the theme.')}</p></div>
          <div className="seg" role="radiogroup" aria-label={tr('Sound theme')}>
            {SOUND_THEMES.map(t => (
              <button key={t} type="button" role="radio" aria-checked={s.soundTheme === t} className={s.soundTheme === t ? 'is-on' : ''}
                onClick={() => { update({ soundTheme: t }); preloadSounds(); setTimeout(() => sound('slashBig'), 250); }}>
                <b>{soundThemeName(t)}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Volume')}</h3></div>
          <input type="range" className="vol" min={0} max={100} value={Math.round(s.volume * 100)} aria-label={tr('Volume')}
            onChange={e => update({ volume: Number(e.target.value) / 100 })} onPointerUp={() => feel('select')} />
        </div>
        <Toggle label={tr('Vibration')} sub={tr("On supported phones. On iPhone the browser doesn't allow vibration.")} on={s.haptics}
          onChange={v => { update({ haptics: v }); if (v) feel('select', 20); }} />
        {/* A play-style choice, so it is also offered from the in-match menu. On by default (Arda, 19 Oct 2026); turning it off brings back the preview + confirm step. */}
        <Toggle label={tr('One-tap moves')} sub={tr('Tapping a square plays the move right away. No confirm screen.')} on={s.quick}
          onChange={v => update({ quick: v })} />
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
        <SkinPicker skin={s.skin} onPick={skin => update({ skin })} />
        <ThemePicker theme={s.theme} onPick={theme => update({ theme })} />
          </>
        )}
        {onLegal && (
          <button type="button" className="rule set-row" onClick={onLegal}>
            <div className="rule-text"><h3>{tr('Legal documents')}</h3><p>{tr('Privacy policy, terms of use and what we do with data.')}</p></div>
            <Icon d="M9 5 L16 12 L9 19" size={18} stroke={2.4} />
          </button>
        )}
      </div>
    </div>
  );
}
