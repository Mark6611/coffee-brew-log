<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	let {
		eyebrow,
		children,
		action,
		back
	}: {
		eyebrow?: string;
		children: Snippet;
		action?: Snippet;
		/** Optional leading back link, rendered INSIDE the sticky bar so it
		 *  stays reachable once the header pins (it used to sit in a separate
		 *  row above the bar and scrolled away). */
		back?: Snippet;
	} = $props();

	// iOS large-title behaviour: the bar is flush with the page at rest, then
	// gains a translucent material blur + hairline once it PINS and content
	// scrolls beneath it. Derive "pinned" from the element itself, not a fixed
	// window.scrollY threshold: the header's flow position varies per page (it
	// used to sit below separate "Home" rows on /brews and /bags — those are
	// folded into the bar now — and on iOS the safe-area offsets it), so only
	// the element's own rect knows when it actually sticks. The sticky offset
	// is env(safe-area-inset-top) (0 on the web), so compare rect.top against
	// the element's computed `top`, not against 0.
	let el = $state<HTMLDivElement | undefined>();
	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => {
			if (!el) {
				scrolled = false;
				return;
			}
			const stickyTop = parseFloat(getComputedStyle(el).top) || 0;
			scrolled = el.getBoundingClientRect().top <= stickyTop + 0.5 && window.scrollY > 0;
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<div
	bind:this={el}
	class="header sticky top-[env(safe-area-inset-top,0px)] z-30 px-5 pt-3 pb-4 transition-[background-color,border-color] duration-300 {scrolled
		? 'is-scrolled border-b'
		: 'border-b border-transparent'}"
>
	{#if back}
		<!-- Constant-height leading row — the bar must NOT collapse or grow on
		     scroll (a sticky element that changes height re-lays out everything
		     below it and flickers under momentum scroll on short lists). -->
		<div class="mb-1 flex">{@render back()}</div>
	{/if}
	{#if eyebrow}
		<div class="mb-2 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
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
			<div>{@render action()}</div>
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
	/* The bar pins BELOW the status bar (sticky top: env(safe-area-inset-top)),
	   so its height never changes — no layout jump at the pin moment. This
	   strip extends the frosted material up over the status bar instead. Zero
	   height on the web (env() resolves to 0px). */
	.header.is-scrolled::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 100%;
		height: env(safe-area-inset-top, 0px);
		background-color: rgb(var(--color-paper-rgb) / 0.72);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		backdrop-filter: saturate(180%) blur(20px);
	}
	/* Same contract as .glass — "Reduce Transparency" turns the bar opaque
	   rather than leaving unblurred content showing through a tinted panel. */
	@media (prefers-reduced-transparency: reduce) {
		.header.is-scrolled,
		.header.is-scrolled::before {
			background-color: var(--color-paper);
			-webkit-backdrop-filter: none;
			backdrop-filter: none;
		}
	}
</style>
