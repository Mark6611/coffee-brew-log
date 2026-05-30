<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import Banner from './Banner.svelte';

	// registerType is 'prompt' in vite.config — a freshly deployed service worker
	// waits instead of auto-activating, and surfaces here so the user chooses when
	// to reload (rather than assets swapping mid-session).
	const { needRefresh, updateServiceWorker } = useRegisterSW({});

	function reload() {
		void updateServiceWorker(true);
	}

	function dismiss() {
		needRefresh.set(false);
	}
</script>

{#if $needRefresh}
	<Banner tone="copper" role="status">
		A new version is available.
		{#snippet action()}
			<button
				type="button"
				onclick={reload}
				class="border-copper/40 hover:bg-copper/10 rounded-full border px-2.5 py-0.5 uppercase tracking-[0.1em] transition-colors"
			>Reload</button>
			<button
				type="button"
				onclick={dismiss}
				class="text-copper-dk/70 hover:text-copper-dk px-1.5 py-0.5 uppercase tracking-[0.1em] transition-colors"
			>Later</button>
		{/snippet}
	</Banner>
{/if}
