// Short-lived visuals of a match: move trails, take bursts, sword strokes, floating scores, toasts and the banner queue.
// The controller owns the view; an `Effects` reads and writes it through a small host.

import { strike } from './haptics';
import type { Banner, Spot, Toast, View } from './controllerTypes';

const BANNER_MS = 1800;

export interface EffectsHost {
  view: View;
  emit(patch?: Partial<View>): void;
  later(ms: number, fn: () => void): number;
  key(): number;
}

export class Effects {
  private banners: Omit<Banner, 'key'>[] = [];
  private bannerUntil = 0;
  constructor(private host: EffectsHost) {}

  clearBanners() { this.banners = []; }

  trail(from: Spot, to: Spot, color: string) {
    const key = this.host.key();
    this.host.view = { ...this.host.view, trails: [...this.host.view.trails, { key, from, to, color }] };
    this.host.later(700, () => this.host.emit({ trails: this.host.view.trails.filter(t => t.key !== key) }));
  }

  burst(r: number, c: number, color: string, big = false) {
    const key = this.host.key();
    this.host.view = { ...this.host.view, bursts: [...this.host.view.bursts, { key, r, c, color, big }] };
    this.host.later(big ? 700 : 450, () => this.host.emit({ bursts: this.host.view.bursts.filter(b => b.key !== key) }));
  }

  slash(from: Spot, to: Spot, color: string, big: boolean) {
    const key = this.host.key();
    const angle = Math.round(Math.atan2(Math.sign(to.r - from.r), Math.sign(to.c - from.c)) * 180 / Math.PI);
    this.host.view = { ...this.host.view, slashes: [...this.host.view.slashes, { key, r: to.r, c: to.c, angle, color, big }] };
    strike(big);
    this.host.later(big ? 900 : 640, () => this.host.emit({ slashes: this.host.view.slashes.filter(s => s.key !== key) }));
  }

  float(r: number, c: number, text: string, color: string, big = false) {
    const key = this.host.key();
    this.host.view = { ...this.host.view, floats: [...this.host.view.floats, { key, r, c, text, color, big }] };
    this.host.later(big ? 1500 : 1000, () => this.host.emit({ floats: this.host.view.floats.filter(f => f.key !== key) }));
  }

  toast(text: string, icon: Toast['icon']) {
    const key = this.host.key();
    this.host.view = { ...this.host.view, toast: { key, text, icon } };
    this.host.later(1800, () => { if (this.host.view.toast?.key === key) this.host.emit({ toast: null }); });
  }

  // Banners never overlap; they show one after another, BANNER_MS each.
  banner(title: string, sub: string, color: string, pieceId: string | null) {
    this.banners.push({ title, sub, color, pieceId });
    if (!this.host.view.banner) this.nextBanner();
  }

  nextBanner() {
    const b = this.banners.shift();
    if (!b) {
      this.host.view = { ...this.host.view, banner: null };
      return;
    }
    this.host.view = { ...this.host.view, banner: { key: this.host.key(), ...b } };
    this.bannerUntil = Date.now() + BANNER_MS;
    this.host.later(BANNER_MS, () => { this.nextBanner(); this.host.emit(); });
  }

  bannerBacklog() {
    const now = this.host.view.banner ? Math.max(0, this.bannerUntil - Date.now()) : 0;
    return now + this.banners.length * BANNER_MS;
  }
}
