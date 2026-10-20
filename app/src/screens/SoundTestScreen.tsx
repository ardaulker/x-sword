import { Icon } from '../components/bits';
import { useState } from 'react';
import { SOUND_NAMES, preloadSounds, sound, strike } from '../game/haptics';
import { SOUND_THEMES, saveSettings, settings } from '../game/settings';
import './RulesScreen.css';

// Hidden page (#/sounds, not linked anywhere) for choosing sounds: every game sound as recorded and as the old synthesized
// version, per sound theme. A tool for the team, so its few words are not translated.
export function SoundTestScreen({ onBack }: { onBack: () => void }) {
  const [theme, setTheme] = useState(settings.soundTheme);
  const pick = (t: typeof theme) => { setTheme(t); saveSettings({ ...settings, soundTheme: t }); preloadSounds(); };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label="Back" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>Sounds</h1>
      </header>
      <div className="rules-body">
        <div className="seg" role="radiogroup" aria-label="Sound theme">
          {SOUND_THEMES.map(t => (
            <button key={t} type="button" role="radio" aria-checked={theme === t} className={theme === t ? 'is-on' : ''} onClick={() => pick(t)}><b>{t}</b></button>
          ))}
        </div>
        <div className="rule set-row">
          <div className="rule-text"><h3>Three quick takes</h3></div>
          <button type="button" className="btn btn-main" onClick={() => { strike(false); setTimeout(() => strike(false), 150); setTimeout(() => strike(true), 300); }}>Play</button>
        </div>
        {SOUND_NAMES.map(n => (
          <div key={n} className="rule set-row">
            <div className="rule-text"><h3>{n}</h3></div>
            <div className="btn-row">
              <button type="button" className="btn btn-main" onClick={() => sound(n)}>New</button>
              <button type="button" className="btn btn-ghost" onClick={() => sound(n, { synth: true })}>Old</button>
            </div>
          </div>
        ))}
        <p className="rules-foot">Recorded sounds: Kenney.nl (CC0). Map them in tools/make-sounds.py (a theme's files go to sounds/&lt;theme&gt;/, the laser sword's to sounds/energy/).</p>
      </div>
    </div>
  );
}
