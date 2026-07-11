<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	let {
		eyebrow,
		children,
		action
	}: {
		eyebrow?: string;
		children: Snippet;
		action?: Snippet;
	} = $props();

	// iOS large-title behaviour: the bar is flush with the page at rest, then
	// gains a translucent material blur + hairline once content scrolls beneath
	// it. Threshold is a few px so the frost only appears after a real scroll.
	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 6);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<div
	class="header sticky top-0 z-30 px-[22px] pt-[14px] pb-[18px] transition-[background-color,border-color] duration-300 {scrolled
		? 'is-scrolled border-b'
		: 'border-b border-transparent'}"
>
	{#if eyebrow}
		<div class="mb-1.5 font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">
			{eyebrow}
		</div>
	{/if}
	<div class="flex items-end justify-between gap-4">
		<h1
			class="m-0 font-display text-[34px] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			{@render children()}
		</h1>
		{#if action}
			<div>{@render action()}</div>
		{/if}
	</div>
</div>

<style>
	/* Frosted material: translucent paper + blur so list content reads through
	   the bar as it scrolls under, matching the iOS 27 large-title nav. The
	   border colour is driven by the app's own hairline token. */
	.header.is-scrolled {
		background-color: color-mix(in srgb, var(--color-paper) 72%, transparent);
		border-color: var(--color-hairline);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		backdrop-filter: saturate(180%) blur(20px);
	}
</style>
