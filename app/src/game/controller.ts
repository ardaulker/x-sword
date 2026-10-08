// Match flow: whose turn it is, the timer, the bot turn, mode changes, notifications.
// The engine (engine/) knows the rules; this file only calls its functions and tells the screen what happened.

import {
  BONUS_NAMES, POINTS, RULES_VERSION, isWinner, stateHash, TWIN_TAKE_MULT, collapseDue, createGame, createPuzzle, endMatch, play, currentActor, legalMoves, pieceById, starOf,
} from '../../../engine/rules.js';
import type { BonusKind, GameState, Level, Move, Piece } from '../../../engine/rules.js';
import { chooseMove } from '../../../engine/bots.js';
import { BUZZ, feel, sound, startTension, stopTension } from './haptics';
import { coachStep, markCoachSeen } from './coach';
import { DAILY, saveDaily, seedOf } from './daily';
import { PUZZLES } from './puzzles';
import { clearSave, decodeMoves, encodeMoves, readSave, writeSave } from './record';
import type { Opts, ReplaySpec } from './record';
import { recordMatch, recordPuzzle } from './stats';
import { SPEED, settings } from './settings';
import { HAZARD, PLAYER_COLORS, colorOf, isBot } from './look';
import { ME, clockText, labelOf, objectOf, seatName, setMe, setSeatNames, subjectOf } from './names';
import { getProfile } from './profile';
import { syncCloud } from './platform';
import type { MatchStart } from '../net/protocol';
import { tr } from '../i18n';

// This device's role in a multiplayer match. The host runs the match and broadcasts every move;
// a guest sends its own move to the host and applies every move it receives from the host.
export interface NetRole {
  role: 'host' | 'guest';
  broadcast?: (n: number, move: Move | null, hash: string) => void;
  send?: (move: Move | null) => void;
  desync?: () => void; // guest: the state differs from the host's (hash check failed)
}

export type Phase =
  | 'ready'     // the match is starting
  | 'mine'       // your turn
  | 'preview'  // you picked a square, waiting for confirmation
  | 'rival'     // another star (an AI player) is moving
  | 'bot'       // arena bots are moving
  | 'wait'     // a move was played, the next step is coming
  | 'mode'       // the mode is changing
  | 'over';

export interface Setup {
  players: number;
  level: Level;        // arena bot intelligence
  aiLevel: Level;      // AI rival intelligence (2–4 players)
  moveSeconds: number;
  /** Board side and arena bot count. */
  boardSize: number;
  bots: number;
  /** Daily challenge: the date text (YYYY-MM-DD). When set, board, bots and difficulty are fixed. */
  daily?: string | null;
  /** Puzzle id; when set, the match is that puzzle. */
  puzzle?: number | null;
  /** Options (off by default): rival personalities, obstacle squares, teams (4 players only). */
  personas?: boolean;
  obstacles?: boolean;
  teams?: boolean;
}
// players 1: single-player mode (you + your mirror Twin + bots). 2–4: against AI players.
export const DEFAULT_SETUP: Setup = { players: 1, level: 'normal', aiLevel: 'normal', moveSeconds: 20, boardSize: 9, bots: 14 };

export interface Spot { r: number; c: number }
export interface Trail { key: number; from: Spot; to: Spot; color: string }
export interface Burst { key: number; r: number; c: number; color: string; big?: boolean }
// A sword stroke across the taken square. angle: the attack direction in degrees (0 = right, 90 = down).
export interface Slash { key: number; r: number; c: number; angle: number; color: string; big: boolean }
export interface Float { key: number; r: number; c: number; text: string; color: string; big?: boolean }
// The last moves played this round: they stay on the board as faint dashed lines.
export interface LastMove { id: string; round: number; from: Spot; to: Spot; color: string }
export interface Toast { key: number; text: string; icon: 'sword' | 'clock' | 'info' | 'ring' }
export interface Banner { key: number; title: string; sub: string; color: string; pieceId: string | null }
// attackerId null: the piece fell with a collapsing ring.
export interface TakeEvent { key: number; round: number; attackerId: string | null; victimId: string; at: number } // at: number of moves played up to that moment (to jump there in a replay)
export type Sheet = { type: 'log' } | { type: 'bonus' } | { type: 'menu' } | { type: 'results' } | { type: 'coach'; step: number } | null;

export interface View {
  phase: Phase;
  sel: Move | null;
  showThreats: boolean;
  timer: number;
  trails: Trail[];
  lastMoves: LastMove[];
  bursts: Burst[];
  slashes: Slash[];
  floats: Float[];
  toast: Toast | null;
  banner: Banner | null;
  modeOverlay: boolean;
  sheet: Sheet;
  inspect: string | null;
  bonus: BonusKind | null; // the bonus you picked on your turn: reachable squares follow it
  bots: { done: number; total: number; currentId: string | null };
  events: TakeEvent[];
  clockStart: number;
  clockEnd: number | null;
  watching: boolean;
  shake: number;
  fall: { key: number; ring: number } | null; // the ring that just collapsed (for the animation)
  hit: number; // grows when you are taken or fall: the screen flashes red
  version: number;
}

const BANNER_MS = 1800;

interface Outcome {
  roundEnded: boolean;
  collapsed: boolean;
}

export class GameController {
  state!: GameState;
  view!: View;
  setup: Setup;

  private listeners = new Set<() => void>();
  private timers = new Set<number>();
  private ticker: number | null = null;
  private botTimer: number | null = null;
  private botQueue: string[] = [];
  private banners: Omit<Banner, 'key'>[] = [];
  private bannerUntil = 0;
  private fast = false;
  private decisionShown = false;
  autoMap = false; // the danger map is on by itself in the first matches
  private bonusShown = false;
  private seq = 0;
  private net: NetRole | null = null;
  private moves: (Move | null)[] = []; // every move of the match, in order
  private waitingSeat: number | null = null; // host: the remote player whose move we are waiting for
  private away = new Set<number>(); // host: disconnected seats that may still come back
  private paused = false;
  private pausedAt = 0;
  private deferred: (() => void)[] = []; // timers that fired while paused; they run on resume
  private parked = false;   // back on the main menu: the match is paused and kept
  private restored = false; // the match came from the device save: the next step must start on resume
  private opts: Opts | null = null; // the createGame options that built this match (for saves and replays)
  private statsDone = false;
  private undoPoints: number[] = []; // move count at the start of each of my turns (for undo)
  private undosLeft = 3;
  replay: { opts: Opts; moves: (Move | null)[]; i: number } | null = null;

  constructor(setup: Setup = DEFAULT_SETUP) {
    this.setup = setup;
    this.reset();
    this.restoreFromStorage();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  getSnapshot = () => this.view;

  // ------------------------------------------------------------ match

  start() {
    // A short tip card in the first three local matches; the match starts when it is dismissed.
    const step = this.net || !settings.tips || this.setup.puzzle != null ? null : coachStep();
    this.autoMap = step != null && step < 2;
    if (step != null) { this.later(500, () => this.emit({ sheet: { type: 'coach', step } })); return; }
    this.later(600, () => this.advance());
  }

  closeCoach() {
    markCoachSeen();
    this.emit({ sheet: null });
    this.later(300, () => this.advance());
  }

  newGame(setup: Setup = this.setup, opts?: Opts) {
    this.dispose();
    clearSave();
    this.net = null;
    this.replay = null;
    setMe(0);
    this.setup = setup;
    this.reset(undefined, opts ? { opts, moves: [] } : undefined);
    this.emit();
    this.start();
  }

  // Start over on the same board (same layout for daily, puzzle and normal matches).
  restart() {
    this.newGame(this.setup, this.opts ?? undefined);
  }

  // ------------------------------------------------------------ pause, save, resume

  pause() {
    if (this.net || this.paused || this.replay || this.state.over) return;
    this.paused = true;
    this.pausedAt = Date.now();
    this.stopTicker();
    stopTension();
    this.emit({ clockEnd: this.pausedAt });
  }

  unpause() {
    if (!this.paused) return;
    this.paused = false;
    const dt = Date.now() - this.pausedAt;
    this.emit({ clockStart: this.view.clockStart + dt, clockEnd: null });
    const fns = this.deferred.splice(0);
    fns.forEach(f => f());
    if (!this.halted && ['mine', 'preview', 'rival'].includes(this.view.phase)) this.startTicker();
    if (!this.halted && collapseDue(this.state)) startTension();
  }

  // When leaving the game screen: an unfinished local match is kept, otherwise it is cleaned up.
  leave() {
    if (!this.net && !this.replay && !this.state.over && !this.parked) {
      this.pause();
      this.parked = true;
      this.saveGame();
    } else if (!this.parked) {
      this.dispose();
    }
  }

  // Record for a replay link (local matches only).
  replaySpec(): ReplaySpec | null {
    return !this.net && this.opts ? { opts: this.opts, moves: encodeMoves(this.moves) } : null;
  }

  get canResume() { return !this.net && this.parked && !this.state.over; }

  // Short summary for "Continue" on the main menu.
  get resumeInfo() { return { round: this.state.round, score: this.state.seats[ME]?.score ?? 0 }; }

  unpark() {
    if (!this.parked) return;
    this.parked = false;
    this.emit({ sheet: null });
    this.unpause();
    if (this.restored) { this.restored = false; this.later(300, () => this.advance()); }
  }

  // Drop the kept match (a new match is starting).
  discardParked() {
    if (!this.parked) return;
    this.dispose();
    clearSave();
  }

  private saveGame() {
    if (this.net || !this.opts || this.state.over || this.replay) return;
    writeSave({ v: 1, opts: this.opts, setup: this.setup, moves: encodeMoves(this.moves), elapsed: (this.view.clockEnd ?? Date.now()) - this.view.clockStart });
  }

  // When the app reopens, an unfinished match is kept; "Continue" shows on the main menu.
  private restoreFromStorage() {
    const s = readSave();
    if (!s) return false;
    try {
      setMe(0);
      this.setup = { ...DEFAULT_SETUP, ...s.setup };
      this.reset(undefined, { opts: s.opts, moves: decodeMoves(s.moves) });
      if (this.state.over) { clearSave(); return false; }
      const now = Date.now();
      this.view = { ...this.view, phase: 'wait', clockStart: now - s.elapsed, clockEnd: now };
      this.parked = true;
      this.restored = true;
      this.paused = true;
      this.pausedAt = now;
      return true;
    } catch {
      clearSave();
      return false;
    }
  }

  // ------------------------------------------------------------ replay

  loadReplay(spec: ReplaySpec) {
    setSeatNames([]);
    this.dispose();
    this.net = null;
    setMe(0);
    this.setup = { ...DEFAULT_SETUP };
    this.opts = spec.opts;
    this.replay = { opts: spec.opts, moves: decodeMoves(spec.moves), i: 0 };
    this.seek(0);
  }

  seek(i: number) {
    const r = this.replay;
    if (!r) return;
    const n = Math.max(0, Math.min(r.moves.length, i));
    this.state = this.makeState(r.opts);
    let done = 0;
    try {
      for (; done < n; done++) play(this.state, r.moves[done]);
    } catch { /* broken record: play up to where it breaks */ }
    r.i = done;
    this.view = { ...this.freshView(), phase: 'over', clockEnd: Date.now(), version: this.view.version + 1 };
    this.listeners.forEach(fn => fn());
  }

  // Multiplayer match: everyone builds the same board from the same start. A guest who joins late replays the earlier moves silently.
  startMatch(match: MatchStart, me: number, net: NetRole, replay: (Move | null)[] = []) {
    if (this.parked) clearSave();
    this.replay = null;
    this.dispose();
    this.net = net;
    setMe(me);
    this.setup = { ...DEFAULT_SETUP, players: match.seats.length, level: match.level, moveSeconds: match.moveSeconds };
    this.reset(match);
    for (const m of replay) { play(this.state, m); this.moves.push(m); }
    this.emit();
    this.later(replay.length ? 0 : 600, () => this.advance());
  }

  get isGuest() { return this.net?.role === 'guest'; }
  get isNet() { return this.net != null; }

  dispose() {
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();
    this.stopTicker();
    stopTension();
    this.botTimer = null;
    this.banners = [];
    this.waitingSeat = null;
    this.away.clear();
    this.paused = false;
    this.deferred = [];
    this.parked = false;
    this.restored = false;
  }

  // The match is over, or the winner is decided and the result card hasn't been shown yet: the flow stops.
  private get halted() {
    return this.state.over || (this.state.decided && !this.decisionShown);
  }

  myStar() {
    return starOf(this.state, ME)!;
  }

  private buildOpts(): Opts {
    const s = this.setup;
    if (s.puzzle != null) {
      const def = PUZZLES.find(p => p.id === s.puzzle) ?? PUZZLES[0];
      return { rules: RULES_VERSION, puzzle: { map: def.map, limit: def.par + 1, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink ?? null } };
    }
    if (s.daily) return { rules: RULES_VERSION, seats: [{ kind: 'human' }], neutralLevel: 'normal', seed: seedOf(s.daily), size: DAILY.boardSize, neutrals: DAILY.bots };
    const seats = Array.from({ length: s.players }, (_, i) =>
      i === ME ? { kind: 'human' } : { kind: 'bot', level: s.aiLevel });
    // On Easy you move first; on Normal and Hard your place in the order is random too.
    return {
      rules: RULES_VERSION, seats, neutralLevel: s.level, seed: Math.floor(Math.random() * 2 ** 31), firstSeat: s.level === 'easy' ? ME : null, keepGoing: true,
      size: s.boardSize, neutrals: s.bots,
      personas: s.players > 1 && !!s.personas, obstacles: !!s.obstacles, teams: s.players === 4 && !!s.teams,
    };
  }

  private makeState(o: Opts): GameState {
    return (o.puzzle ? createPuzzle({ ...(o.puzzle as object), rules: o.rules } as unknown as Parameters<typeof createPuzzle>[0]) : createGame(o as unknown as Parameters<typeof createGame>[0])) as GameState;
  }

  private freshView(): View {
    return {
      phase: 'ready', sel: null, showThreats: false, timer: this.setup.moveSeconds,
      trails: [], lastMoves: [], bursts: [], slashes: [], floats: [], toast: null, banner: null, modeOverlay: false, sheet: null, inspect: null, bonus: null,
      bots: { done: 0, total: 0, currentId: null }, events: [],
      clockStart: Date.now(), clockEnd: null, watching: false, shake: 0, fall: null, hit: 0, version: 0,
    };
  }

  private reset(match?: MatchStart, preset?: { opts: Opts; moves: (Move | null)[] }) {
    // Seat names: profile names from the lobby in multiplayer, your name on one device (AI players stay "Player N").
    setSeatNames(match ? match.names ?? [] : [getProfile().name]);
    if (match) {
      this.opts = null;
      this.state = createGame({ seats: match.seats, neutralLevel: match.level, seed: match.seed, size: match.size, neutrals: match.neutrals, personas: !!match.personas, obstacles: !!match.obstacles, teams: !!match.teams, rules: match.rules ?? 1 });
    } else {
      this.opts = preset?.opts ?? this.buildOpts();
      this.state = this.makeState(this.opts);
    }
    this.moves = [];
    this.undoPoints = [];
    this.undosLeft = 3;
    for (const m of preset?.moves ?? []) { play(this.state, m); this.moves.push(m); }
    this.fast = false;
    this.decisionShown = false;
    this.bonusShown = false;
    this.statsDone = false;
    stopTension();
    this.view = this.freshView();
  }

  private advance() {
    if (this.net?.role === 'guest') return this.guestAdvance();
    const st = this.state;
    if (this.halted) return this.finish();
    const a = currentActor(st)!;
    if (a.kind === 'twin') return this.twinTurn(a);
    if (a.kind !== 'star') return this.botTurn();
    if (st.seats[a.seat].kind === 'human') return a.seat === ME ? this.myTurn() : this.remoteTurn(a);
    return this.starBotTurn(a);
  }

  // ------------------------------------------------------------ multiplayer: host

  // Wait for the remote player's move; when time runs out the host makes a safe move for them.
  private remoteTurn(a: Piece) {
    this.waitingSeat = a.kind === 'star' ? a.seat : null;
    this.emit({ phase: 'rival', timer: this.setup.moveSeconds });
    // We don't wait for a disconnected player: a safe move is played for them, and they continue if they come back.
    if (a.kind === 'star' && this.away.has(a.seat)) { this.later(500, () => this.awayMove()); return; }
    this.startTicker();
  }

  private awayMove() {
    const a = currentActor(this.state);
    if (!a || a.kind !== 'star' || this.waitingSeat !== a.seat || !this.away.has(a.seat)) return;
    this.commitRemote(chooseMove(this.state, a, 'normal'));
  }

  // A guest disconnected; they can come back for a short while.
  awaySeat(seat: number) {
    if (!this.state.seats[seat] || this.state.seats[seat].kind === 'bot') return;
    this.away.add(seat);
    this.toast(tr('{name} lost connection · waiting for them to return', { name: seatName(this.state, seat) }), 'info');
    this.emit();
    if (this.waitingSeat === seat) { this.stopTicker(); this.later(300, () => this.awayMove()); }
  }

  returnSeat(seat: number) {
    if (!this.away.delete(seat)) return;
    this.toast(tr('{name} is back', { name: seatName(this.state, seat) }), 'info');
    this.emit();
  }

  // Match history to send to a returning guest.
  movesSoFar() { return [...this.moves]; }

  // Connection status notice (guest screen).
  note(text: string) { this.toast(text, 'info'); }

  receiveMove(seat: number, move: Move | null) {
    const st = this.state;
    const a = currentActor(st);
    if (this.waitingSeat !== seat || !a || a.kind !== 'star' || a.seat !== seat) return;
    const moves = legalMoves(st, a, st.mode, move?.bonus ?? null);
    const legal = move ? moves.find(m => m.r === move.r && m.c === move.c && (m.bonus ?? null) === (move.bonus ?? null)) : null;
    if (move ? !legal : moves.length) return; // an illegal move, or a pass while moves exist: ignored
    this.commitRemote(legal ?? null);
  }

  private commitRemote(move: Move | null) {
    this.waitingSeat = null;
    this.stopTicker();
    const o = this.apply(move);
    this.emit({ phase: 'wait' });
    if (o) this.continueAfter(o, 450);
  }

  // An AI takes over the disconnected player's seat.
  dropSeat(seat: number) {
    const s = this.state.seats[seat];
    this.away.delete(seat);
    if (!s || s.kind === 'bot') return;
    s.kind = 'bot';
    s.level = this.setup.level;
    this.toast(tr('{name} left · an AI plays in their place', { name: seatName(this.state, seat) }), 'info');
    this.emit();
    if (this.waitingSeat === seat) {
      this.waitingSeat = null;
      this.stopTicker();
      this.starBotTurn(currentActor(this.state)!);
    }
  }

  // ------------------------------------------------------------ multiplayer: guest

  // A guest decides nothing by itself: it prepares the screen for whoever moves next and waits for the host's move.
  private guestAdvance() {
    const st = this.state;
    if (st.over) return this.finish();
    const a = currentActor(st);
    if (!a) return;
    if (a.kind === 'star' && a.seat === ME) return this.myTurn();
    if (a.kind === 'star') {
      this.emit({ phase: 'rival', timer: this.setup.moveSeconds });
      this.startTicker();
    } else if (isBot(a) && this.view.phase !== 'bot') {
      this.botQueue = this.botRun();
      this.emit({ phase: 'bot', bots: { done: 0, total: this.botQueue.length, currentId: null } });
    }
  }

  receiveNetMove(n: number, move: Move | null, hash?: string) {
    if (this.net?.role !== 'guest' || n !== this.moves.length + 1) return;
    const a = currentActor(this.state);
    this.stopTicker();
    const o = this.apply(move);
    if (hash && stateHash(this.state) !== hash) { this.net.desync?.(); return; }
    if (a && isBot(a)) this.view = { ...this.view, bots: { ...this.view.bots, done: this.botQueue.indexOf(a.id) + 1, currentId: a.id } };
    this.emit({ phase: a && isBot(a) && !o?.roundEnded ? 'bot' : 'wait' });
    if (!o) return;
    if (this.state.over) return this.finish();
    if (o.roundEnded) {
      // The host also shows the mode card for the same time and waits; the next move comes after it.
      this.emit({ phase: 'mode', modeOverlay: true });
      this.later(1300, () => { this.emit({ modeOverlay: false }); this.guestAdvance(); });
      return;
    }
    this.guestAdvance();
  }

  netLost() {
    this.stopTicker();
    this.toast(tr('Lost connection to the room'), 'info');
    this.emit();
  }

  private finish() {
    this.stopTicker();
    stopTension();
    // The winner is decided but bots remain: the result card asks "Continue / End", the clock keeps running.
    const pending = this.state.decided && !this.state.over;
    if (pending) this.decisionShown = true;
    if (this.state.over && !this.statsDone && !this.replay) this.recordResult();
    const daily = this.setup.daily;
    if (daily && this.state.over) {
      const s = this.state;
      saveDaily({ date: daily, score: s.seats[ME].score, won: isWinner(s, ME), round: s.round, time: clockText((this.view.clockEnd ?? Date.now()) - this.view.clockStart) });
    }
    const me = this.myStar();
    if (this.state.seats[ME].bonus && me && !this.bonusShown) {
      this.bonusShown = true;
      this.float(me.r, me.c, `+${this.state.seats[ME].bonus}`, PLAYER_COLORS[ME]);
      this.toast(tr('Survival bonus +{n}', { n: this.state.seats[ME].bonus }), 'sword');
    }
    this.emit({
      phase: 'over', clockEnd: pending ? null : this.view.clockEnd ?? Date.now(), sel: null, showThreats: false, modeOverlay: false,
    });
    // The result card opens after the last move and the banners have been seen.
    this.later(1600, () => { if (this.view.phase === 'over' && !this.view.sheet) this.emit({ sheet: { type: 'results' } }); });
    feel(isWinner(this.state, ME) ? 'win' : 'lose', isWinner(this.state, ME) ? BUZZ.win : BUZZ.lose);
  }

  // When the match ends: statistics, puzzle stars, deleting the unfinished save.
  private recordResult() {
    this.statsDone = true;
    const s = this.state, won = isWinner(s, ME);
    clearSave();
    if (s.puzzle) {
      const def = PUZZLES.find(p => p.id === this.setup.puzzle);
      if (won && def) recordPuzzle(def.id, s.puzzle.used <= def.par ? 3 : 2);
      void syncCloud();
      return;
    }
    recordMatch({
      won, score: s.seats[ME].score, takes: s.seats[ME].takes, rounds: s.round,
      ms: Date.now() - this.view.clockStart, daily: !!this.setup.daily,
    });
    void syncCloud(); // to the platform cloud save in the phone app; does nothing on the web
  }

  // Keep fighting the bots after the winner is decided.
  resume() {
    if (!this.state.decided || this.state.over) return;
    this.emit({ sheet: null, phase: 'wait' });
    this.advance();
  }

  // End the match after the winner is decided.
  endNow() {
    endMatch(this.state);
    this.emit({ sheet: null });
    this.finish();
  }

  // ------------------------------------------------------------ your turn

  private myTurn() {
    if (this.undoPoints[this.undoPoints.length - 1] !== this.moves.length) this.undoPoints.push(this.moves.length);
    this.emit({ phase: 'mine', sel: null, showThreats: false, bonus: null, timer: this.setup.moveSeconds });
    feel('myTurn', BUZZ.myTurn);
    if (!legalMoves(this.state, this.myStar(), this.state.mode).length) {
      this.toast(tr('No square to move to · turn passed'), 'info');
      this.emit();
      this.later(1200, () => this.commitMine(null));
      return;
    }
    this.startTicker();
  }

  private isMyMove() {
    return this.view.phase === 'mine' || this.view.phase === 'preview';
  }

  // Pick a square. Tapping the selected square again confirms.
  select(move: Move) {
    if (!this.isMyMove()) return;
    this.view = { ...this.view, inspect: null };
    // Play without preview: the tapped square is played right away.
    if (settings.quick && this.view.phase === 'mine') { feel('move', BUZZ.confirm); return this.commitMine(move); }
    const sel = this.view.sel;
    if (this.view.phase === 'preview' && sel && sel.r === move.r && sel.c === move.c) return this.confirm();
    feel('select', BUZZ.select);
    this.emit({ phase: 'preview', sel: move, showThreats: false });
  }

  confirm() {
    const { phase, sel } = this.view;
    if (phase !== 'preview' || !sel) return;
    feel('move', BUZZ.confirm);
    this.commitMine(sel);
  }

  // Pick or drop a bonus. Armor can't be picked; it works by itself.
  selectBonus(kind: BonusKind) {
    if (!this.isMyMove() || kind === 'armor' || !this.state.seats[ME].bonuses[kind]) return;
    feel('select', BUZZ.select);
    this.emit({ phase: 'mine', sel: null, showThreats: false, bonus: this.view.bonus === kind ? null : kind });
  }

  // Undo: on Easy (3 times per match) and in puzzles (unlimited). The match is rebuilt from the recorded moves at the start of your previous turn.
  get undoAvailable() {
    if (this.net || this.replay || this.setup.daily) return false;
    if (this.state.puzzle) return true;
    return (this.setup.players === 1 ? this.setup.level : this.setup.aiLevel) === 'easy';
  }
  get canUndo() {
    return this.undoAvailable && this.view.phase === 'mine' && this.undoPoints.length >= 2 && (!!this.state.puzzle || this.undosLeft > 0);
  }
  get undosRemaining() { return this.state.puzzle ? null : this.undosLeft; }

  undo() {
    if (!this.canUndo || !this.opts) return;
    const target = this.undoPoints[this.undoPoints.length - 2];
    const keep = this.moves.slice(0, target);
    const { clockStart, clockEnd, events } = this.view;
    const points = this.undoPoints.slice(0, -2);
    const left = this.state.puzzle ? this.undosLeft : this.undosLeft - 1;
    this.dispose();
    this.state = this.makeState(this.opts);
    this.moves = [];
    for (const m of keep) { play(this.state, m); this.moves.push(m); }
    this.undoPoints = points;
    this.undosLeft = left;
    this.view = { ...this.freshView(), clockStart, clockEnd, events: events.filter(e => e.round < this.state.round), phase: 'wait', version: this.view.version + 1 };
    this.toast(tr('Move undone'), 'info');
    this.saveGame();
    this.emit();
    this.later(250, () => this.advance());
  }

  cancel() {
    if (this.view.phase === 'preview') this.emit({ phase: 'mine', sel: null });
  }

  toggleThreats() {
    if (!this.isMyMove()) return;
    this.emit({ phase: 'mine', sel: null, showThreats: !this.view.showThreats });
  }

  private autoMove() {
    const m = chooseMove(this.state, this.myStar(), 'normal');
    this.toast(tr("Time's up · a safe move was played"), 'clock');
    this.commitMine(m);
  }

  private commitMine(move: Move | null) {
    this.stopTicker();
    if (this.net?.role === 'guest') {
      this.net.send?.(move);
      this.emit({ phase: 'wait', sel: null, showThreats: false });
      return;
    }
    const o = this.apply(move);
    this.emit({ phase: 'wait', sel: null, showThreats: false, bonus: null });
    if (o) this.continueAfter(o, move?.type === 'take' ? 750 : 500); // a short pause after you take: let the moment land
  }

  // ------------------------------------------------------------ AI players, the Twin and bots

  private starBotTurn(a: Piece) {
    this.emit({ phase: 'rival', timer: this.setup.moveSeconds });
    this.startTicker();
    this.later(900 + Math.random() * 700, () => {
      this.stopTicker();
      const o = this.apply(chooseMove(this.state, a));
      this.emit({ phase: 'wait' });
      if (o) this.continueAfter(o, 450);
    });
  }

  // The Twin moves right after you, in your direction; after a short gap, without a separate phase.
  private twinTurn(a: Piece) {
    this.emit({ phase: 'wait' });
    this.later(260, () => {
      const o = this.apply(chooseMove(this.state, a));
      this.emit();
      if (o) this.continueAfter(o, 300);
    });
  }

  private botTurn() {
    this.botQueue = this.botRun();
    this.fast = settings.fastBots;
    this.emit({ phase: 'bot', bots: { done: 0, total: this.botQueue.length, currentId: null } });
    this.botTimer = this.later(250, () => this.botStep());
  }

  // The order is mixed: this run is the bots that move back to back until the next star or the Twin.
  private botRun() {
    const st = this.state, run: string[] = [];
    for (const id of st.order.slice(st.turn)) {
      const p = pieceById(st, id);
      if (!p || !p.alive) continue;
      if (!isBot(p)) break;
      run.push(id);
    }
    return run;
  }

  // One bot moves; when sped up, all the rest at once.
  private botStep() {
    this.botTimer = null;
    const st = this.state;
    let o: Outcome | null = null;
    do {
      const a = currentActor(st);
      if (!a || !isBot(a)) break;
      const done = this.botQueue.indexOf(a.id) + 1;
      o = this.apply(chooseMove(st, a));
      this.view = { ...this.view, bots: { ...this.view.bots, done, currentId: a.id } };
      if (!o || o.roundEnded || this.halted) break;
    } while (this.fast);
    this.emit();

    const next = currentActor(st);
    if (o && !o.roundEnded && !this.halted && next && isBot(next)) {
      const stagger = Math.max(40, Math.min(80, Math.floor(1000 / Math.max(1, this.view.bots.total)))) * SPEED[settings.speed];
      this.botTimer = this.later(this.fast ? 0 : stagger, () => this.botStep());
      return;
    }
    this.later(380, () => {
      this.emit({ bots: { ...this.view.bots, currentId: null } });
      if (o) this.continueAfter(o, 0);
      else this.advance();
    });
  }

  speedUp() {
    if (this.view.phase !== 'bot') return;
    this.fast = true;
    if (this.botTimer != null) {
      clearTimeout(this.botTimer);
      this.timers.delete(this.botTimer);
      this.botStep();
    }
  }

  // ------------------------------------------------------------ a move and its results

  private continueAfter(o: Outcome, pause: number) {
    if (this.halted) {
      this.later(pause, () => this.finish());
    } else if (o.roundEnded) {
      // The mode card comes after the end-of-round banners (ring collapsed, you are out) have been read.
      this.later(pause + this.bannerBacklog(), () => this.modeChange());
    } else {
      this.later(pause, () => this.advance());
    }
  }

  private modeChange() {
    feel('mode', BUZZ.mode);
    this.emit({ phase: 'mode', modeOverlay: true });
    this.later(settings.fastBots ? 800 : 1300, () => {
      // A clear warning at the start of a collapse round: whoever stays on the outer ring at the end of it is out.
      if (collapseDue(this.state)) {
        this.toast(tr('The outer ring collapses at the end of this round!'), 'ring');
        feel('collapse', BUZZ.collapse);
        startTension();
      }
      this.emit({ modeOverlay: false });
      this.advance();
    });
  }

  // Plays the current piece's move in the engine and produces trails, bursts, notices and log entries.
  // The caller does the emit.
  private apply(move: Move | null): Outcome | null {
    const st = this.state;
    const actor = currentActor(st);
    if (!actor) return null;
    const from = { r: actor.r, c: actor.c };
    const aliveBefore = new Set(st.pieces.filter(p => p.alive).map(p => p.id));
    const round = st.round, ring = st.ring;
    const victim = move?.type === 'take' && move.targetId ? pieceById(st, move.targetId) ?? null : null;
    const myBonuses = { ...st.seats[ME].bonuses };
    const scoreBefore = st.seats[ME].score;

    play(st, move);

    // Bonus: using one, being saved by armor, earning one.
    if (move?.bonus && actor.kind === 'star' && actor.seat === ME) {
      this.toast(move.bonus === 'double' && st.extra ? tr('Double move! Now play your second move.') : `${tr(BONUS_NAMES[move.bonus])}!`, 'info');
      feel(move.bonus === 'step' ? 'useStep' : move.bonus === 'double' ? 'useDouble' : 'useSwap', BUZZ.bonusUse);
    }
    if (victim?.alive && victim.kind === 'star') {
      this.toast(victim.seat === ME ? tr('Your armor saved you!') : tr('{name} survived thanks to armor', { name: labelOf(st, victim) }), 'info');
      this.burst(victim.r, victim.c, '#E9F0FF');
      feel('armor', BUZZ.armor);
    }
    for (const k of Object.keys(myBonuses) as BonusKind[]) {
      if (st.seats[ME].bonuses[k] > myBonuses[k]) { this.toast(tr('Bonus earned: {name}', { name: tr(BONUS_NAMES[k]) }), 'info'); feel('bonusGain', BUZZ.bonusGain); }
    }
    this.moves.push(move);
    this.saveGame();
    if (this.net?.role === 'host') this.net.broadcast?.(this.moves.length, move, stateHash(st));

    const fallen = st.pieces.filter(p => aliveBefore.has(p.id) && !p.alive && p !== victim);
    const collapsed = st.ring !== ring;
    const events = [...this.view.events];

    if (move) {
      this.trail(from, { r: move.r, c: move.c }, colorOf(actor));
      const last = [...this.view.lastMoves.filter(l => l.id !== actor.id && l.round === round), { id: actor.id, round, from, to: { r: move.r, c: move.c }, color: colorOf(actor) }];
      this.view = { ...this.view, lastMoves: last.slice(-6) };
    }

    if (victim && move && !victim.alive) {
      events.push({ key: this.key(), round, attackerId: actor.id, victimId: victim.id, at: this.moves.length });
      const mine = actor.kind === 'star' && actor.seat === ME;
      this.burst(move.r, move.c, colorOf(actor), mine);
      this.slash(from, { r: move.r, c: move.c }, colorOf(actor), mine);
      if (!mine) sound('take');
      this.view = { ...this.view, shake: this.view.shake + 1 };
      const me = victim.kind === 'star' && victim.seat === ME;
      // Only stars collect points: the taken piece's value floats over the board and the scoreboard updates at once.
      if (actor.kind === 'star') this.float(move.r, move.c, `+${POINTS[victim.kind]}`, colorOf(actor), mine);
      if (actor.kind === 'twin' && st.seats[ME].score > scoreBefore) {
        const pts = POINTS[victim.kind] * TWIN_TAKE_MULT;
        this.float(move.r, move.c, `+${pts}`, PLAYER_COLORS[ME]);
        this.toast(tr('Your mirror took {obj}! +{pts} (2×)', { obj: objectOf(st, victim), pts }), 'sword');
        this.later(120, () => sound('points'));
      }
      if (mine) { this.toast(tr('You took {obj}! +{pts}', { obj: objectOf(st, victim), pts: POINTS[victim.kind] }), 'sword'); feel('take', victim.kind === 'star' ? BUZZ.takeStar : BUZZ.take); this.later(120, () => sound('points')); }
      if (me) {
        this.toast(tr('{name} swung their sword. You are out!', { name: subjectOf(st, actor) }), 'sword');
        feel('out', BUZZ.takenOrOut);
        this.view = { ...this.view, hit: this.view.hit + 1 };
      }
      if (victim.kind === 'star') {
        this.banner(me ? tr("You're out") : tr('{name} is out', { name: seatName(st, victim.seat) }),
          tr('Taken by {name} · on {n} pts', { name: labelOf(st, actor), n: st.seats[victim.seat].score }), PLAYER_COLORS[victim.seat], victim.id);
      }
    }

    if (collapsed) {
      stopTension();
      this.view = { ...this.view, fall: { key: this.key(), ring: st.ring - 1 } };
      for (const p of fallen) {
        events.push({ key: this.key(), round, attackerId: null, victimId: p.id, at: this.moves.length });
        this.burst(p.r, p.c, HAZARD);
      }
      const side = st.size - 2 * st.ring;
      const stars = fallen.filter(p => p.kind === 'star');
      const iFell = stars.some(p => p.kind === 'star' && p.seat === ME);
      let sub = fallen.length ? tr('{n} {n:piece|pieces} fell · arena {side}×{side}', { n: fallen.length, side }) : tr('Nobody fell · arena {side}×{side}', { side });
      if (iFell) {
        sub = tr('You stayed on the ring and are out');
        this.view = { ...this.view, hit: this.view.hit + 1 };
      }
      else if (stars.length) sub = tr('{names} fell · arena {side}×{side}', { names: stars.map(p => labelOf(st, p)).join(', '), side });
      this.banner(tr('Outer ring collapsed'), sub, HAZARD, null);
      feel(iFell ? 'out' : 'collapse', iFell ? BUZZ.takenOrOut : BUZZ.collapse);
    }

    this.view = { ...this.view, events };
    return { roundEnded: st.round !== round, collapsed };
  }

  // ------------------------------------------------------------ short-lived visuals

  private trail(from: Spot, to: Spot, color: string) {
    const key = this.key();
    this.view = { ...this.view, trails: [...this.view.trails, { key, from, to, color }] };
    this.later(700, () => this.emit({ trails: this.view.trails.filter(t => t.key !== key) }));
  }

  private burst(r: number, c: number, color: string, big = false) {
    const key = this.key();
    this.view = { ...this.view, bursts: [...this.view.bursts, { key, r, c, color, big }] };
    this.later(big ? 700 : 450, () => this.emit({ bursts: this.view.bursts.filter(b => b.key !== key) }));
  }

  private slash(from: Spot, to: Spot, color: string, big: boolean) {
    const key = this.key();
    const angle = Math.round(Math.atan2(Math.sign(to.r - from.r), Math.sign(to.c - from.c)) * 180 / Math.PI);
    this.view = { ...this.view, slashes: [...this.view.slashes, { key, r: to.r, c: to.c, angle, color, big }] };
    sound(big ? 'slashBig' : 'slash');
    this.later(big ? 900 : 640, () => this.emit({ slashes: this.view.slashes.filter(s => s.key !== key) }));
  }

  private float(r: number, c: number, text: string, color: string, big = false) {
    const key = this.key();
    this.view = { ...this.view, floats: [...this.view.floats, { key, r, c, text, color, big }] };
    this.later(big ? 1500 : 1000, () => this.emit({ floats: this.view.floats.filter(f => f.key !== key) }));
  }

  private toast(text: string, icon: Toast['icon']) {
    const key = this.key();
    this.view = { ...this.view, toast: { key, text, icon } };
    this.later(1800, () => { if (this.view.toast?.key === key) this.emit({ toast: null }); });
  }

  // Banners never overlap; they show one after another, BANNER_MS each.
  private banner(title: string, sub: string, color: string, pieceId: string | null) {
    this.banners.push({ title, sub, color, pieceId });
    if (!this.view.banner) this.nextBanner();
  }

  private nextBanner() {
    const b = this.banners.shift();
    if (!b) {
      this.view = { ...this.view, banner: null };
      return;
    }
    this.view = { ...this.view, banner: { key: this.key(), ...b } };
    this.bannerUntil = Date.now() + BANNER_MS;
    this.later(BANNER_MS, () => { this.nextBanner(); this.emit(); });
  }

  private bannerBacklog() {
    const now = this.view.banner ? Math.max(0, this.bannerUntil - Date.now()) : 0;
    return now + this.banners.length * BANNER_MS;
  }

  // ------------------------------------------------------------ sheets

  // A second tap on the same piece closes it.
  inspectPiece(id: string) {
    feel('select', BUZZ.select);
    this.emit({ inspect: this.view.inspect === id ? null : id });
  }
  closeInspect() { if (this.view.inspect) this.emit({ inspect: null }); }
  openResults() { this.emit({ sheet: { type: 'results' } }); }
  openLog() { this.emit({ sheet: { type: 'log' } }); }
  // The bonus guide. In a local match the clock stops while you read it.
  openBonusGuide() { this.pause(); this.emit({ sheet: { type: 'bonus' } }); }
  openMenu() { this.pause(); this.emit({ sheet: { type: 'menu' } }); }
  closeSheet() {
    if (!this.view.sheet) return;
    const wasMenu = this.view.sheet.type === 'menu' || this.view.sheet.type === 'bonus';
    this.emit({ sheet: null });
    if (wasMenu) this.unpause();
  }
  watch() { this.emit({ watching: true }); }

  // ------------------------------------------------------------ timers

  private startTicker() {
    this.stopTicker();
    if (this.state.puzzle) return; // no timer in puzzles
    this.ticker = window.setInterval(() => {
      const t = this.view.timer - 1;
      if (this.isMyMove()) {
        if (t <= 0) {
          this.stopTicker();
          this.emit({ timer: 0 });
          if (this.net?.role !== 'guest') this.autoMove(); // on a guest, the host manages the timer
          return;
        }
        if (t <= 5) feel('tick', BUZZ.lastSeconds);
        this.emit({ timer: t });
      } else if (this.view.phase === 'rival') {
        this.emit({ timer: Math.max(0, t) });
        if (t <= 0 && this.waitingSeat != null) {
          const a = currentActor(this.state)!;
          this.toast(tr("Time's up for {name}", { name: labelOf(this.state, a) }), 'clock');
          this.commitRemote(chooseMove(this.state, a, 'normal'));
        }
      } else {
        this.stopTicker();
      }
    }, 1000);
  }

  private stopTicker() {
    if (this.ticker != null) clearInterval(this.ticker);
    this.ticker = null;
  }

  private later(ms: number, fn: () => void) {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (this.paused) this.deferred.push(fn); else fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  private key() {
    return ++this.seq;
  }

  private emit(patch?: Partial<View>) {
    this.view = { ...this.view, ...patch, version: this.view.version + 1 };
    this.listeners.forEach(fn => fn());
  }
}
