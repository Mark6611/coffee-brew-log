<script lang="ts">
	// Shared "couldn't read local data" state with a retry.
	//
	// The home route grew this pattern first (try/catch/finally + a Try again
	// button); five other routes set `loading = false` only after their awaits
	// resolved, so a storage failure — IndexedDB blocked in private mode, an
	// evicted store, a corrupt row — left them on "Loading…" for ever with no
	// way out and nothing logged. Extracted so the copy stays identical rather
	// than drifting six ways.
	let { noun, onretry }: { noun: string; onretry: () => void } = $props();
	import Button from './Button.svelte';
</script>

<div class="px-5 pt-16 text-center">
	<p class="font-display text-[calc(var(--dt-base)*20/17)] font-medium text-ink">
		Couldn't load your {noun}.
	</p>
	<p class="mt-2 text-[calc(var(--dt-base)*14/17)] text-muted">
		Something went wrong reading your data on this device.
	</p>
	<Button size="medium" variant="prominent" onclick={onretry} class="mt-5">Try again</Button>
</div>
