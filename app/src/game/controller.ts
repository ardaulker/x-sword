// Maçın akışı: sıra kimde, süre, bot turu, mod değişimi, bildirimler.
// Kuralı motor (engine/) bilir; burası yalnız onun fonksiyonlarını çağırır ve ekrana ne olduğunu söyler.

import {
  POINTS, collapseDue, createGame, play, currentActor, legalMoves, pieceById, starOf,
} from '../../../engine/rules.js';
import type { GameState, Level, Move, Piece } from '../../../engine/rules.js';
import { chooseMove } from '../../../engine/bots.js';
import { BUZZ, buzz } from './haptics';
import { HAZARD, PLAYER_COLORS, colorOf, isBot } from './look';
import { ME, labelOf, objectOf, seatName, subjectOf } from './names';

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
  level: Level;
  moveSeconds: number;
}
// players 1: tek oyunculu mod (sen + aynan İkiz + botlar). 2–4: yapay zekâ oyunculara karşı.
export const DEFAULT_SETUP: Setup = { players: 1, level: 'normal', moveSeconds: 20 };

export interface Spot { r: number; c: number }
export interface Trail { key: number; from: Spot; to: Spot; color: string }
export interface Burst { key: number; r: number; c: number; color: string }
export interface Float { key: number; r: number; c: number; text: string; color: string }
export interface Toast { key: number; text: string; icon: 'sword' | 'clock' | 'info' | 'ring' }
export interface Banner { key: number; title: string; sub: string; color: string; pieceId: string | null }
// attackerId null: taş çöken halkada düştü.
export interface TakeEvent { key: number; round: number; attackerId: string | null; victimId: string }
export type Sheet = { type: 'kayit' } | { type: 'menu' } | null;

export interface View {
  phase: Phase;
  sel: Move | null;
  showThreats: boolean;
  timer: number;
  trails: Trail[];
  bursts: Burst[];
  floats: Float[];
  toast: Toast | null;
  banner: Banner | null;
  modeOverlay: boolean;
  sheet: Sheet;
  inspect: string | null; // dokunulan taş: yolları ve hedefi tahtada görünür, büyük kart açılmaz
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
  private seq = 0;

  constructor(setup: Setup = DEFAULT_SETUP) {
    this.setup = setup;
    this.reset();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  getSnapshot = () => this.view;

  // ------------------------------------------------------------ maç

  start() {
    this.later(600, () => this.advance());
  }

  newGame(setup: Setup = this.setup) {
    this.dispose();
    this.setup = setup;
    this.reset();
    this.emit();
    this.start();
  }

  dispose() {
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();
    this.stopTicker();
    this.botTimer = null;
    this.banners = [];
  }

  myStar() {
    return starOf(this.state, ME)!;
  }

  private reset() {
    const seats = Array.from({ length: this.setup.players }, (_, i) =>
      i === ME ? { kind: 'human' as const } : { kind: 'bot' as const, level: this.setup.level });
    // Kolayda ilk sen oynarsın; normal ve zorda sıradaki yerin de rastgele.
    this.state = createGame({ seats, neutralLevel: this.setup.level, firstSeat: this.setup.level === 'kolay' ? ME : null });
    this.fast = false;
    this.view = {
      phase: 'hazir', sel: null, showThreats: false, timer: this.setup.moveSeconds,
      trails: [], bursts: [], floats: [], toast: null, banner: null, modeOverlay: false, sheet: null, inspect: null,
      bots: { done: 0, total: 0, currentId: null }, events: [],
      clockStart: Date.now(), clockEnd: null, watching: false, shake: 0, fall: null, hit: 0, version: 0,
    };
  }

  private advance() {
    const st = this.state;
    if (st.over) return this.finish();
    const a = currentActor(st)!;
    if (a.kind === 'twin') return this.twinTurn(a);
    if (a.kind !== 'star') return this.botTurn();
    if (st.seats[a.seat].kind === 'human') return this.myTurn();
    return this.starBotTurn(a);
  }

  private finish() {
    this.stopTicker();
    const me = this.myStar();
    if (this.state.seats[ME].bonus && me) {
      this.float(me.r, me.c, `+${this.state.seats[ME].bonus}`, PLAYER_COLORS[ME]);
      this.toast(`Hayatta kalma bonusu +${this.state.seats[ME].bonus}`, 'sword');
    }
    this.emit({ phase: 'bitti', clockEnd: this.view.clockEnd ?? Date.now(), sel: null, showThreats: false, modeOverlay: false });
    if (this.state.winner === ME) buzz(BUZZ.take);
  }

  // ------------------------------------------------------------ senin sıran

  private myTurn() {
    this.emit({ phase: 'sen', sel: null, showThreats: false, timer: this.setup.moveSeconds });
    if (!legalMoves(this.state, this.myStar(), this.state.mode).length) {
      this.toast('Gidecek kare yok · sıra geçti', 'info');
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
    const sel = this.view.sel;
    if (this.view.phase === 'onizleme' && sel && sel.r === move.r && sel.c === move.c) return this.confirm();
    buzz(BUZZ.select);
    this.emit({ phase: 'onizleme', sel: move, showThreats: false });
  }

  confirm() {
    const { phase, sel } = this.view;
    if (phase !== 'onizleme' || !sel) return;
    buzz(BUZZ.confirm);
    this.commitMine(sel);
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
    this.toast('Süre doldu · güvenli hamle yapıldı', 'clock');
    this.commitMine(m);
  }

  private commitMine(move: Move | null) {
    this.stopTicker();
    const o = this.apply(move);
    this.emit({ phase: 'bekle', sel: null, showThreats: false });
    if (o) this.continueAfter(o, 500);
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
    // Sıra karışık: bu bölüm, sıradaki yıldıza ya da İkiz'e kadar art arda oynayacak botlardır.
    const st = this.state;
    this.botQueue = [];
    for (const id of st.order.slice(st.turn)) {
      const p = pieceById(st, id);
      if (!p || !p.alive) continue;
      if (!isBot(p)) break;
      this.botQueue.push(id);
    }
    this.fast = false;
    this.emit({ phase: 'bot', bots: { done: 0, total: this.botQueue.length, currentId: null } });
    this.botTimer = this.later(250, () => this.botStep());
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
      if (!o || o.roundEnded || st.over) break;
    } while (this.fast);
    this.emit();

    const next = currentActor(st);
    if (o && !o.roundEnded && !st.over && next && isBot(next)) {
      const stagger = Math.max(60, Math.min(110, Math.floor(1200 / Math.max(1, this.view.bots.total))));
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
    if (this.state.over) {
      this.later(pause, () => this.finish());
    } else if (o.roundEnded) {
      // Mod kartı, tur sonundaki bantlar (halka çöktü, elendin) okunduktan sonra gelir.
      this.later(pause + this.bannerBacklog(), () => this.modeChange());
    } else {
      this.later(pause, () => this.advance());
    }
  }

  private modeChange() {
    buzz(BUZZ.mode);
    this.emit({ phase: 'mod', modeOverlay: true });
    this.later(1300, () => {
      // Çökecek turun başında açık uyarı: bu tur sonunda dış halkada kalan elenir.
      if (collapseDue(this.state)) {
        this.toast('Dış halka bu tur sonunda çöküyor!', 'ring');
        buzz(BUZZ.collapse);
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

    play(st, move);

    const fallen = st.pieces.filter(p => aliveBefore.has(p.id) && !p.alive && p !== victim);
    const collapsed = st.ring !== ring;
    const events = [...this.view.events];

    if (move) this.trail(from, { r: move.r, c: move.c }, colorOf(actor));

    if (victim && move) {
      events.push({ key: this.key(), round, attackerId: actor.id, victimId: victim.id });
      this.burst(move.r, move.c, colorOf(actor));
      this.view = { ...this.view, shake: this.view.shake + 1 };
      const mine = actor.kind === 'star' && actor.seat === ME;
      const me = victim.kind === 'star' && victim.seat === ME;
      // Yalnız yıldızlar puan toplar: alınan taşın değeri tahtada uçar, skor tablosu anında güncellenir.
      if (actor.kind === 'star') this.float(move.r, move.c, `+${POINTS[victim.kind]}`, colorOf(actor));
      if (mine) { this.toast(`${objectOf(st, victim)} aldın! +${POINTS[victim.kind]}`, 'sword'); buzz(BUZZ.take); }
      if (me) {
        this.toast(`${subjectOf(st, actor)} seni aldı!`, 'sword');
        buzz(BUZZ.takenOrOut);
        this.view = { ...this.view, hit: this.view.hit + 1 };
      }
      if (victim.kind === 'star') {
        this.banner(me ? 'Elendin' : `${seatName(st, victim.seat)} elendi`,
          `${labelOf(st, actor)} aldı · ${st.seats[victim.seat].score} puanla`, PLAYER_COLORS[victim.seat], victim.id);
      }
    }

    if (collapsed) {
      this.view = { ...this.view, fall: { key: this.key(), ring: st.ring - 1 } };
      for (const p of fallen) {
        events.push({ key: this.key(), round, attackerId: null, victimId: p.id });
        this.burst(p.r, p.c, HAZARD);
      }
      const side = st.size - 2 * st.ring;
      const stars = fallen.filter(p => p.kind === 'star');
      const iFell = stars.some(p => p.kind === 'star' && p.seat === ME);
      let sub = fallen.length ? `${fallen.length} taş düştü · arena ${side}×${side}` : `Kimse düşmedi · arena ${side}×${side}`;
      if (iFell) {
        sub = 'Halkada kaldın, elendin';
        this.view = { ...this.view, hit: this.view.hit + 1 };
      }
      else if (stars.length) sub = `${stars.map(p => labelOf(st, p)).join(', ')} düştü · arena ${side}×${side}`;
      this.banner('Dış halka çöktü', sub, HAZARD, null);
      buzz(iFell ? BUZZ.takenOrOut : BUZZ.collapse);
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

  private burst(r: number, c: number, color: string) {
    const key = this.key();
    this.view = { ...this.view, bursts: [...this.view.bursts, { key, r, c, color }] };
    this.later(450, () => this.emit({ bursts: this.view.bursts.filter(b => b.key !== key) }));
  }

  private float(r: number, c: number, text: string, color: string) {
    const key = this.key();
    this.view = { ...this.view, floats: [...this.view.floats, { key, r, c, text, color }] };
    this.later(1000, () => this.emit({ floats: this.view.floats.filter(f => f.key !== key) }));
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
    buzz(BUZZ.select);
    this.emit({ inspect: this.view.inspect === id ? null : id });
  }
  closeInspect() { if (this.view.inspect) this.emit({ inspect: null }); }
  openLog() { this.emit({ sheet: { type: 'kayit' } }); }
  openMenu() { this.emit({ sheet: { type: 'menu' } }); }
  closeSheet() { if (this.view.sheet) this.emit({ sheet: null }); }
  watch() { this.emit({ watching: true }); }

  // ------------------------------------------------------------ zamanlayıcılar

  private startTicker() {
    this.stopTicker();
    this.ticker = window.setInterval(() => {
      const t = this.view.timer - 1;
      if (this.isMyMove()) {
        if (t <= 0) {
          this.stopTicker();
          this.emit({ timer: 0 });
          this.autoMove();
          return;
        }
        if (t <= 5) buzz(BUZZ.lastSeconds);
        this.emit({ timer: t });
      } else if (this.view.phase === 'rakip') {
        this.emit({ timer: Math.max(0, t) });
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
      fn();
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
