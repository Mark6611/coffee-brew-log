<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		children,
		class: cls = ''
	}: { children: Snippet; class?: string } = $props();
</script>

<div
	class="text-muted font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] {cls}"
>{@render children()}</div>
