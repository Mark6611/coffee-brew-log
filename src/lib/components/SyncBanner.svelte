<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth.svelte';
	import { syncStatus } from '$lib/syncStatus.svelte';
	import { fullSync } from '$lib/sync';
	import Banner from './Banner.svelte';

	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		const goOnline = () => {
			online = true;
			// The offline banner promises changes "sync when you reconnect" — nothing
			// else triggers that, so push a sync here when signed in (fullSync no-ops if
			// already running or signed out).
			if (auth.user) void fullSync();
		};
		const goOffline = () => (online = false);
		window.addEventListener('online', goOnline);
		window.addEventListener('offline', goOffline);
		return () => {
			window.removeEventListener('online', goOnline);
			window.removeEventListener('offline', goOffline);
		};
	});

	// Banners only matter once signed in — before that the app is local-only and
	// "offline" / "sync failed" carry no meaning.
	const showOffline = $derived(!!auth.user && !online);
	const showError = $derived(!!auth.user && online && !!syncStatus.lastError);

	function retry() {
		void fullSync();
	}
</script>

{#if showOffline}
	<Banner tone="warning" role="status">
		<span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true"
		></span>
		Offline — changes are saved here and sync when you reconnect.
	</Banner>
{:else if showError}
	<Banner tone="danger" role="alert">
		<span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true"
		></span>
		Last sync failed.
		{#snippet action()}
			<button
				type="button"
				onclick={retry}
				disabled={syncStatus.syncing}
				class="press-sm inline-flex h-7 items-center rounded-full border border-danger/40 px-3 py-0.5 tracking-[0.1em] uppercase hover:bg-danger/10 disabled:opacity-50"
			>
				{syncStatus.syncing ? 'Syncing…' : 'Retry'}
			</button>
		{/snippet}
	</Banner>
{/if}
