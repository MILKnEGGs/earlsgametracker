// Saved data. Everything lives in one record in this device's IndexedDB.

/** Where a game is with one job: still to do, done, or not needed for this game. */
export type Step = 'todo' | 'done' | 'na';

export interface Game {
  id: string;
  name: string;
  publisher: string;
  /** Who owns it (free text, so friends' games can be tracked too). */
  owner: string;
  sleeves: Step;
  /** Sleeve size and count, e.g. "63.5×88 ×110". */
  sleeveInfo: string;
  insert: Step;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

/** Home list filter. */
export type Filter = 'all' | 'sleeve' | 'print' | 'left' | 'done';

export type SortBy = 'name' | 'publisher' | 'owner';

export interface Settings {
  theme: ThemeMode;
  sort: SortBy;
}

export interface Data {
  version: 1;
  games: Game[];
  settings: Settings;
}
