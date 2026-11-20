<script lang="ts">
  import type { Step } from '../lib/types';
  import Icon from './Icon.svelte';

  // One job on a game row (sleeves or insert). Tap flips "to do" ↔ "done"; a "not needed" job opens the editor.
  let { kind, step, onflip, onedit }: { kind: 'sleeves' | 'insert'; step: Step; onflip: () => void; onedit: () => void } = $props();

  const LABELS = {
    sleeves: { todo: 'Sleeve', done: 'Sleeved', na: 'No sleeves' },
    insert: { todo: 'Print', done: 'Printed', na: 'No insert' },
  };
  const label = $derived(LABELS[kind][step]);
  const what = $derived(kind === 'sleeves' ? 'sleeves' : 'insert');
</script>

<button
  class="job {step}"
  aria-pressed={step === 'na' ? undefined : step === 'done'}
  aria-label={step === 'na' ? `${label}. Edit game` : step === 'done' ? `${label}. Tap to mark ${what} as still to do` : `Mark ${what} done`}
  onclick={() => (step === 'na' ? onedit() : onflip())}
>
  <span class="job-ico">
    <Icon name={kind === 'sleeves' ? 'sleeve' : 'printer'} size={20} />
    {#if step === 'done'}<span class="tick"><Icon name="check" size={13} stroke={3.4} /></span>{/if}
  </span>
  <span class="job-label">{label}</span>
</button>
