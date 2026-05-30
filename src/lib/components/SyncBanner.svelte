<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth.svelte';
	import { syncStatus } from '$lib/syncStatus.svelte';
	import { fullSync } from '$lib/sync';
	import Banner from './Banner.svelte';

	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		const goOnline = () => (online = true);
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
		<span class="bg-warning inline-block h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
		></span>
		Offline — changes are saved here and sync when you reconnect.
	</Banner>
{:else if showError}
	<Banner tone="danger" role="alert">
		<span class="bg-danger inline-block h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"></span>
		Last sync failed.
		{#snippet action()}
			<button
				type="button"
				onclick={retry}
				disabled={syncStatus.syncing}
				class="border-danger/40 hover:bg-danger/10 rounded-full border px-2.5 py-0.5 uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
			>
				{syncStatus.syncing ? 'Syncing…' : 'Retry'}
			</button>
		{/snippet}
	</Banner>
{/if}
