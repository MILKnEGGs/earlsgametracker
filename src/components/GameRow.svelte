<script lang="ts">
  import { touch } from '../lib/store.svelte';
  import type { Game, SortBy } from '../lib/types';
  import StepButton from './StepButton.svelte';

  let { game, sort, onedit }: { game: Game; sort: SortBy; onedit: () => void } = $props();

  // Leave out whatever the list is grouped by; the group heading already says it.
  const sub = $derived([sort !== 'publisher' && game.publisher, sort !== 'owner' && game.owner].filter(Boolean).join(' · '));
  const done = $derived(game.sleeves !== 'todo' && game.insert !== 'todo');

  function flip(kind: 'sleeves' | 'insert') {
    game[kind] = game[kind] === 'done' ? 'todo' : 'done';
    touch(game);
  }
</script>

<li class="game" class:done>
  <button class="game-main" onclick={onedit}>
    <span class="game-name">{game.name}</span>
    {#if sub}<span class="game-sub">{sub}</span>{/if}
    {#if game.sleeves === 'todo' && game.sleeveInfo}<span class="game-extra">Sleeves: {game.sleeveInfo}</span>{/if}
    {#if game.notes}<span class="game-extra">{game.notes}</span>{/if}
  </button>
  <StepButton kind="sleeves" step={game.sleeves} onflip={() => flip('sleeves')} {onedit} />
  <StepButton kind="insert" step={game.insert} onflip={() => flip('insert')} {onedit} />
</li>
