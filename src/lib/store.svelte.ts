// App state: the saved data, the hash route, saving and toasts.

import { newData, normalize } from './data';
import { loadData, saveData } from './db';
import type { Data, Filter, Game } from './types';

export const app = $state<{ d: Data; loaded: boolean }>({ d: newData(), loaded: false });

export async function load(): Promise<void> {
  const stored = await loadData();
  if (stored) app.d = normalize(stored);
  app.loaded = true;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves soon; debounced so typing in a field doesn't write on every keystroke. */
export function save(): void {
  clearTimeout(timer);
  timer = setTimeout(() => saveData(app.d).catch((err) => alert('Could not save: ' + err)), 150);
}

export function touch(g: Game): void {
  g.updatedAt = Date.now();
  save();
}

/** Replaces everything (backup import, erase). */
export async function replaceData(d: Data): Promise<void> {
  clearTimeout(timer);
  app.d = d;
  await saveData(d);
}

// Write any pending change before the app is closed or sent to the background.
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) {
    clearTimeout(timer);
    timer = undefined;
    saveData(app.d).catch(() => {});
  }
});

// ---------------------------------------------------------------------------------------------
// Routing: #/  #/settings  #/install

export interface Route {
  page: 'home' | 'settings' | 'install';
}

const PAGES: Record<string, Route['page']> = { settings: 'settings', install: 'install' };

const parse = (hash: string): Route => ({ page: PAGES[hash.replace(/^#\/?/, '').split('/')[0]] ?? 'home' });

export const router = $state({ route: parse(location.hash) });

addEventListener('hashchange', () => {
  router.route = parse(location.hash);
  scrollTo(0, 0);
});

export function back(fallback = ''): void {
  if (history.length > 1) history.back();
  else location.hash = '#/' + fallback;
}

/** Home list view state; kept here so it survives a trip to Settings. */
export const view = $state<{ filter: Filter; owner: string; q: string }>({ filter: 'all', owner: '', q: '' });

// ---------------------------------------------------------------------------------------------
// Toasts

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export const toasts = $state<Toast[]>([]);
let toastId = 0;

export function toast(text: string, action?: Toast['action'], ms = 5000): number {
  const t = { id: ++toastId, text, action };
  toasts.push(t);
  setTimeout(() => dismissToast(t.id), ms);
  return t.id;
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const isStandalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
