import { Icon } from '../components/bits';
import { SOUND_NAMES, sound } from '../game/haptics';
import './RulesScreen.css';

// Hidden page (#/sounds, not linked anywhere) for choosing sounds: every game sound as recorded and as the old synthesized
// version. A tool for the team, so its few words are not translated.
export function SoundTestScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label="Back" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>Sounds</h1>
      </header>
      <div className="rules-body">
        {SOUND_NAMES.map(n => (
          <div key={n} className="rule set-row">
            <div className="rule-text"><h3>{n}</h3></div>
            <div className="btn-row">
              <button type="button" className="btn btn-main" onClick={() => sound(n)}>New</button>
              <button type="button" className="btn btn-ghost" onClick={() => sound(n, { synth: true })}>Old</button>
            </div>
          </div>
        ))}
        <p className="rules-foot">Recorded sounds: Kenney.nl (CC0). Map them in tools/make-sounds.py.</p>
      </div>
    </div>
  );
}
