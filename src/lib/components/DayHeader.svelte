<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="my-2.5 flex items-center gap-2.5">
	<div
		class="font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.14em] text-muted uppercase"
	>
		{@render children()}
	</div>
	<div class="h-px flex-1 bg-hairline"></div>
</div>
