// Room (lobby) logic. HostRoom creates the room and runs the match; GuestRoom joins by code and follows and plays the match.
// The screen reads both through subscribe/getSnapshot.

import { RULES_VERSION, SIZE_BY_STARS, defaultNeutrals, maxNeutrals } from '../../../engine/rules.js';
import type { Level } from '../../../engine/rules.js';
import type { GameController } from '../game/controller';
import { peerTransport } from './transport';
import type { HostEndpoint, Link, Transport } from './transport';
import type { LobbyOpts, LobbySeat, MatchStart, ToGuest, ToHost } from './protocol';
import { tr } from '../i18n';
import { publicProfile, readPublic } from '../game/profile';
import { AD_EVERY_MS, directory } from './directory';

export type RoomStatus = 'connecting' | 'lobby' | 'playing' | 'error' | 'closed';

export interface RoomView {
  status: RoomStatus;
  code: string;
  you: number; // lobby seat
  seats: LobbySeat[];
  level: Level;
  size: number;           // chosen board (at least the default for the number of filled seats)
  bots: number | null;    // null: the default for the board
  opts: LobbyOpts;        // personalities, obstacles, teams (off by default)
  isPublic: boolean;      // the room is listed in the public lobby (host only)
  error: string;
  version: number;
}

// The board in effect in the lobby: the chosen one, but never smaller than the default for the filled seats.
export const lobbySize = (v: Pick<RoomView, 'size' | 'seats'>) =>
  Math.max(v.size, SIZE_BY_STARS[Math.min(4, Math.max(2, v.seats.filter(s => s.kind !== 'empty').length))]);

const EMPTY: LobbySeat = { kind: 'empty', ready: false };
const MAX_SEATS = 4;
const GRACE_MS = 15000;
const MAX_RESYNCS = 3; // a guest that keeps falling out of step is let go instead of looping

abstract class Room {
  abstract readonly role: 'host' | 'guest';
  view: RoomView = {
    status: 'connecting', code: '', you: 0, seats: [], level: 'normal', size: 9, bots: null, opts: { personas: false, obstacles: false, teams: false }, isPublic: false, error: '', version: 0,
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

// ------------------------------------------------------------ host

export class HostRoom extends Room {
  readonly role = 'host';
  private endpoint: HostEndpoint | null = null;
  private links: (Link<ToHost, ToGuest> | null)[] = Array(MAX_SEATS).fill(null);
  private match: MatchStart | null = null;
  private engineSeat: number[] = []; // lobby seat → match seat
  private tokens: string[] = []; // the guest's secret id, so they can come back after a disconnect
  private grace: (number | null)[] = Array(MAX_SEATS).fill(null);
  private closed = false;
  private nudgeAt: number[] = []; // per lobby seat: when it may ring the bell again

  private adKey = '';           // the ad last published (so an unchanged room is not published again)
  private adTimer: number | null = null;

  constructor(ctl: GameController, level: Level, transport: Transport = peerTransport, isPublic = false) {
    super(ctl);
    this.view = { ...this.view, level, isPublic: isPublic && !!directory, seats: [{ kind: 'host', ready: true, ...publicProfile() }, EMPTY, EMPTY, EMPTY] };
    transport.host().then(ep => {
      if (this.closed) return ep.close();
      this.endpoint = ep;
      ep.onJoin(link => this.join(link));
      this.set({ status: 'lobby', code: ep.code });
    }).catch((e: Error) => this.set({ status: 'error', error: e.message }));
  }

  // The public lobby ad follows the room: published while the room is public and waiting, withdrawn otherwise.
  protected set(patch: Partial<RoomView>) {
    super.set(patch);
    this.advertise();
  }

  private advertise(force = false) {
    const v = this.view;
    if (!directory || !v.code) return;
    if (!v.isPublic || v.status !== 'lobby' || this.closed) {
      if (this.adKey) { directory.withdraw(v.code); this.adKey = ''; }
      if (this.adTimer != null) { clearInterval(this.adTimer); this.adTimer = null; }
      return;
    }
    const me = v.seats[0];
    const ad = {
      code: v.code, host: me?.name ?? publicProfile().name, color: me?.color ?? publicProfile().color, seats: v.seats.filter(s => s.kind !== 'empty').length,
      size: lobbySize(v), level: v.level, personas: v.opts.personas, obstacles: v.opts.obstacles, teams: v.opts.teams, rules: RULES_VERSION,
    };
    const key = JSON.stringify(ad);
    if (key !== this.adKey || force) { this.adKey = key; directory.publish(ad); }
    if (this.adTimer == null) this.adTimer = window.setInterval(() => this.advertise(true), AD_EVERY_MS);
  }

  setPublic(isPublic: boolean) { this.set({ isPublic: isPublic && !!directory }); }

  private join(link: Link<ToHost, ToGuest>) {
    if (this.view.status === 'playing') { this.rejoin(link); return; }
    const i = this.view.seats.findIndex(s => s.kind === 'empty');
    if (this.view.status !== 'lobby' || i < 0) {
      link.send({ t: 'closed', reason: tr('The room is full.') });
      setTimeout(() => link.close(), 300);
      return;
    }
    this.links[i] = link;
    this.setSeat(i, { kind: 'guest', ready: false });
    link.onMessage(m => this.message(i, m));
    link.onClose(() => this.leave(i, link));
  }

  // During a match only a guest who dropped out can come back, using their secret id.
  private rejoin(link: Link<ToHost, ToGuest>) {
    link.onMessage(m => {
      const i = m.t === 'hello' && m.token ? this.tokens.indexOf(m.token) : -1;
      if (i < 0 || this.links[i] || this.grace[i] == null || !this.match) {
        link.send({ t: 'closed', reason: tr('The match has started.') });
        setTimeout(() => link.close(), 300);
        return;
      }
      clearTimeout(this.grace[i]!);
      this.grace[i] = null;
      this.links[i] = link;
      link.onMessage(mm => this.message(i, mm));
      link.onClose(() => this.leave(i, link));
      link.send({ t: 'sync', match: this.match, you: this.engineSeat[i], moves: this.ctl.movesSoFar() });
      this.ctl.returnSeat(this.engineSeat[i]);
    });
  }

  private message(i: number, m: ToHost) {
    if (m.t === 'hello') {
      // A guest on older rules would replay the same moves differently: send them to update instead.
      if ((m.rules ?? 1) < RULES_VERSION) { this.refuse(i, tr('Your game is older than this room. Update it to join.')); return; }
      if (m.token) this.tokens[i] = m.token;
      // The guest's profile name and color (cleaned). Broadcast to everyone in the lobby.
      const pub = readPublic(m.profile);
      if (pub && this.view.status === 'lobby') this.setSeat(i, { ...this.view.seats[i], ...pub });
      else this.broadcastLobby();
    }
    else if (m.t === 'bye') this.leave(i, this.links[i]!, true);
    else if (m.t === 'nudge' && this.view.status === 'playing') this.relayNudge(i, m.seat);
    else if (m.t === 'resync' && this.view.status === 'playing' && this.match) this.links[i]?.send({ t: 'sync', match: this.match, you: this.engineSeat[i], moves: this.ctl.movesSoFar() });
    else if (m.t === 'ready' && this.view.status === 'lobby') this.setSeat(i, { ...this.view.seats[i], kind: 'guest', ready: m.ready });
    else if (m.t === 'move' && this.view.status === 'playing') this.ctl.receiveMove(this.engineSeat[i], m.move);
  }

  // A bell for the player whose move it is. The host checks the target and the rate (one bell per 6 s per sender).
  private relayNudge(fromLobby: number, toEngine: number) {
    if (Date.now() < (this.nudgeAt[fromLobby] ?? 0)) return;
    const to = this.engineSeat.indexOf(toEngine);
    if (to < 0 || to === fromLobby || !this.ctl.isTurnOf(toEngine)) return;
    this.nudgeAt[fromLobby] = Date.now() + 6000;
    const from = this.engineSeat[fromLobby];
    if (to === 0) this.ctl.ring(from);
    else this.links[to]?.send({ t: 'nudge', from });
  }

  private nudgeFromHost(toEngine: number) {
    const to = this.engineSeat.indexOf(toEngine);
    if (to > 0) this.links[to]?.send({ t: 'nudge', from: this.engineSeat[0] });
  }

  private refuse(i: number, reason: string) {
    const l = this.links[i];
    if (!l) return;
    this.links[i] = null;
    l.send({ t: 'closed', reason });
    setTimeout(() => l.close(), 300);
    if (this.view.status === 'lobby') this.setSeat(i, EMPTY);
  }

  private leave(i: number, link: Link<ToHost, ToGuest>, bye = false) {
    if (!link || this.links[i] !== link) return;
    this.links[i] = null;
    if (this.view.status !== 'playing') { this.setSeat(i, EMPTY); return; }
    if (bye) { this.ctl.dropSeat(this.engineSeat[i]); return; }
    // Disconnect: if they don't return within 15 s, an AI takes their seat.
    this.ctl.awaySeat(this.engineSeat[i]);
    this.grace[i] = window.setTimeout(() => { this.grace[i] = null; this.ctl.dropSeat(this.engineSeat[i]); }, GRACE_MS);
  }

  private setSeat(i: number, seat: LobbySeat) {
    const seats = [...this.view.seats];
    seats[i] = seat;
    this.set({ seats });
    this.broadcastLobby();
  }

  private broadcastLobby() {
    const { code, seats, level, size, bots, opts } = this.view;
    this.links.forEach((l, i) => l?.send({ t: 'lobby', code, you: i, seats, level, size, bots, opts }));
  }

  addBot(i: number) { if (this.view.seats[i].kind === 'empty') this.setSeat(i, { kind: 'bot', ready: true }); }

  clearSeat(i: number) {
    const l = this.links[i];
    if (l) { this.links[i] = null; l.send({ t: 'closed', reason: tr('The host removed you from the room.') }); setTimeout(() => l.close(), 300); }
    this.setSeat(i, EMPTY);
  }

  setLevel(level: Level) { this.set({ level }); this.broadcastLobby(); }
  setSize(size: number) { this.set({ size }); this.broadcastLobby(); }
  setBots(bots: number | null) { this.set({ bots }); this.broadcastLobby(); }
  setOpts(patch: Partial<LobbyOpts>) { this.set({ opts: { ...this.view.opts, ...patch } }); this.broadcastLobby(); }

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
    const size = lobbySize(this.view);
    const neutrals = Math.min(this.view.bots ?? defaultNeutrals(order.length, size), maxNeutrals(size));
    this.match = {
      seed: Math.floor(Math.random() * 2 ** 31),
      seats: order.map(i => (this.view.seats[i].kind === 'bot' ? { kind: 'bot', level } : { kind: 'human' })),
      level, moveSeconds, size, neutrals, rules: RULES_VERSION,
      names: order.map(i => (this.view.seats[i].kind === 'bot' ? null : this.view.seats[i].name ?? null)),
      personas: this.view.opts.personas, obstacles: this.view.opts.obstacles, teams: this.view.opts.teams && order.length === 4,
    };
    this.links.forEach((l, i) => l?.send({ t: 'start', match: this.match!, you: this.engineSeat[i] }));
    this.ctl.startMatch(this.match, 0, {
      role: 'host',
      broadcast: (n, move, h) => this.links.forEach(l => l?.send({ t: 'move', n, move, h })),
      nudge: seat => this.nudgeFromHost(seat),
    });
    this.set({ status: 'playing' });
  }

  // After the match everyone goes back to the lobby; guests say "Ready" again.
  backToLobby() {
    const seats = this.view.seats.map(s => (s.kind === 'guest' ? { ...s, ready: false } : s));
    this.set({ status: 'lobby', seats });
    this.broadcastLobby();
  }

  close() {
    this.closed = true;
    this.advertise();
    this.grace.forEach(g => g != null && clearTimeout(g));
    this.links.forEach(l => { l?.send({ t: 'closed', reason: tr('The host closed the room.') }); l?.close(); });
    this.links = Array(MAX_SEATS).fill(null);
    this.endpoint?.close();
    this.ctl.dispose();
    this.set({ status: 'closed' });
  }
}

// ------------------------------------------------------------ guest

export class GuestRoom extends Room {
  readonly role = 'guest';
  private link: Link<ToGuest, ToHost> | null = null;
  private closed = false;
  private reconnecting = false;
  private resyncs = 0;
  private resyncing = false;
  private readonly token = Math.random().toString(36).slice(2) + Date.now().toString(36);

  constructor(ctl: GameController, code: string, private transport: Transport = peerTransport) {
    super(ctl);
    this.view = { ...this.view, code };
    transport.join(code).then(link => {
      if (this.closed) return link.close();
      this.wire(link);
    }).catch((e: Error) => this.set({ status: 'error', error: e.message }));
  }

  private wire(link: Link<ToGuest, ToHost>) {
    this.link = link;
    link.onMessage(m => this.message(m));
    link.onClose(() => this.lost());
    link.send({ t: 'hello', token: this.token, profile: publicProfile(), rules: RULES_VERSION });
  }

  // If the connection drops during a match, it keeps trying to rejoin the same room for 15 s.
  private reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;
    this.ctl.note(tr('Connection lost · reconnecting…'));
    const deadline = Date.now() + GRACE_MS;
    const attempt = () => {
      if (this.closed) return;
      this.transport.join(this.view.code).then(link => {
        if (this.closed) return link.close();
        this.reconnecting = false;
        this.wire(link);
      }).catch(() => {
        if (Date.now() < deadline) setTimeout(attempt, 1500);
        else this.giveUp();
      });
    };
    attempt();
  }

  private giveUp() {
    this.reconnecting = false;
    this.closed = true;
    this.ctl.netLost();
    this.set({ status: 'closed', error: tr('Lost connection to the room.') });
  }

  private message(m: ToGuest) {
    if (m.t === 'lobby') {
      if (this.view.status === 'playing') this.ctl.dispose();
      this.set({ status: 'lobby', code: m.code, you: m.you, seats: m.seats, level: m.level, size: m.size, bots: m.bots, opts: m.opts ?? { personas: false, obstacles: false, teams: false } });
    } else if (m.t === 'start' || m.t === 'sync') {
      // The room plays by newer rules than this app knows: it cannot follow the match.
      if ((m.match.rules ?? 1) > RULES_VERSION) {
        this.closed = true;
        this.set({ status: 'closed', error: tr('This room needs a newer version of the game. Update it to join.') });
        this.link?.close();
        return;
      }
      this.resyncing = false;
      if (m.t === 'start') this.resyncs = 0;
      this.ctl.startMatch(m.match, m.you, { role: 'guest', send: move => this.link?.send({ t: 'move', move }), desync: () => this.desync(), nudge: seat => this.link?.send({ t: 'nudge', seat }) },
        m.t === 'sync' ? m.moves : []);
      this.set({ status: 'playing' });
    } else if (m.t === 'nudge') {
      this.ctl.ring(m.from);
    } else if (m.t === 'move') {
      this.ctl.receiveNetMove(m.n, m.move, m.h);
    } else if (m.t === 'closed') {
      if (this.view.status === 'playing') this.ctl.netLost();
      this.closed = true;
      this.set({ status: 'closed', error: m.reason });
      this.link?.close();
    }
  }

  private lost() {
    if (this.closed) return;
    if (this.view.status === 'playing') { this.reconnect(); return; }
    this.closed = true;
    this.ctl.netLost();
    this.set({ status: 'closed', error: this.view.error || tr('Lost connection to the room.') });
  }

  // The state hash differs from the host's. Ask for the match again from the start, a few times at most.
  private desync() {
    if (this.resyncing || this.closed) return;
    if (this.resyncs >= MAX_RESYNCS) {
      this.closed = true;
      this.ctl.netLost();
      this.set({ status: 'closed', error: tr('The match went out of step with the host.') });
      this.link?.send({ t: 'bye' });
      this.link?.close();
      return;
    }
    this.resyncs++;
    this.resyncing = true;
    this.ctl.note(tr('Out of step · syncing again…'));
    this.link?.send({ t: 'resync' });
  }

  ready(ready: boolean) { this.link?.send({ t: 'ready', ready }); }

  close() {
    this.closed = true;
    this.link?.send({ t: 'bye' });
    this.link?.close();
    this.ctl.dispose();
    this.set({ status: 'closed' });
  }
}

export type AnyRoom = HostRoom | GuestRoom;
