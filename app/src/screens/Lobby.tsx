import { useEffect, useState, useSyncExternalStore } from 'react';
import { BOARD_SIZES, SIZE_BY_STARS, defaultNeutrals, maxNeutrals } from '../../../engine/rules.js';
import type { Level } from '../../../engine/rules.js';
import { Icon } from '../components/bits';
import { PieceGlyph } from '../components/PieceGlyph';
import { Opt } from '../components/Sheets';
import { cleanCode, isCode } from '../net/protocol';
import { directory } from '../net/directory';
import type { RoomAd } from '../net/directory';
import { AVATAR_COLORS } from '../game/profile';
import { GuestRoom, HostRoom, lobbySize } from '../net/room';
import type { AnyRoom } from '../net/room';
import './Lobby.css';
import { tr } from '../i18n';

const levels = (): [Level, string][] => [['easy', tr('Easy')], ['normal', tr('Normal')], ['hard', tr('Hard')]];

export const inviteLink = (code: string) =>
  `${location.origin}${location.pathname}#/join/${code}`;

// ------------------------------------------------------------ entry: create a room or join by code

// The open rooms other players made public. Empty while there is no room board (see net/directory.ts).
function useOpenRooms() {
  const [ads, setAds] = useState<RoomAd[]>([]);
  useEffect(() => (directory ? directory.watch(list => setAds([...list].sort((a, b) => b.seats - a.seats))) : undefined), []);
  return ads;
}

function RoomRow({ ad, onJoin }: { ad: RoomAd; onJoin: (code: string) => void }) {
  const level = ad.level === 'easy' ? tr('Easy') : ad.level === 'hard' ? tr('Hard') : tr('Normal');
  const tags = [ad.obstacles && tr('Obstacles'), ad.personas && tr('Characters'), ad.teams && tr('Teams')].filter(Boolean);
  const full = ad.seats >= 4;
  return (
    <li className="room-row">
      <span className="room-dot" style={{ background: AVATAR_COLORS[ad.color] }} aria-hidden="true" />
      <div className="room-info">
        <b>{ad.host}</b>
        <span>{[`${ad.seats}/4`, `${ad.size}×${ad.size}`, level, ...tags].join(' · ')}</span>
      </div>
      <button type="button" className="btn btn-main room-join" disabled={full} onClick={() => onJoin(ad.code)}>{full ? tr('Full') : tr('Join')}</button>
    </li>
  );
}

export function MultiplayerEntry({ onHost, onJoin, onBack, error }: {
  onHost: (isPublic: boolean) => void; onJoin: (code: string) => void; onBack: () => void; error: string;
}) {
  const [code, setCode] = useState('');
  const [isPublic, setPublic] = useState(true);
  const ads = useOpenRooms();
  const ok = isCode(code);
  return (
    <div className="lobby">
      <header className="lobby-head">
        <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <div className="lobby-titles"><h1>{tr('Multiplayer')}</h1><span>{tr('On the same board as your friends')}</span></div>
      </header>
      <div className="lobby-body">
        <button type="button" className="menu-play" onClick={() => onHost(isPublic && !!directory)}>
          <Icon d="M12 5 V19 M5 12 H19" size={26} stroke={2.6} color="#0B1026" />
          <span className="menu-play-text"><b>{tr('Create room')}</b><span>{tr('Share the code and your friends join')}</span></span>
        </button>
        {directory && <Opt label={tr('Show in the public lobby')} sub={tr('Anyone can find your room with your name and board settings.')} on={isPublic} onChange={setPublic} />}
        {directory && (
          <section className="rooms" aria-label={tr('Open rooms')}>
            <div className="field-label">{tr('OPEN ROOMS')}</div>
            {ads.length
              ? <ul className="room-list">{ads.map(ad => <RoomRow key={ad.code} ad={ad} onJoin={onJoin} />)}</ul>
              : <p className="lobby-note">{tr('No open rooms right now. Create one and others can join.')}</p>}
          </section>
        )}
        <form className="join" onSubmit={e => { e.preventDefault(); if (ok) onJoin(code); }}>
          <label htmlFor="join-code">{tr('ROOM CODE')}</label>
          <input
            id="join-code" value={code} onChange={e => setCode(cleanCode(e.target.value))}
            placeholder="K7Q2M" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text"
          />
          <button type="submit" className="btn btn-main" disabled={!ok}>{tr('Join room')}</button>
        </form>
        {error && <p className="lobby-error" role="alert">{error}</p>}
        <p className="lobby-note">{tr("The connection goes phone to phone; no account needed. The host's phone runs the match; if it leaves, the match ends.")}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ lobby

export function LobbyScreen({ room, onLeave, onStart }: { room: AnyRoom; onLeave: () => void; onStart: () => void }) {
  const v = useSyncExternalStore(room.subscribe, room.getSnapshot);
  const hostRoom = room instanceof HostRoom ? room : null;
  const guestRoom = room instanceof GuestRoom ? room : null;
  const host = !!hostRoom;
  const filled = Math.min(4, Math.max(2, v.seats.filter(s => s.kind !== 'empty').length));
  const minSize = SIZE_BY_STARS[filled];
  const size = lobbySize(v);
  const maxBots = maxNeutrals(size);
  const botCount = Math.min(v.bots ?? defaultNeutrals(filled, size), maxBots);
  const [copied, setCopied] = useState(false);
  const me = v.seats[v.you];
  const link = v.code ? inviteLink(v.code) : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* silent without permission */ }
  };
  const share = () => {
    const text = tr('Join me in X Sword! Room code: {code}', { code: v.code });
    if (navigator.share) navigator.share({ title: 'X Sword', text, url: link }).catch(() => {});
    else copy();
  };

  if (v.status === 'connecting' || v.status === 'error' || v.status === 'closed') {
    return (
      <div className="lobby">
        <header className="lobby-head">
          <button type="button" className="round-btn" aria-label={tr('Back')} onClick={onLeave}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
          <div className="lobby-titles"><h1>{tr('Lobby')}</h1><span>{host ? tr('Creating room') : tr('Room {code}', { code: v.code })}</span></div>
        </header>
        <div className="lobby-body lobby-center">
          {v.status === 'connecting'
            ? <><div className="lobby-spin" aria-hidden="true" /><p>{host ? tr('Opening room…') : tr('Connecting to room…')}</p></>
            : <><p className="lobby-error" role="alert">{v.error || tr('The room closed.')}</p><button type="button" className="btn btn-ghost" onClick={onLeave}>{tr('Go back')}</button></>}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <button type="button" className="round-btn" aria-label={tr('Leave room')} onClick={onLeave}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <div className="lobby-titles"><h1>{tr('Lobby')}</h1><span>{host ? tr('You created the room') : tr('Wait for the host to start')}</span></div>
        <button type="button" className="lobby-code" onClick={copy} aria-label={tr('Room code {code}, copy link', { code: v.code })}>
          <span>{v.code}</span>
          <Icon d={copied ? 'M5 12.5 L10 17 L19 7' : 'M9 9 H19 V19 H9 Z M5 15 V5 H15'} size={16} stroke={2} />
        </button>
      </header>

      <div className="lobby-body">
        {host && directory && <Opt label={tr('Public room')} sub={tr('Anyone can find this room in the lobby.')} on={v.isPublic} onChange={x => hostRoom?.setPublic(x)} />}
        {host && (
          <div className="lobby-invite">
            <a className="btn lobby-wa" href={`https://wa.me/?text=${encodeURIComponent(tr('Join me in X Sword! {code}', { code: link }))}`} target="_blank" rel="noreferrer">
              {tr('Invite via WhatsApp')}
            </a>
            <div className="lobby-invite-row">
              <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? tr('Copied') : tr('Copy link')}</button>
              <button type="button" className="btn btn-ghost" onClick={share}>{tr('Share')}</button>
            </div>
          </div>
        )}

        <div className="seats">
          {v.seats.map((s, i) => {
            const filled = s.kind !== 'empty';
            // Empty seats are skipped in the match: number and color follow the match order.
            const n = v.seats.slice(0, i).filter(x => x.kind !== 'empty').length;
            const tag = s.kind === 'host' ? tr('Host') : s.kind === 'bot' ? tr('AI') : tr('Player');
            return (
              <div key={i} className={`seat${filled ? '' : ' is-empty'}${i === v.you ? ' is-me' : ''}`}>
                {filled ? (
                  <>
                    <div className="seat-top">
                      <PieceGlyph kind="star" seat={n} size={32} diamond={false} />
                      <div className="seat-names">
                        <b>{i === v.you ? `${tr('You')} · ${s.name ?? tr('Player {n}', { n: n + 1 })}` : s.name ?? tr('Player {n}', { n: n + 1 })}</b>
                        <span>{tag}</span>
                      </div>
                    </div>
                    <div className="seat-bottom">
                      <span className={`seat-ready${s.ready ? ' is-ready' : ''}`}>{s.ready ? tr('Ready') : tr('Waiting')}</span>
                      {host && i !== v.you && (
                        <button type="button" className="seat-x" aria-label={tr('Clear seat')} onClick={() => hostRoom?.clearSeat(i)}>
                          <Icon d="M6 6 L18 18 M18 6 L6 18" size={14} stroke={2.4} />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="seat-empty">{tr('Empty seat')}</span>
                    {host
                      ? <button type="button" className="seat-add" onClick={() => hostRoom?.addBot(i)}>{tr('+ Add AI')}</button>
                      : <span className="seat-wait">{tr('Waiting for invite')}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="field-label">{tr('BOARD')}</div>
        <div className="seg" role="radiogroup" aria-label={tr('Board size')}>
          {BOARD_SIZES.map(n => (
            <button key={n} type="button" role="radio" aria-checked={size === n} disabled={!host || n < minSize}
              className={size === n ? 'is-on' : ''} onClick={() => hostRoom?.setSize(n)}>
              <b>{n}×{n}</b>
            </button>
          ))}
        </div>
        <div className="field-label">{tr('ARENA BOTS: {n}', { n: botCount })}</div>
        <div className="bots-row">
          <input type="range" min={2} max={maxBots} value={botCount} disabled={!host} aria-label={tr('Number of arena bots')}
            onChange={e => hostRoom?.setBots(Number(e.target.value))} />
          {host && <button type="button" className="btn btn-ghost bots-max" onClick={() => hostRoom?.setBots(maxBots)}>{tr('Max {n}', { n: maxBots })}</button>}
        </div>

        <div className="field-label">{tr('OPTIONS')}</div>
        <div className="lobby-opts">
          <Opt label={tr('Bot characters')} sub={tr('AI rivals play as a hunter, a cautious one or an opportunist.')} on={v.opts.personas} onChange={x => host && hostRoom?.setOpts({ personas: x })} />
          <Opt label={tr('Obstacle squares')} sub={tr('Places blocked squares on the board that never touch each other.')} on={v.opts.obstacles} onChange={x => host && hostRoom?.setOpts({ obstacles: x })} />
          {filled === 4 && <Opt label={tr('Teams (2 vs 2)')} sub={tr("Opposite corners form a team; you can't take your teammate.")} on={v.opts.teams} onChange={x => host && hostRoom?.setOpts({ teams: x })} />}
        </div>

        <div className="field-label">{tr('BOT DIFFICULTY')}</div>
        <div className="seg" role="radiogroup" aria-label={tr('Bot difficulty')}>
          {levels().map(([lv, t]) => (
            <button key={lv} type="button" role="radio" aria-checked={v.level === lv} disabled={!host}
              className={v.level === lv ? 'is-on' : ''} onClick={() => hostRoom?.setLevel(lv)}>
              <b>{t}</b>
            </button>
          ))}
        </div>
      </div>

      <footer className="lobby-foot">
        {host ? (
          <button type="button" className="btn btn-main lobby-start" disabled={!hostRoom?.canStart()} onClick={onStart}>
            {tr('Start')}
          </button>
        ) : (
          <button type="button" className={`btn lobby-start ${me?.ready ? 'btn-ghost' : 'btn-main'}`}
            onClick={() => guestRoom?.ready(!me?.ready)}>
            {me?.ready ? tr('Not ready') : tr("I'm ready")}
          </button>
        )}
        <p className="lobby-note">
          {host ? tr('At least two players are needed. Once everyone says "I\'m ready", you can start.') : tr('When the host starts, the match opens for everyone at once.')}
        </p>
      </footer>
    </div>
  );
}
