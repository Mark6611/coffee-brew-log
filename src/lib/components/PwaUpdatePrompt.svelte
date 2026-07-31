<script lang="ts">
	import { writable } from 'svelte/store';
	import { Capacitor } from '@capacitor/core';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import Banner from './Banner.svelte';

	// registerType is 'prompt' in vite.config — a freshly deployed service worker
	// waits instead of auto-activating, and surfaces here so the user chooses when
	// to reload (rather than assets swapping mid-session).
	// Inside the Capacitor shell the app is served from capacitor://localhost,
	// where service workers don't apply — updates ship with the app binary, so
	// skip SW registration entirely there.
	const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
	const { needRefresh, updateServiceWorker } = isNative
		? { needRefresh: writable(false), updateServiceWorker: async (_reload?: boolean) => {} }
		: useRegisterSW({
				// Browsers only check for a new SW on a real navigation, which this SPA
				// never performs after load — so without polling, a deploy is never noticed
				// during a long-lived installed session and needRefresh never fires ("still
				// broken" syndrome). Poll hourly and whenever the app is resumed.
				onRegisteredSW(_swUrl, r) {
					if (!r) return;
					setInterval(() => void r.update(), 60 * 60 * 1000);
					document.addEventListener('visibilitychange', () => {
						if (document.visibilityState === 'visible') void r.update();
					});
				}
			});

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
				class="press-sm inline-flex h-7 items-center rounded-full border border-copper/40 px-3 py-0.5 tracking-[0.1em] uppercase hover:bg-copper/10"
				>Reload</button
			>
			<button
				type="button"
				onclick={dismiss}
				class="px-1.5 py-0.5 tracking-[0.1em] text-copper-dk/70 uppercase transition-colors hover:text-copper-dk"
				>Later</button
			>
		{/snippet}
	</Banner>
{/if}
