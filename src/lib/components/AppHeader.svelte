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
	// gains a translucent material blur + hairline once it PINS and content scrolls
	// beneath it. Derive "pinned" from the element itself, not window.scrollY: on
	// pages where the header sits below a "Home" link row (/brews, /bags) a fixed
	// scrollY threshold frosted the bar ~40px before it actually stuck. `rect.top <= 0`
	// means it's stuck to the top; `scrollY > 0` keeps a header that's naturally at the
	// top (home) flush at rest instead of frosting immediately.
	let el = $state<HTMLDivElement | undefined>();
	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => {
			scrolled = !!el && el.getBoundingClientRect().top <= 0.5 && window.scrollY > 0;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<div
	bind:this={el}
	class="header sticky top-0 z-30 px-5 pt-3 pb-4 transition-[background-color,border-color] duration-300 {scrolled
		? 'is-scrolled border-b'
		: 'border-b border-transparent'}"
>
	{#if eyebrow}
		<div
			class="mb-2 font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.14em] text-muted uppercase"
		>
			{eyebrow}
		</div>
	{/if}
	<div class="flex items-end justify-between gap-4">
		<h1
			class="m-0 font-display text-[calc(var(--dt-base)*34/17)] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			{@render children()}
		</h1>
		{#if action}
			<!-- Clears the app's fixed theme toggle (right-5, w-9 → 48px occupied),
			     which otherwise overlaps and steals taps from this action button once
			     the header pins; no clearance needed once the column has side margins (sm+). -->
			<div class="pe-16 sm:pe-0">{@render action()}</div>
		{/if}
	</div>
</div>

<style>
	/* Frosted material: translucent paper + blur so list content reads through
	   the bar as it scrolls under, matching the iOS 27 large-title nav. The
	   border colour is driven by the app's own hairline token. */
	.header.is-scrolled {
		background-color: rgb(var(--color-paper-rgb) / 0.72);
		border-color: var(--color-hairline);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		backdrop-filter: saturate(180%) blur(20px);
	}
	/* Same contract as .glass — "Reduce Transparency" turns the bar opaque
	   rather than leaving unblurred content showing through a tinted panel. */
	@media (prefers-reduced-transparency: reduce) {
		.header.is-scrolled {
			background-color: var(--color-paper);
			-webkit-backdrop-filter: none;
			backdrop-filter: none;
		}
	}
</style>
