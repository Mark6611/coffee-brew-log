<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		children,
		class: cls = '',
		dirty = false
	}: { children: Snippet; class?: string; dirty?: boolean } = $props();
</script>

<div
	class="font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.14em] text-muted uppercase {cls}"
>
	{@render children()}{#if dirty}<span
			class="ml-2 inline-block h-1 w-1 rounded-full bg-copper align-middle"
			aria-label="Changed"
		></span>{/if}
</div>
