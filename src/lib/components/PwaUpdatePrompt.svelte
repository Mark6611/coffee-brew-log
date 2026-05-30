<script lang="ts">
	import { slide } from 'svelte/transition';
	import { useRegisterSW } from 'virtual:pwa-register/svelte';

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
	<div transition:slide={{ duration: 180 }} class="px-[22px] pt-2">
		<div
			class="border-copper/30 bg-copper-lt text-copper-dk mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-3 py-2 font-mono text-[11px] font-medium tracking-[0.04em]"
			role="status"
		>
			<span>A new version is available.</span>
			<span class="flex shrink-0 items-center gap-1.5">
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
			</span>
		</div>
	</div>
{/if}
