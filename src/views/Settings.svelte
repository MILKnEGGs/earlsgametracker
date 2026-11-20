<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { backupJson, distinct, newData, parseBackup, renameAll, toCsv } from '../lib/data';
  import { fileStamp, shareFile } from '../lib/files';
  import { app, isStandalone, replaceData, save, toast } from '../lib/store.svelte';
  import type { ThemeMode } from '../lib/types';

  let { offlineReady }: { offlineReady: boolean } = $props();

  let fileInput: HTMLInputElement;
  const owners = $derived(distinct(app.d.games, 'owner'));
  const publishers = $derived(distinct(app.d.games, 'publisher'));
  const countOf = (field: 'owner' | 'publisher', v: string) => app.d.games.filter((g) => g[field].trim().toLowerCase() === v.toLowerCase()).length;

  function setTheme(t: ThemeMode) {
    app.d.settings.theme = t;
    save();
  }

  function rename(field: 'owner' | 'publisher', from: string) {
    const to = prompt(`Rename “${from}” on every game to:`, from)?.trim();
    if (!to || to === from) return;
    const n = renameAll(app.d.games, field, from, to);
    save();
    toast(`Renamed on ${n} game${n === 1 ? '' : 's'}`);
  }

  async function exportCsv() {
    const file = new File([toCsv($state.snapshot(app.d.games))], `games-${fileStamp()}.csv`, { type: 'text/csv' });
    await shareFile(file, 'Board games');
  }

  async function exportBackup() {
    const file = new File([backupJson($state.snapshot(app.d))], `gametracker-backup-${fileStamp()}.json`, { type: 'application/json' });
    await shareFile(file, "Earl's Game Tracker backup");
  }

  async function importBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      if (!confirm(`Replace everything on this device with this backup?\n\n${d.games.length} games.\n\nWhat's here now will be replaced.`)) return;
      await replaceData(d);
      toast('Backup restored ✓');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function eraseAll() {
    const typed = prompt("Erase EVERY game on this device? This can't be undone.\n\nType ERASE to confirm.");
    if (typed?.trim().toUpperCase() !== 'ERASE') return;
    const fresh = newData();
    fresh.settings = { ...$state.snapshot(app.d.settings) };
    await replaceData(fresh);
    toast('Everything erased.');
  }
</script>

<TopBar title="Settings" showBack />

<main class="page stack" style="gap:16px">
  {#if owners.length || publishers.length}
    <section class="card stack">
      <h3>✏️ Fix a name everywhere</h3>
      <p class="muted small" style="margin:0">Tap a name to rename it on every game (handy for typos, or "Mike" vs "Michael").</p>
      {#if owners.length}
        <div class="field">
          <span class="small strong">Owners</span>
          <div class="chips">
            {#each owners as o (o)}
              <button class="chip" onclick={() => rename('owner', o)}>{o} <span class="chip-n">{countOf('owner', o)}</span></button>
            {/each}
          </div>
        </div>
      {/if}
      {#if publishers.length}
        <div class="field">
          <span class="small strong">Publishers</span>
          <div class="chips">
            {#each publishers as p (p)}
              <button class="chip" onclick={() => rename('publisher', p)}>{p} <span class="chip-n">{countOf('publisher', p)}</span></button>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <section class="card stack">
    <h3>🎨 Look</h3>
    <div class="seg">
      <button class:on={app.d.settings.theme === 'light'} onclick={() => setTheme('light')}>☀️ Game table</button>
      <button class:on={app.d.settings.theme === 'dark'} onclick={() => setTheme('dark')}>🌙 Game night</button>
      <button class:on={app.d.settings.theme === 'auto'} onclick={() => setTheme('auto')}>Match device</button>
    </div>
  </section>

  <section class="card stack">
    <h3>📊 Spreadsheet</h3>
    <p class="muted small" style="margin:0">
      Export every game as a spreadsheet file (opens in Excel, Google Sheets or Numbers). To bring games <em>in</em> from a spreadsheet, use
      <strong>Add game → Paste a list</strong> on the main screen.
    </p>
    <div class="row">
      <button class="btn" onclick={exportCsv} disabled={!app.d.games.length}>📄 Export spreadsheet (.csv)</button>
    </div>
  </section>

  <section class="card stack">
    <h3>💾 Backup & move to another device</h3>
    <p class="muted small" style="margin:0">
      Everything is saved only on this device. Export a backup to keep a copy or move to a new phone, then <em>Import</em> it there. Importing
      <strong>replaces</strong> what's on that device.
    </p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>⬆️ Export backup</button>
      <button class="btn" onclick={() => fileInput.click()}>⬇️ Import backup</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importBackup} />
    </div>
  </section>

  <section class="card stack">
    <h3>📲 Install on your phone</h3>
    <p class="muted small" style="margin:0">
      {#if isStandalone}
        ✓ You're using the installed app{offlineReady ? ' and it works offline' : ''}.
      {:else}
        Add the app to your Home Screen so it opens like an app and works with no signal.
      {/if}
    </p>
    <a class="btn" href="#/install">How to install</a>
  </section>

  <section class="card stack">
    <h3>Danger zone</h3>
    <button class="btn danger" onclick={eraseAll}>Erase every game on this device</button>
  </section>

  <p class="muted small center">
    Earl's Game Tracker v{__APP_VERSION__} · made with 🎲 · <a href="https://milkneggs.github.io/pitch/earlsgametracker.html" target="_blank" rel="noopener">See what it does</a>
  </p>
</main>

<style>
  div.field {
    display: grid;
    gap: 8px;
  }
  .strong {
    font-weight: 700;
  }
</style>
