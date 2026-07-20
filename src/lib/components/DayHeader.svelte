<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="my-2.5 flex items-center gap-2.5">
	<div class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">
		{@render children()}
	</div>
	<div class="h-px flex-1 bg-hairline"></div>
</div>
