import { useState } from 'react';
import { Icon } from '../components/bits';
import { feel } from '../game/haptics';
import { paletteOf, saveSettings, settings } from '../game/settings';
import { PieceGlyph } from '../components/PieceGlyph';
import type { Settings } from '../game/settings';
import './RulesScreen.css';

const SPEEDS: [Settings['speed'], string, string][] = [
  ['yavas', 'Yavaş', 'Kayma 320 ms · bot turu ~2 sn'],
  ['normal', 'Normal', 'Kayma 220 ms · bot turu ~1,2 sn'],
  ['hizli', 'Hızlı', 'Kayma 140 ms · bot turu ~0,8 sn'],
];

function Toggle({ label, sub, on, onChange }: { label: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="rule set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <div className="rule-text"><h3>{label}</h3><p>{sub}</p></div>
      <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true"><span /></span>
    </button>
  );
}

export function SettingsScreen({ onBack, onRules }: { onBack: () => void; onRules?: () => void }) {
  const [s, setS] = useState(settings);
  const update = (patch: Partial<Settings>) => { const next = { ...s, ...patch }; setS(next); saveSettings(next); };
  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label="Geri" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>Ayarlar</h1>
      </header>
      <div className="rules-body">
        {onRules && (
          <button type="button" className="rule set-row" onClick={onRules}>
            <div className="rule-text"><h3>Nasıl oynanır?</h3><p>Kurallar, puanlar ve bonusların nasıl kazanıldığı.</p></div>
          </button>
        )}
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
          <p className="set-note">{SPEEDS.find(x => x[0] === s.speed)?.[2]}</p>
        </div>
        <Toggle label="Tehlike göstergesi" sub="Seni alabilecek taşların karelerini kırmızı çizgiyle gösterir." on={s.danger}
          onChange={v => update({ danger: v })} />
        <Toggle label="Bot hedef işareti" sub="Botun kenarındaki üçgen, kovaladığı oyuncunun renginde. Zor modda hep gizli." on={s.targets}
          onChange={v => update({ targets: v })} />
        <Toggle label="Bot sıra numaraları" sub="Kapalıyken numara yalnız oynayan ve sıradaki 3 taşta görünür." on={s.numbers}
          onChange={v => update({ numbers: v })} />
        <div className="rule set-col">
          <Toggle label="Renk körü modu" sub="Oyuncu renkleri birbirinden daha kolay ayrılır. Amblemler zaten farklı." on={s.colorBlind}
            onChange={v => update({ colorBlind: v })} />
          <div className="set-swatches" aria-hidden="true">
            {paletteOf(s.colorBlind).map((_, i) => <PieceGlyph key={`${i}${s.colorBlind}`} kind="star" seat={i} size={36} diamond={false} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
