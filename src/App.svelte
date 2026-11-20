<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { requestPersistence } from './lib/db';
  import { app, dismissToast, isStandalone, router, toast, toasts } from './lib/store.svelte';
  import { setThemeMode } from './lib/theme';
  import Home from './views/Home.svelte';
  import Install from './views/Install.svelte';
  import Settings from './views/Settings.svelte';

  let updateReady = $state(false);
  let offlineReady = $state(false);
  const updateSW = registerSW({
    onNeedRefresh: () => (updateReady = true),
    onOfflineReady() {
      offlineReady = true;
      if (isStandalone) toast('✓ Ready to use offline', undefined, 4000);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) offlineReady = true;
      // Check for a new version hourly while the app stays open. Failures (no signal) are harmless.
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  requestPersistence();

  $effect(() => setThemeMode(app.d.settings.theme));

  const r = $derived(router.route);
</script>

{#if r.page === 'settings'}
  <Settings {offlineReady} />
{:else if r.page === 'install'}
  <Install />
{:else}
  <Home />
{/if}

{#if updateReady}
  <div class="update" role="status">
    <span>✨ A new version is ready.</span>
    <button class="btn small primary" onclick={() => updateSW(true)}>Update</button>
    <button class="btn small ghost" onclick={() => (updateReady = false)}>Later</button>
  </div>
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast">
      <span>{t.text}</span>
      {#if t.action}
        <button onclick={() => (t.action!.run(), dismissToast(t.id))}>{t.action.label}</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .update {
    position: fixed;
    left: 12px;
    right: 12px;
    top: calc(66px + env(safe-area-inset-top));
    z-index: 40;
    max-width: 696px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 14px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
    font-weight: 700;
  }
  .update span {
    flex: 1;
  }
</style>
