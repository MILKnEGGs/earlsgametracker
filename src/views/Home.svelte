<script lang="ts">
  import GameRow from '../components/GameRow.svelte';
  import GameSheet from '../components/GameSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import PasteSheet from '../components/PasteSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { countGames, distinct, groupGames, matchesFilter, matchesSearch } from '../lib/data';
  import { app, save, view } from '../lib/store.svelte';
  import type { Filter, Game, SortBy } from '../lib/types';

  let editing = $state<Game | null>(null);
  let adding = $state(false);
  let pasting = $state(false);

  const games = $derived(app.d.games);
  const owners = $derived(distinct(games, 'owner'));
  // A remembered owner filter that no longer exists (renamed, deleted) falls back to everyone.
  const owner = $derived(owners.some((o) => o.toLowerCase() === view.owner.toLowerCase()) ? view.owner : '');
  const mine = $derived(owner ? games.filter((g) => g.owner.trim().toLowerCase() === owner.toLowerCase()) : games);
  const counts = $derived(countGames(mine));
  const shown = $derived(mine.filter((g) => matchesFilter(g, view.filter) && matchesSearch(g, view.q)));
  const groups = $derived(groupGames(shown, app.d.settings.sort));

  // Progress across the jobs that apply ("not needed" games don't count).
  const sleeveJobs = $derived(mine.filter((g) => g.sleeves !== 'na'));
  const printJobs = $derived(mine.filter((g) => g.insert !== 'na'));
  const sleevedPct = $derived(sleeveJobs.length ? (100 * (sleeveJobs.length - counts.sleeve)) / sleeveJobs.length : 0);
  const printedPct = $derived(printJobs.length ? (100 * (printJobs.length - counts.print)) / printJobs.length : 0);

  const FILTERS: [Filter, string][] = [
    ['all', 'All'],
    ['sleeve', 'To sleeve'],
    ['print', 'To print'],
    ['left', 'Not finished'],
    ['done', 'Finished'],
  ];
  const SORTS: [SortBy, string][] = [
    ['name', 'A–Z'],
    ['publisher', 'Publisher'],
    ['owner', 'Owner'],
  ];

  const sub = $derived.by(() => {
    if (!games.length) return 'Sleeves & inserts';
    const bits = [`${counts.all} game${counts.all === 1 ? '' : 's'}`];
    if (counts.sleeve) bits.push(`${counts.sleeve} to sleeve`);
    if (counts.print) bits.push(`${counts.print} to print`);
    if (!counts.sleeve && !counts.print) bits.push('all done 🎉');
    return bits.join(' · ');
  });

  const EMPTY: Record<Filter, string> = {
    all: 'No games match.',
    sleeve: 'Nothing left to sleeve. 🎉',
    print: 'Nothing left to print. 🎉',
    left: 'Everything is finished. 🎉',
    done: 'Nothing finished yet.',
  };

  function setSort(s: SortBy) {
    app.d.settings.sort = s;
    save();
  }
</script>

<TopBar title="Earl's Game Tracker" {sub}>
  <a class="icon-btn" href="#/settings" aria-label="Settings"><Icon name="settings" /></a>
</TopBar>

<main class="page stack">
  {#if !games.length}
    <div class="empty card">
      <span class="big-emoji">🎲</span>
      <h2>No games yet</h2>
      <p class="muted">Add your games, then tick them off as you sleeve them and print their inserts.</p>
      <div class="row" style="justify-content:center">
        <button class="btn primary" onclick={() => (adding = true)}><Icon name="plus" /> Add a game</button>
        <button class="btn" onclick={() => (pasting = true)}><Icon name="paste" /> Paste a list</button>
      </div>
    </div>
  {:else}
    <section class="card progress">
      <div class="bar-row">
        <span class="bar-label"><Icon name="sleeve" size={18} /> Sleeved</span>
        <span class="bar"><span style="width:{sleevedPct}%"></span></span>
        <span class="bar-num">{sleeveJobs.length - counts.sleeve}/{sleeveJobs.length}</span>
      </div>
      <div class="bar-row">
        <span class="bar-label"><Icon name="printer" size={18} /> Printed</span>
        <span class="bar"><span style="width:{printedPct}%"></span></span>
        <span class="bar-num">{printJobs.length - counts.print}/{printJobs.length}</span>
      </div>
    </section>

    <div class="search">
      <Icon name="search" size={20} />
      <input class="input" type="search" bind:value={view.q} placeholder="Search games, publishers, owners" autocomplete="off" enterkeyhint="search" />
    </div>

    <div class="chips scroll" role="group" aria-label="Show">
      {#each FILTERS as [f, label] (f)}
        <button class="chip" class:on={view.filter === f} onclick={() => (view.filter = f)}>
          {label} <span class="chip-n">{counts[f]}</span>
        </button>
      {/each}
    </div>

    {#if owners.length > 1}
      <div class="chips scroll" role="group" aria-label="Owner">
        <button class="chip owner" class:on={!owner} onclick={() => (view.owner = '')}>Everyone</button>
        {#each owners as o (o)}
          <button class="chip owner" class:on={owner.toLowerCase() === o.toLowerCase()} onclick={() => (view.owner = o)}>{o}</button>
        {/each}
      </div>
    {/if}

    <div class="row sortrow">
      <span class="muted small">{shown.length === mine.length ? '' : `Showing ${shown.length} of ${mine.length}`}</span>
      <span class="spacer"></span>
      <div class="seg mini" role="group" aria-label="Sort by">
        {#each SORTS as [s, label] (s)}
          <button class:on={app.d.settings.sort === s} onclick={() => setSort(s)}>{label}</button>
        {/each}
      </div>
    </div>

    {#if !shown.length}
      <p class="muted center">{view.q.trim() ? 'No games match your search.' : EMPTY[view.filter]}</p>
    {/if}

    {#each groups as grp (grp.key)}
      <section class="group">
        {#if grp.label}<h3 class="group-head">{grp.label} <span class="muted">{grp.games.length}</span></h3>{/if}
        <ul class="games card">
          {#each grp.games as g (g.id)}
            <GameRow game={g} sort={app.d.settings.sort} onedit={() => (editing = g)} />
          {/each}
        </ul>
      </section>
    {/each}

    <button class="btn ghost small" style="justify-self:center" onclick={() => (pasting = true)}><Icon name="paste" size={18} /> Paste a list of games</button>
  {/if}
</main>

{#if games.length}
  <button class="fab" onclick={() => (adding = true)}><Icon name="plus" /> Add game</button>
{/if}

{#if adding}
  <GameSheet onclose={() => (adding = false)} onpaste={() => ((adding = false), (pasting = true))} />
{/if}
{#if editing}
  <GameSheet game={editing} onclose={() => (editing = null)} />
{/if}
{#if pasting}
  <PasteSheet onclose={() => (pasting = false)} />
{/if}
