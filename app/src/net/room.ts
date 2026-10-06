// Oda (lobi) mantığı. HostRoom odayı kurar ve maçı yürütür; GuestRoom koda bağlanır ve maçı izleyip oynar.
// Ekran ikisini de subscribe/getSnapshot ile okur.

import type { Level } from '../../../engine/rules.js';
import type { GameController } from '../game/controller';
import { peerTransport } from './transport';
import type { HostEndpoint, Link, Transport } from './transport';
import type { LobbySeat, MatchStart, ToGuest, ToHost } from './protocol';
import { tr } from '../i18n';

export type RoomStatus = 'connecting' | 'lobby' | 'playing' | 'error' | 'closed';

export interface RoomView {
  status: RoomStatus;
  code: string;
  you: number; // lobi koltuğu
  seats: LobbySeat[];
  level: Level;
  error: string;
  version: number;
}

const EMPTY: LobbySeat = { kind: 'empty', ready: false };
const MAX_SEATS = 4;

abstract class Room {
  abstract readonly role: 'host' | 'guest';
  view: RoomView = {
    status: 'connecting', code: '', you: 0, seats: [], level: 'normal', error: '', version: 0,
  };
  private listeners = new Set<() => void>();
  constructor(protected ctl: GameController) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getSnapshot = () => this.view;

  protected set(patch: Partial<RoomView>) {
    this.view = { ...this.view, ...patch, version: this.view.version + 1 };
    this.listeners.forEach(fn => fn());
  }

  abstract close(): void;
}

// ------------------------------------------------------------ kurucu

export class HostRoom extends Room {
  readonly role = 'host';
  private endpoint: HostEndpoint | null = null;
  private links: (Link<ToHost, ToGuest> | null)[] = Array(MAX_SEATS).fill(null);
  private match: MatchStart | null = null;
  private engineSeat: number[] = []; // lobi koltuğu → maçtaki koltuk
  private closed = false;

  constructor(ctl: GameController, level: Level, transport: Transport = peerTransport) {
    super(ctl);
    this.view = { ...this.view, level, seats: [{ kind: 'host', ready: true }, EMPTY, EMPTY, EMPTY] };
    transport.host().then(ep => {
      if (this.closed) return ep.close();
      this.endpoint = ep;
      ep.onJoin(link => this.join(link));
      this.set({ status: 'lobby', code: ep.code });
    }).catch((e: Error) => this.set({ status: 'error', error: e.message }));
  }

  private join(link: Link<ToHost, ToGuest>) {
    const i = this.view.seats.findIndex(s => s.kind === 'empty');
    if (this.view.status !== 'lobby' || i < 0) {
      link.send({ t: 'closed', reason: this.view.status === 'playing' ? tr('Maç başladı.') : tr('Oda dolu.') });
      setTimeout(() => link.close(), 300);
      return;
    }
    this.links[i] = link;
    this.setSeat(i, { kind: 'guest', ready: false });
    link.onMessage(m => this.message(i, m));
    link.onClose(() => this.leave(i, link));
  }

  private message(i: number, m: ToHost) {
    if (m.t === 'hello') this.broadcastLobby();
    else if (m.t === 'ready' && this.view.status === 'lobby') this.setSeat(i, { kind: 'guest', ready: m.ready });
    else if (m.t === 'move' && this.view.status === 'playing') this.ctl.receiveMove(this.engineSeat[i], m.move);
  }

  private leave(i: number, link: Link<ToHost, ToGuest>) {
    if (this.links[i] !== link) return;
    this.links[i] = null;
    if (this.view.status === 'playing') this.ctl.dropSeat(this.engineSeat[i]);
    else this.setSeat(i, EMPTY);
  }

  private setSeat(i: number, seat: LobbySeat) {
    const seats = [...this.view.seats];
    seats[i] = seat;
    this.set({ seats });
    this.broadcastLobby();
  }

  private broadcastLobby() {
    const { code, seats, level } = this.view;
    this.links.forEach((l, i) => l?.send({ t: 'lobby', code, you: i, seats, level }));
  }

  addBot(i: number) { if (this.view.seats[i].kind === 'empty') this.setSeat(i, { kind: 'bot', ready: true }); }

  clearSeat(i: number) {
    const l = this.links[i];
    if (l) { this.links[i] = null; l.send({ t: 'closed', reason: tr('Kurucu seni odadan çıkardı.') }); setTimeout(() => l.close(), 300); }
    this.setSeat(i, EMPTY);
  }

  setLevel(level: Level) { this.set({ level }); this.broadcastLobby(); }

  canStart() {
    const filled = this.view.seats.filter(s => s.kind !== 'empty');
    return filled.length >= 2 && filled.every(s => s.ready);
  }

  start(moveSeconds: number) {
    if (!this.canStart()) return;
    const order = this.view.seats.map((s, i) => (s.kind === 'empty' ? -1 : i)).filter(i => i >= 0);
    this.engineSeat = [];
    order.forEach((lobbySeat, e) => { this.engineSeat[lobbySeat] = e; });
    const level = this.view.level;
    this.match = {
      seed: Math.floor(Math.random() * 2 ** 31),
      seats: order.map(i => (this.view.seats[i].kind === 'bot' ? { kind: 'bot', level } : { kind: 'human' })),
      level, moveSeconds,
    };
    this.links.forEach((l, i) => l?.send({ t: 'start', match: this.match!, you: this.engineSeat[i] }));
    this.ctl.startMatch(this.match, 0, {
      role: 'host',
      broadcast: (n, move) => this.links.forEach(l => l?.send({ t: 'move', n, move })),
    });
    this.set({ status: 'playing' });
  }

  // Maç bitince herkes lobiye döner; misafirler yeniden "Hazırım" der.
  backToLobby() {
    const seats = this.view.seats.map(s => (s.kind === 'guest' ? { ...s, ready: false } : s));
    this.set({ status: 'lobby', seats });
    this.broadcastLobby();
  }

  close() {
    this.closed = true;
    this.links.forEach(l => { l?.send({ t: 'closed', reason: tr('Kurucu odayı kapattı.') }); l?.close(); });
    this.links = Array(MAX_SEATS).fill(null);
    this.endpoint?.close();
    this.ctl.dispose();
    this.set({ status: 'closed' });
  }
}

// ------------------------------------------------------------ misafir

export class GuestRoom extends Room {
  readonly role = 'guest';
  private link: Link<ToGuest, ToHost> | null = null;
  private closed = false;

  constructor(ctl: GameController, code: string, transport: Transport = peerTransport) {
    super(ctl);
    this.view = { ...this.view, code };
    transport.join(code).then(link => {
      if (this.closed) return link.close();
      this.link = link;
      link.onMessage(m => this.message(m));
      link.onClose(() => this.lost());
      link.send({ t: 'hello' });
    }).catch((e: Error) => this.set({ status: 'error', error: e.message }));
  }

  private message(m: ToGuest) {
    if (m.t === 'lobby') {
      if (this.view.status === 'playing') this.ctl.dispose();
      this.set({ status: 'lobby', code: m.code, you: m.you, seats: m.seats, level: m.level });
    } else if (m.t === 'start' || m.t === 'sync') {
      this.ctl.startMatch(m.match, m.you, { role: 'guest', send: move => this.link?.send({ t: 'move', move }) },
        m.t === 'sync' ? m.moves : []);
      this.set({ status: 'playing' });
    } else if (m.t === 'move') {
      this.ctl.receiveNetMove(m.n, m.move);
    } else if (m.t === 'closed') {
      if (this.view.status === 'playing') this.ctl.netLost();
      this.closed = true;
      this.set({ status: 'closed', error: m.reason });
      this.link?.close();
    }
  }

  private lost() {
    if (this.closed) return;
    this.closed = true;
    this.ctl.netLost();
    this.set({ status: 'closed', error: this.view.error || tr('Odayla bağlantı koptu.') });
  }

  ready(ready: boolean) { this.link?.send({ t: 'ready', ready }); }

  close() {
    this.closed = true;
    this.link?.close();
    this.ctl.dispose();
    this.set({ status: 'closed' });
  }
}

export type AnyRoom = HostRoom | GuestRoom;
