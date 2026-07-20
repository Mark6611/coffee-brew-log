<script lang="ts">
	import type { Snippet } from 'svelte';
	import Eyebrow from './Eyebrow.svelte';

	// Grouped inset list — the iOS 27 UI Kit's default table style, and the shape
	// Settings already reaches for by hand in half a dozen places. An optional
	// uppercase header sits OUTSIDE the card (the kit puts group headers on the
	// page background, not on the row surface), then rows stack inside a single
	// rounded card separated by hairlines.
	//
	// Rows come from <ListRow>; the divider is drawn here rather than per row so
	// the first/last row never gets a stray line against the card's rounded edge.
	// `overflow-hidden` is what lets a pressed row's highlight clip to the corner
	// radius instead of squaring it off.

	let {
		header,
		footer,
		class: cls = '',
		children
	}: {
		/** Uppercase group label above the card. */
		header?: string;
		/** Explanatory text under the card, in the kit's footnote role. */
		footer?: string;
		class?: string;
		children: Snippet;
	} = $props();
</script>

{#if header}
	<Eyebrow class="mb-2">{header}</Eyebrow>
{/if}

<div
	class="overflow-hidden rounded-2xl border border-hairline bg-surface [&>*+*]:border-t [&>*+*]:border-hairline {cls}"
>
	{@render children()}
</div>

{#if footer}
	<p class="mt-2 px-1 text-[12.5px] leading-[1.45] text-muted">{footer}</p>
{/if}
