<script lang="ts">
  import { distinct, newGame, sortKey } from '../lib/data';
  import { app, save, toast } from '../lib/store.svelte';
  import type { Game, Step } from '../lib/types';
  import Sheet from './Sheet.svelte';

  // Add a game (no `game`) or edit one. Edits are made on a copy and saved with the Save button.
  let { game, onclose, onpaste }: { game?: Game; onclose: () => void; onpaste?: () => void } = $props();

  const fresh = (): Game => newGame({ owner: lastOwner });
  let lastOwner = '';
  // svelte-ignore state_referenced_locally
  let draft = $state<Game>(game ? { ...$state.snapshot(game) } : fresh());
  let nameEl = $state<HTMLInputElement>();

  const owners = $derived(distinct(app.d.games, 'owner'));
  const publishers = $derived(distinct(app.d.games, 'publisher'));
  const dupe = $derived(
    draft.name.trim() &&
      app.d.games.find(
        (g) => g.id !== draft.id && sortKey(g.name) === sortKey(draft.name) && g.owner.trim().toLowerCase() === draft.owner.trim().toLowerCase(),
      ),
  );

  const SLEEVES: [Step, string][] = [
    ['todo', 'Needs sleeves'],
    ['done', 'Sleeved ✓'],
    ['na', 'No sleeves needed'],
  ];
  const INSERT: [Step, string][] = [
    ['todo', 'Needs printing'],
    ['done', 'Printed ✓'],
    ['na', 'No insert'],
  ];

  function clean(g: Game): Game {
    return { ...g, name: g.name.trim(), publisher: g.publisher.trim(), owner: g.owner.trim(), sleeveInfo: g.sleeveInfo.trim(), notes: g.notes.trim() };
  }

  function commit(another = false) {
    if (!draft.name.trim()) {
      nameEl?.focus();
      return;
    }
    const g = clean($state.snapshot(draft));
    g.updatedAt = Date.now();
    if (game) {
      Object.assign(game, g);
      save();
      onclose();
      return;
    }
    app.d.games.push(g);
    save();
    toast(`Added ${g.name}`);
    if (another) {
      lastOwner = g.owner;
      draft = fresh();
      nameEl?.focus();
    } else onclose();
  }

  function remove() {
    if (!game) return;
    const i = app.d.games.indexOf(game);
    if (i < 0) return;
    const [gone] = app.d.games.splice(i, 1);
    save();
    onclose();
    toast(`Deleted ${gone.name}`, {
      label: 'Undo',
      run: () => {
        app.d.games.splice(Math.min(i, app.d.games.length), 0, gone);
        save();
      },
    });
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    commit();
  }
</script>

<Sheet label={game ? 'Edit game' : 'Add a game'} {onclose}>
  <form class="stack" onsubmit={submit}>
    <h2>{game ? 'Edit game' : 'Add a game'}</h2>

    <label class="field">
      <span>Game</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input bind:this={nameEl} class="input" bind:value={draft.name} placeholder="Wingspan" autocomplete="off" autofocus={!game} enterkeyhint="done" />
    </label>
    {#if dupe}<p class="note">Already on the list{draft.owner.trim() ? ` for ${draft.owner.trim()}` : ''}.</p>{/if}

    <label class="field">
      <span>Publisher</span>
      <input class="input" bind:value={draft.publisher} placeholder="Stonemaier Games" autocomplete="off" list="publishers" />
      <datalist id="publishers">
        {#each publishers as p (p)}<option value={p}></option>{/each}
      </datalist>
    </label>

    <div class="field">
      <label class="field">
        <span>Who owns it</span>
        <input class="input" bind:value={draft.owner} placeholder="Earl" autocomplete="off" />
      </label>
      {#if owners.length}
        <div class="chips">
          {#each owners.slice(0, 8) as o (o)}
            <button type="button" class="chip" class:on={draft.owner.trim().toLowerCase() === o.toLowerCase()} onclick={() => (draft.owner = o)}>{o}</button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="field">
      <span class="field-label">🃏 Sleeves</span>
      <div class="seg">
        {#each SLEEVES as [s, label] (s)}
          <button type="button" class:on={draft.sleeves === s} class:good={s === 'done'} onclick={() => (draft.sleeves = s)}>{label}</button>
        {/each}
      </div>
      {#if draft.sleeves !== 'na'}
        <input class="input" bind:value={draft.sleeveInfo} placeholder="Size & count, e.g. 63.5×88 ×110" autocomplete="off" aria-label="Sleeve size and count" />
      {/if}
    </div>

    <div class="field">
      <span class="field-label">🖨️ Insert</span>
      <div class="seg">
        {#each INSERT as [s, label] (s)}
          <button type="button" class:on={draft.insert === s} class:good={s === 'done'} onclick={() => (draft.insert = s)}>{label}</button>
        {/each}
      </div>
    </div>

    <label class="field">
      <span>Notes</span>
      <textarea class="input" bind:value={draft.notes} rows="2" placeholder="Expansions, insert file link, filament colour…"></textarea>
    </label>

    {#if game}
      <div class="row">
        <button type="submit" class="btn primary" style="flex:1">Save</button>
        <button type="button" class="btn" onclick={onclose}>Cancel</button>
      </div>
      <button type="button" class="btn ghost danger" onclick={remove}>Delete this game</button>
    {:else}
      <div class="row">
        <button type="submit" class="btn primary" style="flex:1">Add game</button>
        <button type="button" class="btn" onclick={() => commit(true)}>Add &amp; next</button>
      </div>
      {#if onpaste}
        <button type="button" class="btn ghost" onclick={onpaste}>Adding a lot? Paste a list or open a spreadsheet</button>
      {/if}
    {/if}
  </form>
</Sheet>

<style>
  .note {
    margin: -6px 2px 0;
    color: var(--amber);
    font-size: 0.88rem;
    font-weight: 600;
  }
  .field-label {
    font-weight: 700;
    font-size: 0.9rem;
  }
  div.field {
    display: grid;
    gap: 8px;
  }
  .seg button.good.on {
    background: var(--green);
    border-color: var(--green);
    color: var(--on-green);
  }
</style>
