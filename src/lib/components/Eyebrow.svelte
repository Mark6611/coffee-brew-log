<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		children,
		class: cls = '',
		dirty = false
	}: { children: Snippet; class?: string; dirty?: boolean } = $props();
</script>

<div
	class="text-muted font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] {cls}"
>{@render children()}{#if dirty}<span
		class="bg-copper ml-1.5 inline-block h-1 w-1 rounded-full align-middle"
		aria-label="Changed"
	></span>{/if}</div>
