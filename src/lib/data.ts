// Pure data helpers: new records, sorting and filtering, counts, spreadsheet import/export and backups.

import type { Data, Filter, Game, Settings, SortBy, Step } from './types';

export const newSettings = (): Settings => ({ theme: 'light', sort: 'name' });

export const newData = (): Data => ({ version: 1, games: [], settings: newSettings() });

export const makeId = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function newGame(fields: Partial<Game> = {}): Game {
  const now = Date.now();
  return {
    id: makeId(),
    name: '',
    publisher: '',
    owner: '',
    sleeves: 'todo',
    sleeveInfo: '',
    insert: 'todo',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

const STEPS: Step[] = ['todo', 'done', 'na'];
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const step = (v: unknown): Step => (STEPS.includes(v as Step) ? (v as Step) : 'todo');

/** Fills in anything missing from older or hand-edited data so the app never trips over it. */
export function normalize(raw: unknown): Data {
  const r = (raw ?? {}) as Partial<Data>;
  const d = newData();
  const s = (r.settings ?? {}) as Partial<Settings>;
  if (s.theme === 'dark' || s.theme === 'auto' || s.theme === 'light') d.settings.theme = s.theme;
  if (s.sort === 'publisher' || s.sort === 'owner' || s.sort === 'name') d.settings.sort = s.sort;
  if (Array.isArray(r.games)) {
    d.games = r.games
      .filter((g) => g && typeof g === 'object' && str(g.name).trim())
      .map((g) => ({
        id: str(g.id) || makeId(),
        name: str(g.name).trim(),
        publisher: str(g.publisher).trim(),
        owner: str(g.owner).trim(),
        sleeves: step(g.sleeves),
        sleeveInfo: str(g.sleeveInfo),
        insert: step(g.insert),
        notes: str(g.notes),
        createdAt: Number(g.createdAt) || Date.now(),
        updatedAt: Number(g.updatedAt) || Date.now(),
      }));
  }
  return d;
}

// ---------------------------------------------------------------------------------------------
// Sorting, grouping, filtering

/** Sort key that ignores case and a leading "The" / "A" / "An" ("The Crew" sorts under C). */
export function sortKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '');
}

const byName = (a: Game, b: Game) => sortKey(a.name).localeCompare(sortKey(b.name), undefined, { numeric: true });

export const isDone = (g: Game): boolean => g.sleeves !== 'todo' && g.insert !== 'todo';

export function matchesFilter(g: Game, f: Filter): boolean {
  switch (f) {
    case 'sleeve':
      return g.sleeves === 'todo';
    case 'print':
      return g.insert === 'todo';
    case 'left':
      return !isDone(g);
    case 'done':
      return isDone(g);
    default:
      return true;
  }
}

export function matchesSearch(g: Game, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${g.name} ${g.publisher} ${g.owner} ${g.sleeveInfo} ${g.notes}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export interface Group {
  key: string;
  label: string;
  games: Game[];
}

const NONE: Record<SortBy, string> = { name: '', publisher: 'No publisher', owner: 'No owner' };

/** Games sorted by name, then grouped by publisher or owner (blank group last). */
export function groupGames(games: Game[], sort: SortBy): Group[] {
  const sorted = [...games].sort(byName);
  if (sort === 'name') return [{ key: '', label: '', games: sorted }];
  const map = new Map<string, Group>();
  for (const g of sorted) {
    const label = g[sort].trim();
    const key = label.toLowerCase();
    let grp = map.get(key);
    if (!grp) map.set(key, (grp = { key, label: label || NONE[sort], games: [] }));
    grp.games.push(g);
  }
  return [...map.values()].sort((a, b) => {
    if (!a.key !== !b.key) return a.key ? -1 : 1;
    return sortKey(a.label).localeCompare(sortKey(b.label));
  });
}

export interface Counts {
  all: number;
  sleeve: number;
  print: number;
  left: number;
  done: number;
}

export function countGames(games: Game[]): Counts {
  const c: Counts = { all: games.length, sleeve: 0, print: 0, left: 0, done: 0 };
  for (const g of games) {
    if (g.sleeves === 'todo') c.sleeve++;
    if (g.insert === 'todo') c.print++;
    if (isDone(g)) c.done++;
    else c.left++;
  }
  return c;
}

/** Distinct values of a field, most used first (for suggestions), keeping the first spelling seen. */
export function distinct(games: Game[], field: 'owner' | 'publisher'): string[] {
  const map = new Map<string, { label: string; n: number }>();
  for (const g of games) {
    const v = g[field].trim();
    if (!v) continue;
    const k = v.toLowerCase();
    const e = map.get(k);
    if (e) e.n++;
    else map.set(k, { label: v, n: 1 });
  }
  return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).map((e) => e.label);
}

/** Renames an owner or publisher on every game (case-insensitive match). Returns how many changed. */
export function renameAll(games: Game[], field: 'owner' | 'publisher', from: string, to: string): number {
  const k = from.trim().toLowerCase();
  let n = 0;
  for (const g of games) {
    if (g[field].trim().toLowerCase() === k) {
      g[field] = to.trim();
      g.updatedAt = Date.now();
      n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------------------------
// Spreadsheet in and out

/** Byte-order mark: tells Excel the file is UTF-8. */
const BOM = String.fromCharCode(0xfeff);

export const COLUMNS = ['Game', 'Publisher', 'Owner', 'Sleeved', 'Insert Printed', 'Sleeve size', 'Notes'];

const stepWord = (s: Step): string => (s === 'done' ? 'Yes' : s === 'na' ? 'N/A' : 'No');

/** Reads yes / no / n/a style answers from a spreadsheet cell. */
export function parseStep(cell: string): Step {
  const v = cell.trim().toLowerCase().replace(/\.$/, '');
  if (/^(y|yes|true|x|done|✓|✔|✅|1|sleeved|printed)$/.test(v)) return 'done';
  if (/^(n\/?a|none|not needed|no need|skip|-|—|–)$/.test(v)) return 'na';
  return 'todo';
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Spreadsheet file (opens in Excel / Google Sheets / Numbers). */
export function toCsv(games: Game[]): string {
  const rows = [COLUMNS, ...[...games].sort(byName).map((g) => [g.name, g.publisher, g.owner, stepWord(g.sleeves), stepWord(g.insert), g.sleeveInfo, g.notes])];
  // The BOM makes Excel read the file as UTF-8 (accents, ×).
  return BOM + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Splits CSV or tab-separated text into rows of cells. Handles quoted cells with commas and line breaks. */
export function splitTable(text: string): string[][] {
  text = text.replace(BOM, '');
  // Spreadsheet copies use tabs; typed lists use commas. Look at the whole paste, since the first line may be a lone name.
  const sep = text.includes('\t') ? '\t' : text.includes(',') ? ',' : text.includes(';') ? ';' : '\t';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some(Boolean));
}

type Field = 'name' | 'publisher' | 'owner' | 'sleeves' | 'insert' | 'sleeveInfo' | 'notes';

/** Which field a header cell names, if any. */
function headerField(h: string): Field | undefined {
  const v = h.toLowerCase();
  if (/size|count|type/.test(v) && /sleeve/.test(v)) return 'sleeveInfo';
  if (/sleeve/.test(v)) return 'sleeves';
  if (/insert|print/.test(v)) return 'insert';
  if (/publish/.test(v)) return 'publisher';
  if (/own|who/.test(v)) return 'owner';
  if (/note|comment/.test(v)) return 'notes';
  if (/game|name|title/.test(v)) return 'name';
  return undefined;
}

const DEFAULT_ORDER: Field[] = ['name', 'publisher', 'owner', 'sleeves', 'insert', 'sleeveInfo', 'notes'];

/**
 * Reads pasted or imported rows. Columns are taken from a header row if there is one,
 * otherwise in the order Game, Publisher, Owner, Sleeved, Insert Printed, Sleeve size, Notes.
 * `owner` fills in rows that don't say who owns them.
 */
export function parseGames(text: string, owner = ''): Game[] {
  const rows = splitTable(text);
  if (!rows.length) return [];
  let order = DEFAULT_ORDER;
  const header = rows[0].map(headerField);
  if (header.filter(Boolean).length >= 2 && header.includes('name')) {
    order = header.map((f) => f ?? ('' as Field));
    rows.shift();
  }
  const games: Game[] = [];
  for (const r of rows) {
    const g = newGame({ owner: owner.trim() });
    order.forEach((f, i) => {
      const v = r[i] ?? '';
      if (!f) return;
      if (f === 'sleeves' || f === 'insert') {
        if (v) g[f] = parseStep(v);
      } else if (v) g[f] = v;
    });
    if (g.name.trim()) games.push(g);
  }
  return games;
}

const sameGame = (a: Game, b: Game) => sortKey(a.name) === sortKey(b.name) && a.owner.trim().toLowerCase() === b.owner.trim().toLowerCase();

/** Adds imported games, skipping ones already on the list (same name and owner). */
export function addGames(existing: Game[], incoming: Game[]): { added: Game[]; skipped: number } {
  const added: Game[] = [];
  let skipped = 0;
  for (const g of incoming) {
    if (existing.some((e) => sameGame(e, g)) || added.some((e) => sameGame(e, g))) skipped++;
    else added.push(g);
  }
  existing.push(...added);
  return { added, skipped };
}

// ---------------------------------------------------------------------------------------------
// Backup

export const backupJson = (d: Data): string => JSON.stringify({ app: 'earls-gametracker', ...d }, null, 1);

export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Game Tracker backup.");
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Data).games)) throw new Error("That file isn't a Game Tracker backup.");
  return normalize(raw);
}
