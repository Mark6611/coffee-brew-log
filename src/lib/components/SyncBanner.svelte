<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { auth } from '$lib/auth.svelte';
	import { syncStatus } from '$lib/syncStatus.svelte';
	import { fullSync } from '$lib/sync';

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
	<div transition:slide={{ duration: 180 }} class="px-[22px] pt-2">
		<div
			class="border-warning/30 bg-warning/[0.08] text-warning mx-auto flex max-w-2xl items-center gap-2 rounded-xl border px-3 py-2 font-mono text-[11px] font-medium tracking-[0.04em]"
			role="status"
		>
			<span class="bg-warning inline-block h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
			></span>
			Offline — changes are saved here and sync when you reconnect.
		</div>
	</div>
{:else if showError}
	<div transition:slide={{ duration: 180 }} class="px-[22px] pt-2">
		<div
			class="border-danger/30 bg-danger/[0.08] text-danger mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-3 py-2 font-mono text-[11px] font-medium tracking-[0.04em]"
			role="alert"
		>
			<span class="flex items-center gap-2">
				<span class="bg-danger inline-block h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true"
				></span>
				Last sync failed.
			</span>
			<button
				type="button"
				onclick={retry}
				disabled={syncStatus.syncing}
				class="border-danger/40 hover:bg-danger/10 shrink-0 rounded-full border px-2.5 py-0.5 uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
			>
				{syncStatus.syncing ? 'Syncing…' : 'Retry'}
			</button>
		</div>
	</div>
{/if}
