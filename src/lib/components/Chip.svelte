<script lang="ts">
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
	class="h-9 rounded-full px-3.5 font-mono text-[13px] font-medium tracking-[-0.01em] whitespace-nowrap transition-colors {active
		? 'bg-ink text-paper'
		: 'bg-paper border-hairline text-ink-70 hover:bg-surface border'} {cls}"
>{@render children()}</button>
