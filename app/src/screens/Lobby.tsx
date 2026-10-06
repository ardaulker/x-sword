import { useState, useSyncExternalStore } from 'react';
import type { Level } from '../../../engine/rules.js';
import { Icon } from '../components/bits';
import { PieceGlyph } from '../components/PieceGlyph';
import { cleanCode, isCode } from '../net/protocol';
import { GuestRoom, HostRoom } from '../net/room';
import type { AnyRoom } from '../net/room';
import './Lobby.css';

const LEVELS: [Level, string][] = [['kolay', 'Kolay'], ['normal', 'Normal'], ['zor', 'Zor']];

export const inviteLink = (code: string) =>
  `${location.origin}${location.pathname}#/katil/${code}`;

// ------------------------------------------------------------ giriş: oda kur ya da koda katıl

export function MultiplayerEntry({ onHost, onJoin, onBack, error }: {
  onHost: () => void; onJoin: (code: string) => void; onBack: () => void; error: string;
}) {
  const [code, setCode] = useState('');
  const ok = isCode(code);
  return (
    <div className="lobby">
      <header className="lobby-head">
        <button type="button" className="round-btn" aria-label="Geri" onClick={onBack}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <div className="lobby-titles"><h1>Çok oyunculu</h1><span>Arkadaşlarınla aynı tahtada</span></div>
      </header>
      <div className="lobby-body">
        <button type="button" className="menu-play" onClick={onHost}>
          <Icon d="M12 5 V19 M5 12 H19" size={26} stroke={2.6} color="#0B1026" />
          <span className="menu-play-text"><b>Oda kur</b><span>Kodu paylaş, arkadaşların katılsın</span></span>
        </button>
        <form className="join" onSubmit={e => { e.preventDefault(); if (ok) onJoin(code); }}>
          <label htmlFor="join-code">ODA KODU</label>
          <input
            id="join-code" value={code} onChange={e => setCode(cleanCode(e.target.value))}
            placeholder="K7Q2M" autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text"
          />
          <button type="submit" className="btn btn-main" disabled={!ok}>Odaya katıl</button>
        </form>
        {error && <p className="lobby-error" role="alert">{error}</p>}
        <p className="lobby-note">Bağlantı telefondan telefona kurulur; hesap gerekmez. Odayı kuran telefon maçı yürütür, o çıkarsa maç biter.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ lobi

export function LobbyScreen({ room, onLeave, onStart }: { room: AnyRoom; onLeave: () => void; onStart: () => void }) {
  const v = useSyncExternalStore(room.subscribe, room.getSnapshot);
  const hostRoom = room instanceof HostRoom ? room : null;
  const guestRoom = room instanceof GuestRoom ? room : null;
  const host = !!hostRoom;
  const [copied, setCopied] = useState(false);
  const me = v.seats[v.you];
  const link = v.code ? inviteLink(v.code) : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* izin yoksa sessiz */ }
  };
  const share = () => {
    const text = `X Sword'da maça gel! Oda kodu: ${v.code}`;
    if (navigator.share) navigator.share({ title: 'X Sword', text, url: link }).catch(() => {});
    else copy();
  };

  if (v.status === 'connecting' || v.status === 'error' || v.status === 'closed') {
    return (
      <div className="lobby">
        <header className="lobby-head">
          <button type="button" className="round-btn" aria-label="Geri" onClick={onLeave}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
          <div className="lobby-titles"><h1>Lobi</h1><span>{host ? 'Oda kuruluyor' : `Oda ${v.code}`}</span></div>
        </header>
        <div className="lobby-body lobby-center">
          {v.status === 'connecting'
            ? <><div className="lobby-spin" aria-hidden="true" /><p>{host ? 'Oda açılıyor…' : 'Odaya bağlanılıyor…'}</p></>
            : <><p className="lobby-error" role="alert">{v.error || 'Oda kapandı.'}</p><button type="button" className="btn btn-ghost" onClick={onLeave}>Geri dön</button></>}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <header className="lobby-head">
        <button type="button" className="round-btn" aria-label="Odadan çık" onClick={onLeave}><Icon d="M15 5 L8 12 L15 19" size={20} stroke={2.4} /></button>
        <div className="lobby-titles"><h1>Lobi</h1><span>{host ? 'Odayı sen kurdun' : 'Kurucunun başlatmasını bekle'}</span></div>
        <button type="button" className="lobby-code" onClick={copy} aria-label={`Oda kodu ${v.code}, linki kopyala`}>
          <span>{v.code}</span>
          <Icon d={copied ? 'M5 12.5 L10 17 L19 7' : 'M9 9 H19 V19 H9 Z M5 15 V5 H15'} size={16} stroke={2} />
        </button>
      </header>

      <div className="lobby-body">
        {host && (
          <div className="lobby-invite">
            <a className="btn lobby-wa" href={`https://wa.me/?text=${encodeURIComponent(`X Sword'da maça gel! ${link}`)}`} target="_blank" rel="noreferrer">
              WhatsApp ile davet et
            </a>
            <div className="lobby-invite-row">
              <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? 'Kopyalandı' : 'Linki kopyala'}</button>
              <button type="button" className="btn btn-ghost" onClick={share}>Paylaş</button>
            </div>
          </div>
        )}

        <div className="seats">
          {v.seats.map((s, i) => {
            const filled = s.kind !== 'empty';
            // Boş koltuklar maçta atlanır: numara ve renk maçtaki sıraya göre.
            const n = v.seats.slice(0, i).filter(x => x.kind !== 'empty').length;
            const tag = s.kind === 'host' ? 'Kurucu' : s.kind === 'bot' ? 'Yapay zekâ' : 'Oyuncu';
            return (
              <div key={i} className={`seat${filled ? '' : ' is-empty'}${i === v.you ? ' is-me' : ''}`}>
                {filled ? (
                  <>
                    <div className="seat-top">
                      <PieceGlyph kind="star" seat={n} size={32} diamond={false} />
                      <div className="seat-names">
                        <b>{i === v.you ? `Sen · Oyuncu ${n + 1}` : `Oyuncu ${n + 1}`}</b>
                        <span>{tag}</span>
                      </div>
                    </div>
                    <div className="seat-bottom">
                      <span className={`seat-ready${s.ready ? ' is-ready' : ''}`}>{s.ready ? 'Hazır' : 'Bekliyor'}</span>
                      {host && i !== v.you && (
                        <button type="button" className="seat-x" aria-label="Koltuğu boşalt" onClick={() => hostRoom?.clearSeat(i)}>
                          <Icon d="M6 6 L18 18 M18 6 L6 18" size={14} stroke={2.4} />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="seat-empty">Boş koltuk</span>
                    {host
                      ? <button type="button" className="seat-add" onClick={() => hostRoom?.addBot(i)}>+ Yapay zekâ ekle</button>
                      : <span className="seat-wait">Davet bekleniyor</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="field-label">BOT ZORLUĞU</div>
        <div className="seg" role="radiogroup" aria-label="Bot zorluğu">
          {LEVELS.map(([lv, t]) => (
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
            Başlat
          </button>
        ) : (
          <button type="button" className={`btn lobby-start ${me?.ready ? 'btn-ghost' : 'btn-main'}`}
            onClick={() => guestRoom?.ready(!me?.ready)}>
            {me?.ready ? 'Hazır değilim' : 'Hazırım'}
          </button>
        )}
        <p className="lobby-note">
          {host ? 'En az iki oyuncu gerekir. Herkes "Hazırım" deyince başlatabilirsin.' : 'Kurucu başlatınca maç herkeste aynı anda açılır.'}
        </p>
      </footer>
    </div>
  );
}
