import { useState } from 'react';
import { Icon } from '../components/bits';
import { AVATAR_COLORS, NAME_MAX, providerLabel, updateProfile, useProfile } from '../game/profile';
import type { Profile } from '../game/profile';
import { importProgress, progressCode } from '../game/progress';
import { platform } from '../game/platform';
import { loadStats } from '../game/stats';
import { tr } from '../i18n';
import './RulesScreen.css';

// Round profile badge: the name's initial in the profile color.
export function ProfileAvatar({ profile, size }: { profile: Pick<Profile, 'name' | 'color'>; size: number }) {
  const initial = (profile.name.trim()[0] ?? '?').toLocaleUpperCase('tr');
  return (
    <span className="avatar" aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46), background: AVATAR_COLORS[profile.color] ?? AVATAR_COLORS[0] }}>
      {initial}
    </span>
  );
}

export function ProfileScreen({ onBack, onStats }: { onBack: () => void; onStats: () => void }) {
  const p = useProfile();
  const [name, setName] = useState(p.name);
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState<'' | 'ok' | 'bad'>('');
  const s = loadStats();
  const stars = Object.values(s.puzzleStars).reduce((a, b) => a + b, 0);
  const native = platform() !== 'web';

  const copy = async () => {
    try { await navigator.clipboard.writeText(progressCode()); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* no permission */ }
  };
  const load = () => {
    const ok = importProgress(paste);
    setResult(ok ? 'ok' : 'bad');
    if (ok) setPaste('');
  };

  return (
    <div className="rules">
      <header className="rules-head">
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <h1>{tr('Profile')}</h1>
      </header>
      <div className="rules-body">
        <div className="rule set-col profile-card">
          <div className="profile-top">
            <ProfileAvatar profile={{ name: name || p.name, color: p.color }} size={64} />
            <label className="profile-name">
              <span>{tr('Display name')}</span>
              <input value={name} maxLength={NAME_MAX} autoComplete="nickname" spellCheck={false}
                onChange={e => setName(e.target.value)} onBlur={() => { updateProfile({ name }); setName(n => n.trim() || p.name); }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            </label>
          </div>
          <div className="profile-colors" role="radiogroup" aria-label={tr('Color')}>
            {AVATAR_COLORS.map((c, i) => (
              <button key={c} type="button" role="radio" aria-checked={p.color === i} aria-label={`${tr('Color')} ${i + 1}`}
                className={`profile-color${p.color === i ? ' is-on' : ''}`} style={{ background: c }} onClick={() => updateProfile({ color: i })} />
            ))}
          </div>
          <p className="set-note">{tr('In multiplayer, opponents only see your name and color.')}</p>
        </div>

        <div className="rule set-col">
          <div className="rule-text">
            <h3>{tr('Account')}</h3>
            <p><b>{providerLabel(p.provider)}</b>{p.providerName ? ` · ${p.providerName}` : ''}</p>
            <p>{p.provider === 'guest'
              ? (native ? tr("Couldn't connect to your account. Your progress is kept on this device.") : tr('Guest profile on this device. In the phone app it signs in automatically with Game Center on iPhone and Google Play Games on Android, and your progress is saved to your account.'))
              : tr("Your progress is saved to your account; open the game with the same account on a new phone and you'll pick up where you left off.")}</p>
          </div>
        </div>

        <div className="rule set-col">
          <div className="rule-text"><h3>{tr('Progress')}</h3></div>
          <div className="profile-stats">
            <div><b>{s.matches}</b><span>{tr('Matches')}</span></div>
            <div><b>{s.wins}</b><span>{tr('Wins')}</span></div>
            <div><b>{stars} ★</b><span>{tr('Puzzle stars')}</span></div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onStats}>{tr('Statistics')}</button>
        </div>

        <div className="rule set-col">
          <div className="rule-text">
            <h3>{tr('Progress backup')}</h3>
            <p>{tr("Copy the code, paste it here on the other device and load it. Both devices' progress is merged; nothing is deleted.")}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? tr('Copied') : tr('Copy backup code')}</button>
          <textarea className="profile-paste" rows={2} value={paste} placeholder={tr('Paste the backup code here')}
            onChange={e => { setPaste(e.target.value); setResult(''); }} />
          <button type="button" className="btn btn-main" disabled={!paste.trim()} onClick={load}>{tr('Load code')}</button>
          {result && <p className={`set-note${result === 'bad' ? ' is-bad' : ''}`}>{result === 'ok' ? tr('Progress loaded and merged.') : tr("This code couldn't be read.")}</p>}
        </div>
        <p className="rules-foot">{tr("Your profile isn't sent to any server.")}</p>
      </div>
    </div>
  );
}
