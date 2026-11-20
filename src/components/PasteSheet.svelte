<script lang="ts">
  import { addGames, distinct, parseGames } from '../lib/data';
  import { app, save, toast } from '../lib/store.svelte';
  import Sheet from './Sheet.svelte';

  // Add many games at once: paste rows from a spreadsheet, type a list, or open a CSV file.
  let { onclose }: { onclose: () => void } = $props();

  let text = $state('');
  let owner = $state('');
  let fileInput: HTMLInputElement;

  const owners = $derived(distinct(app.d.games, 'owner'));
  const parsed = $derived(parseGames(text, owner));
  const noOwner = $derived(parsed.filter((g) => !g.owner).length);

  async function openFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (file) text = await file.text();
  }

  function add() {
    const { added, skipped } = addGames(app.d.games, parsed);
    save();
    onclose();
    toast(`Added ${added.length} game${added.length === 1 ? '' : 's'}` + (skipped ? ` · ${skipped} already on the list` : ''));
  }
</script>

<Sheet label="Add many games" {onclose} full>
  <div class="stack">
    <h2>Add many games</h2>
    <p class="muted small" style="margin:0">
      One game per line. You can copy rows straight out of Excel or Google Sheets, or type them with commas:
      <br /><code>Game, Publisher, Owner, Sleeved, Insert Printed</code>
      <br />Only the game is needed. For Sleeved and Insert Printed, write <em>yes</em>, <em>no</em> or <em>n/a</em>.
    </p>
    <textarea
      class="input paste"
      bind:value={text}
      rows="7"
      placeholder={'Wingspan, Stonemaier Games, Earl, yes, no\nArk Nova, Capstone Games, Earl\nCascadia'}
      autocomplete="off"
      autocapitalize="words"
      spellcheck="false"
    ></textarea>
    <div class="row">
      <button class="btn small" onclick={() => fileInput.click()}>📄 Open a spreadsheet file (.csv)</button>
      <input bind:this={fileInput} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onchange={openFile} />
    </div>

    {#if noOwner}
      <div class="field">
        <label class="field">
          <span>Owner for the {noOwner === parsed.length ? '' : noOwner + ' '}games that don't say</span>
          <input class="input" bind:value={owner} placeholder="Earl" autocomplete="off" />
        </label>
        {#if owners.length}
          <div class="chips">
            {#each owners.slice(0, 8) as o (o)}
              <button class="chip" class:on={owner.trim().toLowerCase() === o.toLowerCase()} onclick={() => (owner = o)}>{o}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if parsed.length}
      <div class="preview">
        <strong>{parsed.length} game{parsed.length === 1 ? '' : 's'}</strong>
        <ul>
          {#each parsed.slice(0, 6) as g (g.id)}
            <li>
              {g.name}<span class="muted">{g.publisher ? ' · ' + g.publisher : ''}{g.owner ? ' · ' + g.owner : ''}</span>
            </li>
          {/each}
          {#if parsed.length > 6}<li class="muted">…and {parsed.length - 6} more</li>{/if}
        </ul>
      </div>
    {/if}

    <div class="row">
      <button class="btn primary" style="flex:1" disabled={!parsed.length} onclick={add}>
        Add {parsed.length || ''} game{parsed.length === 1 ? '' : 's'}
      </button>
      <button class="btn" onclick={onclose}>Cancel</button>
    </div>
  </div>
</Sheet>

<style>
  code {
    font-size: 0.85rem;
    background: var(--surface-2);
    padding: 1px 5px;
    border-radius: 5px;
  }
  .paste {
    font-size: 16px;
    min-height: 150px;
  }
  div.field {
    display: grid;
    gap: 8px;
  }
  .preview {
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .preview ul {
    margin: 6px 0 0;
    padding-left: 20px;
  }
</style>
