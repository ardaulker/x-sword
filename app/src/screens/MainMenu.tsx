import { useState } from 'react';
import type { Setup } from '../game/controller';
import { Icon } from '../components/bits';
import { SetupSheet } from '../components/Sheets';
import './MainMenu.css';

// Arka plandaki sekizgen kareler: ortada belirgin, kenarlara doğru söner.
const DECO = Array.from({ length: 63 }, (_, i) => {
  const r = Math.floor(i / 9), c = i % 9;
  return Math.max(0.06, 0.55 - Math.hypot(r - 3, c - 4) * 0.11);
});

export function XSwordLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={{ overflow: 'visible' }}>
      <rect x="44" y="44" width="112" height="112" rx="6" fill="#0B1026" stroke="#E9F0FF" strokeWidth="7" />
      <polygon points="100,21 179,100 100,179 21,100" fill="none" stroke="#3BFF8F" strokeWidth="7" strokeLinejoin="round" />
      <polygon points="86,66 114,66 134,86 134,114 114,134 86,134 66,114 66,86" fill="#3BFF8F" />
      <path d="M84 84 L116 116 M116 84 L84 116" stroke="#0B1026" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function MainMenu({ setup, onStart, onRules }: { setup: Setup; onStart: (s: Setup) => void; onRules?: () => void }) {
  const [setupOpen, setSetupOpen] = useState(false);
  return (
    <div className="menu">
      <div className="menu-deco" aria-hidden="true">
        {DECO.map((o, i) => <div key={i} style={{ opacity: o }} />)}
      </div>

      <div className="menu-hero">
        <XSwordLogo size={150} />
        <h1 className="menu-title">X SWORD</h1>
        <div className="menu-pill">
          <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true"><polygon points="17,17 83,17 83,83 17,83" fill="none" stroke="#E9F0FF" strokeWidth="10" /></svg>
          <span>Her tur değişir: düz, sonra çapraz</span>
          <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#E9F0FF" strokeWidth="10" /></svg>
        </div>
      </div>

      <nav className="menu-actions" aria-label="Ana menü">
        <button type="button" className="menu-play" onClick={() => setSetupOpen(true)}>
          <Icon d="M7 4.5 L19 12 L7 19.5 Z" size={26} fill="#0B1026" />
          <span className="menu-play-text">
            <b>Oyuna başla</b>
            <span>Botlara karşı · tek ya da 2–4 oyuncu</span>
          </span>
        </button>
        <div className="menu-row">
          <button type="button" className="menu-btn" disabled aria-describedby="soon-mp">
            <Icon d="M9 11 A4 4 0 1 0 9.01 11 Z M2 21 C2 17 5 15 9 15 C11 15 12.5 15.5 13.5 16.3 M19 8 V14 M16 11 H22" size={20} stroke={2.2} />
            <span>Çok oyunculu</span>
            <span className="menu-soon" id="soon-mp">Yakında</span>
          </button>
          <button type="button" className="menu-btn" disabled={!onRules} onClick={onRules}>
            <Icon d="M12 3 A9 9 0 1 1 11.99 3 Z M9.5 9.5 a2.5 2.5 0 1 1 3.5 2.3 c-.7 .3 -1 .9 -1 1.7 M12 17 v.2" size={20} stroke={2.2} />
            <span>Nasıl oynanır?</span>
            {!onRules && <span className="menu-soon">Yakında</span>}
          </button>
        </div>
        <button type="button" className="menu-link" disabled>
          <Icon d="M4 7 H14 M18 7 H20 M4 17 H8 M12 17 H20 M16 5 V9 M10 15 V19" size={18} />
          <span>Ayarlar</span>
          <span className="menu-soon">Yakında</span>
        </button>
      </nav>

      {setupOpen && <SetupSheet setup={setup} onStart={onStart} onClose={() => setSetupOpen(false)} />}
    </div>
  );
}
