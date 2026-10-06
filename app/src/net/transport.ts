// Bağlantı katmanı. Oyunun geri kalanı yalnız bu arayüzü bilir; bugün telefondan telefona (PeerJS),
// ileride X Sword'e ait bir sunucu olursa yalnız bu dosyanın yerine yenisi yazılır.

import type { DataConnection, PeerError } from 'peerjs';
import { newCode } from './protocol';
import type { ToGuest, ToHost } from './protocol';

export interface Link<In, Out> {
  send(msg: Out): void;
  onMessage(cb: (msg: In) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

export interface HostEndpoint {
  code: string;
  onJoin(cb: (link: Link<ToHost, ToGuest>) => void): void;
  close(): void;
}

export interface Transport {
  host(): Promise<HostEndpoint>;
  join(code: string): Promise<Link<ToGuest, ToHost>>;
}

// ------------------------------------------------------------ PeerJS: telefondan telefona
// Telefonlar birbirini PeerJS'in ücretsiz eşleştirme sunucusuyla bulur; oyun verisi doğrudan akar.

const PREFIX = 'xsword-';

// PeerJS yalnız çok oyunculuda yüklenir; tek oyunculu açılış hafif kalır.
const loadPeer = () => import('peerjs').then(m => m.default);

function linkOf<In, Out>(conn: DataConnection, onDone: () => void): Link<In, Out> {
  let handler: ((m: In) => void) | null = null;
  const buffer: In[] = [];
  const closers: (() => void)[] = [];
  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    closers.forEach(fn => fn());
    onDone();
  };
  conn.on('data', d => (handler ? handler(d as In) : buffer.push(d as In)));
  conn.on('close', finish);
  conn.on('error', finish);
  return {
    send: msg => { if (conn.open) conn.send(msg); },
    onMessage: cb => { handler = cb; buffer.splice(0).forEach(cb); },
    onClose: cb => { closers.push(cb); },
    close: () => { conn.close(); finish(); },
  };
}

const describe = (err: PeerError<string>) =>
  err.type === 'peer-unavailable' ? 'Bu kodla açık bir oda yok.'
    : err.type === 'browser-incompatible' ? 'Bu tarayıcı telefonlar arası bağlantıyı desteklemiyor.'
      : 'Bağlantı kurulamadı. İnternetini kontrol et.';

export const peerTransport: Transport = {
  host: () => loadPeer().then(Peer => new Promise((resolve, reject) => {
    const attempt = (left: number) => {
      const code = newCode();
      const peer = new Peer(PREFIX + code, { debug: 0 });
      let opened = false;
      peer.on('open', () => opened = true);
      // Eşleştirme sunucusuyla bağ koparsa yeniden bağlan: kurulmuş bağlantılar zaten doğrudan akar.
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
      peer.on('open', () => resolve({
        code,
        onJoin: cb => { peer.on('connection', conn => conn.on('open', () => cb(linkOf(conn, () => {})))); },
        close: () => peer.destroy(),
      }));
      peer.on('error', err => {
        if (opened) return; // açıldıktan sonraki hatalar odayı kapatmaz
        peer.destroy();
        if (err.type === 'unavailable-id' && left > 0) attempt(left - 1);
        else reject(new Error(describe(err)));
      });
    };
    attempt(4);
  })),

  join: code => loadPeer().then(Peer => new Promise((resolve, reject) => {
    const peer = new Peer({ debug: 0 });
    const timer = window.setTimeout(() => { peer.destroy(); reject(new Error('Oda yanıt vermedi.')); }, 15000);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => { linked = true; clearTimeout(timer); resolve(linkOf(conn, () => peer.destroy())); });
    });
    let linked = false;
    peer.on('error', err => {
      if (linked) return; // bağlandıktan sonra kopma, bağlantının kendi kapanışıyla bildirilir
      clearTimeout(timer); peer.destroy(); reject(new Error(describe(err)));
    });
  })),
};
