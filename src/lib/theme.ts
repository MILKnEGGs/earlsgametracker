// Fonts (bundled for offline use) and light/dark mode. Light ("game table") is the default.

import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/bitter/latin-600.css';
import '@fontsource/bitter/latin-700.css';

import type { ThemeMode } from './types';

const media = matchMedia('(prefers-color-scheme: dark)');
let mode: ThemeMode = 'light';

function apply(): void {
  const dark = mode === 'dark' || (mode === 'auto' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#120f0c' : '#3a2a20');
}

media.addEventListener('change', apply);

export function setThemeMode(m: ThemeMode): void {
  mode = m;
  apply();
}
