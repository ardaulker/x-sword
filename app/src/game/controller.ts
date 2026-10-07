// Maçın akışı: sıra kimde, süre, bot turu, mod değişimi, bildirimler.
// Kuralı motor (engine/) bilir; burası yalnız onun fonksiyonlarını çağırır ve ekrana ne olduğunu söyler.

import {
  BONUS_NAMES, POINTS, isWinner, TWIN_TAKE_MULT, collapseDue, createGame, createPuzzle, endMatch, play, currentActor, legalMoves, pieceById, starOf,
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

// Çok oyunculu maçta bu cihazın rolü. Kurucu maçı yürütür ve her hamleyi yayınlar;
// misafir kendi hamlesini kurucuya gönderir, bütün hamleleri kurucudan alıp uygular.
export interface NetRole {
  role: 'host' | 'guest';
  broadcast?: (n: number, move: Move | null) => void;
  send?: (move: Move | null) => void;
}

export type Phase =
  | 'hazir'     // maç başlıyor
  | 'sen'       // sıra sende
  | 'onizleme'  // bir kare seçtin, onay bekleniyor
  | 'rakip'     // başka bir yıldız (yapay zekâ oyuncu) oynuyor
  | 'bot'       // arena botları oynuyor
  | 'bekle'     // bir hamle oynandı, sıradaki adım geliyor
  | 'mod'       // mod değişiyor
  | 'bitti';

export interface Setup {
  players: number;
  level: Level;        // arena botlarının zekâsı
  aiLevel: Level;      // yapay zekâ rakiplerin (2–4 oyunculu) zekâsı
  moveSeconds: number;
  /** Yalnız tek oyunculuda: tahta kenarı ve arena botu sayısı. */
  boardSize: number;
  bots: number;
  /** Günlük meydan okuma: tarih yazısı (YYYY-AA-GG). Doluysa tahta, bot ve zorluk sabittir. */
  daily?: string | null;
  /** Bulmaca numarası; doluysa maç o bulmacadır. */
  puzzle?: number | null;
  /** Seçenekler (varsayılan kapalı): rakip kişilikleri, engel kareleri, takımlı (yalnız 4 oyuncu). */
  personas?: boolean;
  obstacles?: boolean;
  teams?: boolean;
}
// players 1: tek oyunculu mod (sen + aynan İkiz + botlar). 2–4: yapay zekâ oyunculara karşı.
export const DEFAULT_SETUP: Setup = { players: 1, level: 'normal', aiLevel: 'normal', moveSeconds: 20, boardSize: 9, bots: 14 };

export interface Spot { r: number; c: number }
export interface Trail { key: number; from: Spot; to: Spot; color: string }
export interface Burst { key: number; r: number; c: number; color: string; big?: boolean }
export interface Float { key: number; r: number; c: number; text: string; color: string; big?: boolean }
// Bu turda oynanan son hamleler: tahtada soluk kesik çizgi olarak kalır.
export interface LastMove { id: string; round: number; from: Spot; to: Spot; color: string }
export interface Toast { key: number; text: string; icon: 'sword' | 'clock' | 'info' | 'ring' }
export interface Banner { key: number; title: string; sub: string; color: string; pieceId: string | null }
// attackerId null: taş çöken halkada düştü.
export interface TakeEvent { key: number; round: number; attackerId: string | null; victimId: string; at: number } // at: o ana kadar oynanan hamle sayısı (tekrarda o ana gitmek için)
export type Sheet = { type: 'kayit' } | { type: 'menu' } | { type: 'sonuc' } | { type: 'ipucu'; step: number } | null;

export interface View {
  phase: Phase;
  sel: Move | null;
  showThreats: boolean;
  timer: number;
  trails: Trail[];
  lastMoves: LastMove[];
  bursts: Burst[];
  floats: Float[];
  toast: Toast | null;
  banner: Banner | null;
  modeOverlay: boolean;
  sheet: Sheet;
  inspect: string | null;
  bonus: BonusKind | null; // sırandayken seçtiğin bonus: gidilebilir kareler ona göre // dokunulan taş: yolları ve hedefi tahtada görünür, büyük kart açılmaz
  bots: { done: number; total: number; currentId: string | null };
  events: TakeEvent[];
  clockStart: number;
  clockEnd: number | null;
  watching: boolean;
  shake: number;
  fall: { key: number; ring: number } | null; // az önce çöken halka (animasyon için)
  hit: number; // sen alındığında ya da düştüğünde artar: ekran kırmızı parlar
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
  autoMap = false; // ilk maçlarda tehlike haritası kendiliğinden açık
  private bonusShown = false;
  private seq = 0;
  private net: NetRole | null = null;
  private moves: (Move | null)[] = []; // maçın bütün hamleleri, sırayla
  private waitingSeat: number | null = null; // kurucu: hamlesi beklenen uzak oyuncu
  private away = new Set<number>(); // kurucu: bağlantısı kopmuş, dönmesi beklenen koltuklar
  private paused = false;
  private pausedAt = 0;
  private deferred: (() => void)[] = []; // duraklatılmışken ateşlenen zamanlayıcılar, devam edince çalışır
  private parked = false;   // ana menüye dönüldü, maç duraklatılıp saklanıyor
  private restored = false; // maç cihazdaki kayıttan geldi: devam edince sıradaki adım başlatılmalı
  private opts: Opts | null = null; // bu maçı kuran createGame seçenekleri (kayıt ve tekrar için)
  private statsDone = false;
  private undoPoints: number[] = []; // her hamle sırasının başındaki hamle sayısı (geri al için)
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

  // ------------------------------------------------------------ maç

  start() {
    // İlk üç yerel maçta kısa bir ipucu kartı; "Anladım" deyince maç başlar.
    const step = this.net || !settings.tips || this.setup.puzzle != null ? null : coachStep();
    this.autoMap = step != null && step < 2;
    if (step != null) { this.later(500, () => this.emit({ sheet: { type: 'ipucu', step } })); return; }
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

  // Aynı tahtayla baştan başla (günlük, bulmaca ve normal maçta da aynı yerleşim).
  restart() {
    this.newGame(this.setup, this.opts ?? undefined);
  }

  // ------------------------------------------------------------ duraklatma, saklama, sürdürme

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
    if (!this.halted && ['sen', 'onizleme', 'rakip'].includes(this.view.phase)) this.startTicker();
    if (!this.halted && collapseDue(this.state)) startTension();
  }

  // Oyun ekranından çıkılırken: yarım kalan yerel maç saklanır, yoksa temizlenir.
  leave() {
    if (!this.net && !this.replay && !this.state.over && !this.parked) {
      this.pause();
      this.parked = true;
      this.saveGame();
    } else if (!this.parked) {
      this.dispose();
    }
  }

  // Maç tekrarı bağlantısı için kayıt (yalnız yerel maç).
  replaySpec(): ReplaySpec | null {
    return !this.net && this.opts ? { opts: this.opts, moves: encodeMoves(this.moves) } : null;
  }

  get canResume() { return !this.net && this.parked && !this.state.over; }

  // Ana menüde "Devam et" için kısa özet.
  get resumeInfo() { return { round: this.state.round, score: this.state.seats[ME]?.score ?? 0 }; }

  unpark() {
    if (!this.parked) return;
    this.parked = false;
    this.emit({ sheet: null });
    this.unpause();
    if (this.restored) { this.restored = false; this.later(300, () => this.advance()); }
  }

  // Saklanan maçı bırak (yeni maç başlıyor).
  discardParked() {
    if (!this.parked) return;
    this.dispose();
    clearSave();
  }

  private saveGame() {
    if (this.net || !this.opts || this.state.over || this.replay) return;
    writeSave({ v: 1, opts: this.opts, setup: this.setup, moves: encodeMoves(this.moves), elapsed: (this.view.clockEnd ?? Date.now()) - this.view.clockStart });
  }

  // Uygulama yeniden açılınca yarım kalan maç saklı durur; ana menüde "Devam et" çıkar.
  private restoreFromStorage() {
    const s = readSave();
    if (!s) return false;
    try {
      setMe(0);
      this.setup = { ...DEFAULT_SETUP, ...s.setup };
      this.reset(undefined, { opts: s.opts, moves: decodeMoves(s.moves) });
      if (this.state.over) { clearSave(); return false; }
      const now = Date.now();
      this.view = { ...this.view, phase: 'bekle', clockStart: now - s.elapsed, clockEnd: now };
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

  // ------------------------------------------------------------ maç tekrarı

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
    } catch { /* bozuk kayıt: gelinen yere kadar */ }
    r.i = done;
    this.view = { ...this.freshView(), phase: 'bitti', clockEnd: Date.now(), version: this.view.version + 1 };
    this.listeners.forEach(fn => fn());
  }

  // Çok oyunculu maç: herkes aynı başlangıçla aynı tahtayı kurar. Sonradan katılan misafir eski hamleleri sessizce oynar.
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

  // Maç bitti ya da kazanan belli oldu ve sonuç kartı henüz gösterilmedi: oyun akışı durur.
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
      return { puzzle: { map: def.map, limit: def.par + 1, mode: def.mode, bonuses: def.bonuses, shrink: def.shrink ?? null } };
    }
    if (s.daily) return { seats: [{ kind: 'human' }], neutralLevel: 'normal', seed: seedOf(s.daily), size: DAILY.boardSize, neutrals: DAILY.bots };
    const seats = Array.from({ length: s.players }, (_, i) =>
      i === ME ? { kind: 'human' } : { kind: 'bot', level: s.aiLevel });
    // Kolayda ilk sen oynarsın; normal ve zorda sıradaki yerin de rastgele.
    return {
      seats, neutralLevel: s.level, seed: Math.floor(Math.random() * 2 ** 31), firstSeat: s.level === 'kolay' ? ME : null, keepGoing: true,
      size: s.boardSize, neutrals: s.bots,
      personas: s.players > 1 && !!s.personas, obstacles: !!s.obstacles, teams: s.players === 4 && !!s.teams,
    };
  }

  private makeState(o: Opts): GameState {
    return (o.puzzle ? createPuzzle(o.puzzle as unknown as Parameters<typeof createPuzzle>[0]) : createGame(o as unknown as Parameters<typeof createGame>[0])) as GameState;
  }

  private freshView(): View {
    return {
      phase: 'hazir', sel: null, showThreats: false, timer: this.setup.moveSeconds,
      trails: [], lastMoves: [], bursts: [], floats: [], toast: null, banner: null, modeOverlay: false, sheet: null, inspect: null, bonus: null,
      bots: { done: 0, total: 0, currentId: null }, events: [],
      clockStart: Date.now(), clockEnd: null, watching: false, shake: 0, fall: null, hit: 0, version: 0,
    };
  }

  private reset(match?: MatchStart, preset?: { opts: Opts; moves: (Move | null)[] }) {
    // Koltuk adları: çok oyunculuda lobideki profil adları, tek cihazda senin adın (yapay zekâ "Oyuncu N" kalır).
    setSeatNames(match ? match.names ?? [] : [getProfile().name]);
    if (match) {
      this.opts = null;
      this.state = createGame({ seats: match.seats, neutralLevel: match.level, seed: match.seed, size: match.size, neutrals: match.neutrals, personas: !!match.personas, obstacles: !!match.obstacles, teams: !!match.teams });
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

  // ------------------------------------------------------------ çok oyunculu: kurucu

  // Uzak oyuncunun hamlesi beklenir; süre biterse kurucu onun yerine güvenli bir hamle yapar.
  private remoteTurn(a: Piece) {
    this.waitingSeat = a.kind === 'star' ? a.seat : null;
    this.emit({ phase: 'rakip', timer: this.setup.moveSeconds });
    // Bağlantısı kopan oyuncuyu bekletmeyiz: onun yerine güvenli hamle oynanır, dönerse kaldığı yerden devam eder.
    if (a.kind === 'star' && this.away.has(a.seat)) { this.later(500, () => this.awayMove()); return; }
    this.startTicker();
  }

  private awayMove() {
    const a = currentActor(this.state);
    if (!a || a.kind !== 'star' || this.waitingSeat !== a.seat || !this.away.has(a.seat)) return;
    this.commitRemote(chooseMove(this.state, a, 'normal'));
  }

  // Bir misafirin bağlantısı koptu; kısa bir süre geri dönebilir.
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

  // Dönen misafire gönderilecek maç geçmişi.
  movesSoFar() { return [...this.moves]; }

  // Bağlantı durumu bildirimi (misafir ekranı).
  note(text: string) { this.toast(text, 'info'); }

  receiveMove(seat: number, move: Move | null) {
    const st = this.state;
    const a = currentActor(st);
    if (this.waitingSeat !== seat || !a || a.kind !== 'star' || a.seat !== seat) return;
    const moves = legalMoves(st, a, st.mode, move?.bonus ?? null);
    const legal = move ? moves.find(m => m.r === move.r && m.c === move.c && (m.bonus ?? null) === (move.bonus ?? null)) : null;
    if (move ? !legal : moves.length) return; // geçersiz hamle ya da hamlesi varken pas: yok sayılır
    this.commitRemote(legal ?? null);
  }

  private commitRemote(move: Move | null) {
    this.waitingSeat = null;
    this.stopTicker();
    const o = this.apply(move);
    this.emit({ phase: 'bekle' });
    if (o) this.continueAfter(o, 450);
  }

  // Bağlantısı kopan oyuncunun yerine yapay zekâ geçer.
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

  // ------------------------------------------------------------ çok oyunculu: misafir

  // Misafir hiçbir şeye kendi karar vermez: sırası gelen taşa göre ekranı hazırlar ve kurucunun hamlesini bekler.
  private guestAdvance() {
    const st = this.state;
    if (st.over) return this.finish();
    const a = currentActor(st);
    if (!a) return;
    if (a.kind === 'star' && a.seat === ME) return this.myTurn();
    if (a.kind === 'star') {
      this.emit({ phase: 'rakip', timer: this.setup.moveSeconds });
      this.startTicker();
    } else if (isBot(a) && this.view.phase !== 'bot') {
      this.botQueue = this.botRun();
      this.emit({ phase: 'bot', bots: { done: 0, total: this.botQueue.length, currentId: null } });
    }
  }

  receiveNetMove(n: number, move: Move | null) {
    if (this.net?.role !== 'guest' || n !== this.moves.length + 1) return;
    const a = currentActor(this.state);
    this.stopTicker();
    const o = this.apply(move);
    if (a && isBot(a)) this.view = { ...this.view, bots: { ...this.view.bots, done: this.botQueue.indexOf(a.id) + 1, currentId: a.id } };
    this.emit({ phase: a && isBot(a) && !o?.roundEnded ? 'bot' : 'bekle' });
    if (!o) return;
    if (this.state.over) return this.finish();
    if (o.roundEnded) {
      // Kurucu da mod kartını aynı süre gösterip bekler; sıradaki hamle ondan sonra gelir.
      this.emit({ phase: 'mod', modeOverlay: true });
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
    // Kazanan belli ama botlar var: sonuç kartı "Devam et / Bitir" sorar, saat durmaz.
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
      phase: 'bitti', clockEnd: pending ? null : this.view.clockEnd ?? Date.now(), sel: null, showThreats: false, modeOverlay: false,
    });
    // Son hamleyi ve bantları gördükten sonra sonuç kartı açılır.
    this.later(1600, () => { if (this.view.phase === 'bitti' && !this.view.sheet) this.emit({ sheet: { type: 'sonuc' } }); });
    feel(isWinner(this.state, ME) ? 'win' : 'lose', isWinner(this.state, ME) ? BUZZ.win : BUZZ.lose);
  }

  // Maç bitince: istatistik, bulmaca yıldızı, yarım kalan kaydın silinmesi.
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
    void syncCloud(); // telefon uygulamasında platform bulut kaydına; web'de bir şey yapmaz
  }

  // Kazanan belliyken botlarla savaşa devam et.
  resume() {
    if (!this.state.decided || this.state.over) return;
    this.emit({ sheet: null, phase: 'bekle' });
    this.advance();
  }

  // Kazanan belliyken maçı bitir.
  endNow() {
    endMatch(this.state);
    this.emit({ sheet: null });
    this.finish();
  }

  // ------------------------------------------------------------ senin sıran

  private myTurn() {
    if (this.undoPoints[this.undoPoints.length - 1] !== this.moves.length) this.undoPoints.push(this.moves.length);
    this.emit({ phase: 'sen', sel: null, showThreats: false, bonus: null, timer: this.setup.moveSeconds });
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
    return this.view.phase === 'sen' || this.view.phase === 'onizleme';
  }

  // Bir kare seç. Seçili kareye ikinci kez dokunmak onaylar.
  select(move: Move) {
    if (!this.isMyMove()) return;
    this.view = { ...this.view, inspect: null };
    // Önizlemesiz oyna: dokunduğun kare hemen oynanır.
    if (settings.quick && this.view.phase === 'sen') { feel('move', BUZZ.confirm); return this.commitMine(move); }
    const sel = this.view.sel;
    if (this.view.phase === 'onizleme' && sel && sel.r === move.r && sel.c === move.c) return this.confirm();
    feel('select', BUZZ.select);
    this.emit({ phase: 'onizleme', sel: move, showThreats: false });
  }

  confirm() {
    const { phase, sel } = this.view;
    if (phase !== 'onizleme' || !sel) return;
    feel('move', BUZZ.confirm);
    this.commitMine(sel);
  }

  // Bonusu seç ya da bırak. Zırh seçilmez, kendiliğinden çalışır.
  selectBonus(kind: BonusKind) {
    if (!this.isMyMove() || kind === 'armor' || !this.state.seats[ME].bonuses[kind]) return;
    feel('select', BUZZ.select);
    this.emit({ phase: 'sen', sel: null, showThreats: false, bonus: this.view.bonus === kind ? null : kind });
  }

  // Geri al: kolay modda (maçta 3 kez) ve bulmacada (sınırsız). Maç, kayıtlı hamlelerden bir önceki sıranın başına kurulur.
  get undoAvailable() {
    if (this.net || this.replay || this.setup.daily) return false;
    if (this.state.puzzle) return true;
    return (this.setup.players === 1 ? this.setup.level : this.setup.aiLevel) === 'kolay';
  }
  get canUndo() {
    return this.undoAvailable && this.view.phase === 'sen' && this.undoPoints.length >= 2 && (!!this.state.puzzle || this.undosLeft > 0);
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
    this.view = { ...this.freshView(), clockStart, clockEnd, events: events.filter(e => e.round < this.state.round), phase: 'bekle', version: this.view.version + 1 };
    this.toast(tr('Move undone'), 'info');
    this.saveGame();
    this.emit();
    this.later(250, () => this.advance());
  }

  cancel() {
    if (this.view.phase === 'onizleme') this.emit({ phase: 'sen', sel: null });
  }

  toggleThreats() {
    if (!this.isMyMove()) return;
    this.emit({ phase: 'sen', sel: null, showThreats: !this.view.showThreats });
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
      this.emit({ phase: 'bekle', sel: null, showThreats: false });
      return;
    }
    const o = this.apply(move);
    this.emit({ phase: 'bekle', sel: null, showThreats: false, bonus: null });
    if (o) this.continueAfter(o, move?.type === 'take' ? 750 : 500); // aldığında kısa bir bekleyiş: an hissedilsin
  }

  // ------------------------------------------------------------ yapay zekâ oyuncular, İkiz ve botlar

  private starBotTurn(a: Piece) {
    this.emit({ phase: 'rakip', timer: this.setup.moveSeconds });
    this.startTicker();
    this.later(900 + Math.random() * 700, () => {
      this.stopTicker();
      const o = this.apply(chooseMove(this.state, a));
      this.emit({ phase: 'bekle' });
      if (o) this.continueAfter(o, 450);
    });
  }

  // İkiz senden hemen sonra, senin yönünde oynar; kısa bir arayla, ayrı bir bölüm açmadan.
  private twinTurn(a: Piece) {
    this.emit({ phase: 'bekle' });
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

  // Sıra karışık: bu bölüm, sıradaki yıldıza ya da İkiz'e kadar art arda oynayacak botlardır.
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

  // Bir bot oynar; hızlandırıldıysa kalanların hepsi aynı anda.
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

  // ------------------------------------------------------------ hamle ve sonuçları

  private continueAfter(o: Outcome, pause: number) {
    if (this.halted) {
      this.later(pause, () => this.finish());
    } else if (o.roundEnded) {
      // Mod kartı, tur sonundaki bantlar (halka çöktü, elendin) okunduktan sonra gelir.
      this.later(pause + this.bannerBacklog(), () => this.modeChange());
    } else {
      this.later(pause, () => this.advance());
    }
  }

  private modeChange() {
    feel('mode', BUZZ.mode);
    this.emit({ phase: 'mod', modeOverlay: true });
    this.later(settings.fastBots ? 800 : 1300, () => {
      // Çökecek turun başında açık uyarı: bu tur sonunda dış halkada kalan elenir.
      if (collapseDue(this.state)) {
        this.toast(tr('The outer ring collapses at the end of this round!'), 'ring');
        feel('collapse', BUZZ.collapse);
        startTension();
      }
      this.emit({ modeOverlay: false });
      this.advance();
    });
  }

  // Sıradaki taşın hamlesini motora oynatır, ekranda iz, patlama, bildirim ve kayıt üretir.
  // Yayını (emit) çağıran yapar.
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

    // Bonus: kullanma, zırhla kurtulma, kazanma.
    if (move?.bonus && actor.kind === 'star' && actor.seat === ME) { this.toast(`${tr(BONUS_NAMES[move.bonus])}!`, 'info'); feel('bonusUse', BUZZ.bonusUse); }
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
    if (this.net?.role === 'host') this.net.broadcast?.(this.moves.length, move);

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
      if (!mine) sound('take');
      this.view = { ...this.view, shake: this.view.shake + 1 };
      const me = victim.kind === 'star' && victim.seat === ME;
      // Yalnız yıldızlar puan toplar: alınan taşın değeri tahtada uçar, skor tablosu anında güncellenir.
      if (actor.kind === 'star') this.float(move.r, move.c, `+${POINTS[victim.kind]}`, colorOf(actor), mine);
      if (actor.kind === 'twin' && st.seats[ME].score > scoreBefore) {
        const pts = POINTS[victim.kind] * TWIN_TAKE_MULT;
        this.float(move.r, move.c, `+${pts}`, PLAYER_COLORS[ME]);
        this.toast(tr('Your mirror took {obj}! +{pts} (2×)', { obj: objectOf(st, victim), pts }), 'sword');
        this.later(120, () => sound('points'));
      }
      if (mine) { this.toast(tr('You took {obj}! +{pts}', { obj: objectOf(st, victim), pts: POINTS[victim.kind] }), 'sword'); feel('take', victim.kind === 'star' ? BUZZ.takeStar : BUZZ.take); this.later(120, () => sound('points')); }
      if (me) {
        this.toast(tr('{name} took you!', { name: subjectOf(st, actor) }), 'sword');
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

  // ------------------------------------------------------------ geçici görseller

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

  // Bantlar üst üste binmez; sırayla, her biri BANNER_MS görünür.
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

  // ------------------------------------------------------------ kartlar

  // Aynı taşa ikinci dokunuş kapatır.
  inspectPiece(id: string) {
    feel('select', BUZZ.select);
    this.emit({ inspect: this.view.inspect === id ? null : id });
  }
  closeInspect() { if (this.view.inspect) this.emit({ inspect: null }); }
  openResults() { this.emit({ sheet: { type: 'sonuc' } }); }
  openLog() { this.emit({ sheet: { type: 'kayit' } }); }
  openMenu() { this.pause(); this.emit({ sheet: { type: 'menu' } }); }
  closeSheet() {
    if (!this.view.sheet) return;
    const wasMenu = this.view.sheet.type === 'menu';
    this.emit({ sheet: null });
    if (wasMenu) this.unpause();
  }
  watch() { this.emit({ watching: true }); }

  // ------------------------------------------------------------ zamanlayıcılar

  private startTicker() {
    this.stopTicker();
    if (this.state.puzzle) return; // bulmacada süre yok
    this.ticker = window.setInterval(() => {
      const t = this.view.timer - 1;
      if (this.isMyMove()) {
        if (t <= 0) {
          this.stopTicker();
          this.emit({ timer: 0 });
          if (this.net?.role !== 'guest') this.autoMove(); // misafirde süreyi kurucu yönetir
          return;
        }
        if (t <= 5) feel('tick', BUZZ.lastSeconds);
        this.emit({ timer: t });
      } else if (this.view.phase === 'rakip') {
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
