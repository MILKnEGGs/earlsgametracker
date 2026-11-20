# Earl's Game Tracker

Keep track of which board games still need sleeving and which still need a printed insert.

- **Games**: game, publisher, who owns it, sleeved, insert printed, plus an optional sleeve size and count
  (`63.5×88 ×110`) and notes. Sleeves and inserts are each *needs doing*, *done* or *not needed*.
- **The list**: tap **Sleeve** or **Print** on a row to mark it done (tap again to undo). Tap the game to edit it.
  Progress bars at the top count only the games that need that job. Filter by *To sleeve*, *To print*,
  *Not finished* or *Finished*, by owner, or search. Sort A–Z (ignoring "The"), or group by publisher or owner.
- **Add many**: paste rows straight from Excel / Google Sheets, type `Game, Publisher, Owner, Sleeved, Insert Printed`
  lines, or open a .csv. Yes / no / n/a are understood, a header row in any order is understood, and games already
  on the list (same name and owner) are skipped.
- **Settings**: rename an owner or publisher on every game, export a spreadsheet (.csv), backup export/import,
  install guide, light "game table" or dark "game night" look.

Everything stays on the device (IndexedDB). It works offline once opened and installs to the Home Screen.

## Develop

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd test         # spreadsheet parsing, CSV round trip, filters, grouping, renames, backup
npm.cmd run build    # svelte-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(one-time setup: repo Settings → Pages → Source: "GitHub Actions").
