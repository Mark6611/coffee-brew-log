<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		eyebrow,
		children,
		action
	}: {
		eyebrow?: string;
		children: Snippet;
		action?: Snippet;
	} = $props();
</script>

<div class="px-[22px] pt-[14px] pb-[18px]">
	{#if eyebrow}
		<div class="text-muted mb-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]">
			{eyebrow}
		</div>
	{/if}
	<div class="flex items-end justify-between gap-4">
		<h1
			class="font-display text-ink m-0 text-[34px] font-medium leading-[1.05] tracking-[-0.015em]"
		>{@render children()}</h1>
		{#if action}
			<div>{@render action()}</div>
		{/if}
	</div>
</div>
