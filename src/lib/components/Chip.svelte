<script lang="ts">
	import { FOCUS_RING_INSET } from './focus';
	import type { Snippet } from 'svelte';
	let {
		active = false,
		onclick,
		children,
		class: cls = ''
	}: {
		active?: boolean;
		onclick?: () => void;
		children: Snippet;
		class?: string;
	} = $props();
</script>

<button
	type="button"
	{onclick}
	aria-pressed={active}
	class="press-sm hit-44 {FOCUS_RING_INSET} h-9 rounded-full px-3.5 font-mono text-[calc(var(--dt-base)*13/17)] font-medium tracking-[-0.01em] whitespace-nowrap {active
		? 'bg-ink text-paper'
		: 'border border-hairline bg-paper text-ink-70 hover:bg-surface'} {cls}"
	>{@render children()}</button
>
