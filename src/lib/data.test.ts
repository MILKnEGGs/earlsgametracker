import { describe, expect, it } from 'vitest';
import {
  addGames,
  countGames,
  distinct,
  groupGames,
  matchesFilter,
  matchesSearch,
  newGame,
  normalize,
  parseBackup,
  parseGames,
  parseStep,
  renameAll,
  sortKey,
  splitTable,
  toCsv,
  backupJson,
  newData,
} from './data';

describe('parseStep', () => {
  it('reads yes / no / n/a', () => {
    for (const v of ['yes', 'Y', 'x', 'TRUE', 'done', '✓', 'Sleeved']) expect(parseStep(v)).toBe('done');
    for (const v of ['n/a', 'NA', 'none', 'Not needed', '-']) expect(parseStep(v)).toBe('na');
    for (const v of ['no', '', 'n', 'later']) expect(parseStep(v)).toBe('todo');
  });
});

describe('splitTable', () => {
  it('splits tabs from a spreadsheet copy', () => {
    expect(splitTable('Wingspan\tStonemaier\tEarl\r\nCascadia\t\t')).toEqual([
      ['Wingspan', 'Stonemaier', 'Earl'],
      ['Cascadia', '', ''],
    ]);
  });
  it('handles quoted commas and doubled quotes', () => {
    expect(splitTable('"Brass: Lancashire, Deluxe",Roxley\n"Say ""hi""",X')).toEqual([
      ['Brass: Lancashire, Deluxe', 'Roxley'],
      ['Say "hi"', 'X'],
    ]);
  });
  it('treats a plain list as one column and skips blank lines', () => {
    expect(splitTable('Azul\n\nCatan\n')).toEqual([['Azul'], ['Catan']]);
  });
});

describe('parseGames', () => {
  it('uses the default column order without a header', () => {
    const [g] = parseGames('Wingspan, Stonemaier Games, Earl, yes, n/a');
    expect(g).toMatchObject({ name: 'Wingspan', publisher: 'Stonemaier Games', owner: 'Earl', sleeves: 'done', insert: 'na' });
  });
  it('reads columns from a header row in any order', () => {
    const [g] = parseGames('Owner\tInsert Printed\tGame\tSleeved\nMike\tyes\tArk Nova\tno');
    expect(g).toMatchObject({ name: 'Ark Nova', owner: 'Mike', insert: 'done', sleeves: 'todo', publisher: '' });
  });
  it('round-trips its own CSV export', () => {
    const games = [newGame({ name: 'Root', publisher: 'Leder, Games', owner: 'Earl', sleeves: 'done', insert: 'na', sleeveInfo: '63×88 ×300' })];
    const [g] = parseGames(toCsv(games));
    expect(g).toMatchObject({ name: 'Root', publisher: 'Leder, Games', owner: 'Earl', sleeves: 'done', insert: 'na', sleeveInfo: '63×88 ×300' });
  });
  it('fills in a default owner only where missing', () => {
    const gs = parseGames('Azul\nCatan, Kosmos, Mike', 'Earl');
    expect(gs.map((g) => g.owner)).toEqual(['Earl', 'Mike']);
  });
});

describe('addGames', () => {
  it('skips games already on the list for the same owner', () => {
    const list = [newGame({ name: 'The Crew', owner: 'Earl' })];
    const { added, skipped } = addGames(list, [newGame({ name: 'crew', owner: 'earl' }), newGame({ name: 'The Crew', owner: 'Mike' }), newGame({ name: 'Azul' })]);
    expect(skipped).toBe(1);
    expect(added.map((g) => g.name)).toEqual(['The Crew', 'Azul']);
    expect(list).toHaveLength(3);
  });
});

describe('lists', () => {
  const games = [
    newGame({ name: 'Wingspan', publisher: 'Stonemaier', owner: 'Earl', sleeves: 'done', insert: 'todo' }),
    newGame({ name: 'The Crew', publisher: 'Kosmos', owner: 'Mike', sleeves: 'todo', insert: 'na' }),
    newGame({ name: 'Azul', publisher: '', owner: 'Earl', sleeves: 'done', insert: 'done' }),
  ];
  it('sorts ignoring "The"', () => {
    expect(sortKey('The Crew')).toBe('crew');
    expect(groupGames(games, 'name')[0].games.map((g) => g.name)).toEqual(['Azul', 'The Crew', 'Wingspan']);
  });
  it('groups by publisher with the blank group last', () => {
    expect(groupGames(games, 'publisher').map((g) => g.label)).toEqual(['Kosmos', 'Stonemaier', 'No publisher']);
  });
  it('counts and filters', () => {
    expect(countGames(games)).toEqual({ all: 3, sleeve: 1, print: 1, left: 2, done: 1 });
    expect(games.filter((g) => matchesFilter(g, 'print')).map((g) => g.name)).toEqual(['Wingspan']);
    expect(games.filter((g) => matchesSearch(g, 'earl azu')).map((g) => g.name)).toEqual(['Azul']);
  });
  it('lists and renames owners', () => {
    expect(distinct(games, 'owner')).toEqual(['Earl', 'Mike']);
    const copy = games.map((g) => ({ ...g }));
    expect(renameAll(copy, 'owner', 'earl', 'Earl B')).toBe(2);
    expect(distinct(copy, 'owner')).toEqual(['Earl B', 'Mike']);
  });
});

describe('backup', () => {
  it('round-trips and rejects other files', () => {
    const d = newData();
    d.games.push(newGame({ name: 'Azul', insert: 'na' }));
    expect(parseBackup(backupJson(d)).games[0]).toMatchObject({ name: 'Azul', insert: 'na' });
    expect(() => parseBackup('{"events":[]}')).toThrow();
    expect(() => parseBackup('nope')).toThrow();
  });
  it('normalizes bad data', () => {
    const d = normalize({ games: [{ name: ' Catan ', sleeves: 'weird' }, { name: '' }, null], settings: { theme: 'nope' } });
    expect(d.games).toHaveLength(1);
    expect(d.games[0]).toMatchObject({ name: 'Catan', sleeves: 'todo', insert: 'todo', owner: '' });
    expect(d.settings.theme).toBe('light');
  });
});
