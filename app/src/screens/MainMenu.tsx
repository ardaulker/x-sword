import { useState } from 'react';
import type { Setup } from '../game/controller';
import { Icon } from '../components/bits';
import { dailyStreak, loadDaily } from '../game/daily';
import { SetupSheet } from '../components/Sheets';
import { loadStats } from '../game/stats';
import { useProfile } from '../game/profile';
import { ProfileAvatar } from './ProfileScreen';
import './MainMenu.css';
import { tr } from '../i18n';

// Octagon squares in the background: strong in the middle, fading toward the edges.
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
      {/* The middle mark turns right and left once a second: from x to plus and back. */}
      <path className="logo-x" d="M84 84 L116 116 M116 84 L84 116" stroke="#0B1026" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

// What "Quick match" starts: the last used settings (the defaults for a new player), in a few words.
function quickSummary(s: Setup) {
  const level = s.level === 'easy' ? tr('Easy') : s.level === 'hard' ? tr('Hard') : tr('Normal');
  const players = s.players === 1 ? tr('Solo') : tr('{n} players', { n: s.players });
  return `${players} · ${level} · ${s.boardSize}×${s.boardSize}`;
}

export function MainMenu({ setup, onStart, onResume, resumeInfo, onTutorial, onProfile, onPuzzles, onStats, onDaily, onRules, onMultiplayer, onSettings }: {
  setup: Setup; onStart: (s: Setup) => void; onResume?: () => void; resumeInfo?: { round: number; score: number }; onTutorial?: () => void; onProfile?: () => void; onPuzzles?: () => void; onStats?: () => void; onDaily?: () => void; onRules?: () => void; onMultiplayer?: () => void; onSettings?: () => void;
}) {
  const [setupOpen, setSetupOpen] = useState(false);
  const profile = useProfile();
  const best = loadDaily();
  const streak = dailyStreak();
  const stats = loadStats();
  // New players are offered the tutorial: three mini puzzles, about one minute.
  const suggestTutorial = !!onTutorial && !stats.puzzleStars[201] && stats.matches < 3 && !onResume;
  const demoted = !!onResume || suggestTutorial; // keep a single big green button
  return (
    <div className="menu">
      <div className="menu-deco" aria-hidden="true">
        {DECO.map((o, i) => <div key={i} style={{ opacity: o }} />)}
      </div>

      {onProfile && (
        <button type="button" className="menu-profile" onClick={onProfile} aria-label={tr('Profile: {name}', { name: profile.name })}>
          <ProfileAvatar profile={profile} size={30} />
          <span>{profile.name}</span>
        </button>
      )}

      <div className="menu-hero">
        <XSwordLogo size={150} />
        <h1 className="menu-title">X SWORD</h1>
        <div className="menu-pill">
          <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true"><polygon points="17,17 83,17 83,83 17,83" fill="none" stroke="#E9F0FF" strokeWidth="10" /></svg>
          <span>{tr('Direction changes hands every round.')}</span>
          <svg width="16" height="16" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="#E9F0FF" strokeWidth="10" /></svg>
        </div>
      </div>

      <nav className="menu-actions" aria-label={tr('Main menu')}>
        {suggestTutorial && (
          <button type="button" className="menu-play menu-tutorial" onClick={onTutorial}>
            <Icon d="M12 3 L14.5 9 L21 9.5 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.5 L9.5 9 Z" size={26} fill="#0B1026" />
            <span className="menu-play-text">
              <b>{tr('Tutorial · 1 minute')}</b>
              <span>{tr('Learn the rules with three mini puzzles')}</span>
            </span>
          </button>
        )}
        {onResume && (
          <button type="button" className="menu-play" onClick={onResume}>
            <Icon d="M7 4.5 L19 12 L7 19.5 Z" size={26} fill="#0B1026" />
            <span className="menu-play-text">
              <b>{tr('Continue')}</b>
              <span>{tr('Paused match · Round {n} · {p} pts', { n: resumeInfo?.round ?? 1, p: resumeInfo?.score ?? 0 })}</span>
            </span>
          </button>
        )}
        <button type="button" className={demoted ? 'menu-btn menu-daily' : 'menu-play'} onClick={() => onStart({ ...setup, daily: null, puzzle: null })}>
          <Icon d="M7 4.5 L19 12 L7 19.5 Z" size={demoted ? 20 : 26} fill={demoted ? 'currentColor' : '#0B1026'} />
          <span className="menu-play-text">
            <b>{tr('Quick match')}</b>
            <span>{quickSummary(setup)}</span>
          </span>
        </button>
        {onDaily && (
          <button type="button" className="menu-btn menu-daily" onClick={onDaily}>
            <Icon d="M7 3 V6 M17 3 V6 M4 9 H20 M5 5 H19 A1 1 0 0 1 20 6 V19 A1 1 0 0 1 19 20 H5 A1 1 0 0 1 4 19 V6 A1 1 0 0 1 5 5 Z" size={20} stroke={2.2} />
            <span className="menu-play-text"><b>{tr('Daily challenge')}</b><span>{best ? tr('Your best today: {n} pts', { n: best.score }) : tr('Everyone plays the same board today')}{streak.days > 0 && ` · ${tr('{n} day streak', { n: streak.days })}${streak.playedToday ? ' ✓' : ''}`}</span></span>
          </button>
        )}
        <div className="menu-row">
          <button type="button" className="menu-btn" onClick={onPuzzles}>
            <Icon d="M10 3 H14 V6 A2 2 0 1 0 18 6 V3 H21 V9 H18 A2 2 0 1 0 18 13 H21 V21 H3 V13 H6 A2 2 0 1 1 6 9 H3 V3 Z" size={20} stroke={2} />
            <span>{tr('Puzzles')}</span>
          </button>
          <button type="button" className="menu-btn" onClick={onStats}>
            <Icon d="M5 20 V11 M12 20 V4 M19 20 V14" size={20} stroke={2.4} />
            <span>{tr('Statistics')}</span>
          </button>
        </div>
        <div className="menu-row">
          <button type="button" className="menu-btn" disabled={!onMultiplayer} onClick={onMultiplayer}>
            <Icon d="M9 11 A4 4 0 1 0 9.01 11 Z M2 21 C2 17 5 15 9 15 C11 15 12.5 15.5 13.5 16.3 M19 8 V14 M16 11 H22" size={20} stroke={2.2} />
            <span>{tr('Multiplayer')}</span>
            {!onMultiplayer && <span className="menu-soon">{tr('Soon')}</span>}
          </button>
          <button type="button" className="menu-btn" disabled={!onRules} onClick={onRules}>
            <Icon d="M12 3 A9 9 0 1 1 11.99 3 Z M9.5 9.5 a2.5 2.5 0 1 1 3.5 2.3 c-.7 .3 -1 .9 -1 1.7 M12 17 v.2" size={20} stroke={2.2} />
            <span>{tr('How to play')}</span>
            {!onRules && <span className="menu-soon">{tr('Soon')}</span>}
          </button>
        </div>
        <div className="menu-row">
          <button type="button" className="menu-link" onClick={() => setSetupOpen(true)}>
            <Icon d="M4 4 H20 V20 H4 Z M4 12 H20 M12 4 V20" size={18} stroke={2} />
            <span>{tr('Custom game')}</span>
          </button>
          <button type="button" className="menu-link" disabled={!onSettings} onClick={onSettings}>
            <Icon d="M4 7 H14 M18 7 H20 M4 17 H8 M12 17 H20 M16 5 V9 M10 15 V19" size={18} />
            <span>{tr('Settings')}</span>
          </button>
        </div>
      </nav>

      {setupOpen && <SetupSheet setup={setup} onStart={onStart} onClose={() => setSetupOpen(false)} />}
    </div>
  );
}
