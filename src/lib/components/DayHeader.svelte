<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="my-2.5 flex items-center gap-2.5">
	<div class="text-muted font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]">
		{@render children()}
	</div>
	<div class="bg-hairline h-px flex-1"></div>
</div>
