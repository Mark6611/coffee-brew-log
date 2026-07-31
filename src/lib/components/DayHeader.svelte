<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="my-2.5 flex items-center gap-3">
	<div class="font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
		{@render children()}
	</div>
	<div class="h-px flex-1 bg-hairline"></div>
</div>
