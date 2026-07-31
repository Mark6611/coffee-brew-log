<script lang="ts">
	import { slide } from 'svelte/transition';
	import { motion } from '$lib/motion.svelte';
	import type { Snippet } from 'svelte';

	// Shared full-width notice shell used by the offline / sync-error / PWA-update
	// banners. Owns the slide-in wrapper, the bar layout, and the tone palette;
	// call sites supply the message (with its status dot) and an optional action.
	let {
		tone = 'copper',
		role = 'status',
		children,
		action
	}: {
		tone?: 'warning' | 'danger' | 'copper';
		role?: 'status' | 'alert';
		children: Snippet;
		action?: Snippet;
	} = $props();

	const toneClass = {
		warning: 'border-warning/30 bg-warning/[0.08] text-warning-dk',
		danger: 'border-danger/30 bg-danger/[0.08] text-danger',
		copper: 'border-copper/30 bg-copper-lt text-copper-dk'
	};
</script>

<div transition:slide={motion({ duration: 180 })} class="px-5 pt-2">
	<div
		class="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-xl border px-3 py-2 font-mono text-[calc(var(--dt-base)*11/17)] font-medium tracking-[0.04em] {toneClass[
			tone
		]}"
		{role}
	>
		<span class="flex items-center gap-2">{@render children()}</span>
		{#if action}
			<span class="flex shrink-0 items-center gap-2">{@render action()}</span>
		{/if}
	</div>
</div>
