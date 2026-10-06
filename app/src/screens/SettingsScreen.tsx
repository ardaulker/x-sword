import { useState } from 'react';
import { Icon } from '../components/bits';
import { feel } from '../game/haptics';
import { saveSettings, settings } from '../game/settings';
import type { Settings } from '../game/settings';
import './RulesScreen.css';

const SPEEDS: [Settings['speed'], string][] = [['yavas', 'Yavaş'], ['normal', 'Normal'], ['hizli', 'Hızlı']];

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="rule set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div className="rule-text"><h3>{label}</h3><p>{sub}</p></div>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState(settings);
  const update = (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); saveSettings(next); };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label="Geri" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>Ayarlar</h1>
      </header>
      <div className="rules-body">
        <Toggle label="Ses" sub="Hamle, alma, puan, sıra, bonus ve maç sonu sesleri." on={s.sound}
          onChange={v => { update({ sound: v }); if (v) feel('select'); }} />
        <Toggle label="Titreşim" sub="Desteklenen telefonlarda. iPhone'da tarayıcı titreşime izin vermez." on={s.haptics}
          onChange={v => { update({ haptics: v }); if (v) feel('select', 20); }} />
        <div className="rule set-col">
          <div className="rule-text"><h3>Animasyon hızı</h3><p>Taş kayması, mod kartı, halka çöküşü: hepsi bu hızla oynar.</p></div>
          <div className="seg" role="radiogroup" aria-label="Animasyon hızı">
            {SPEEDS.map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={s.speed === v} className={s.speed === v ? 'is-on' : ''} onClick={() => update({ speed: v })}>
                <b>{t}</b>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
