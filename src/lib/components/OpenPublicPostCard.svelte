<script lang="ts">
	// Detail-page CTA card that links out to the live blog post.
	// Copper-lt fill, copper icon button, post title, mono PUBLISHED stamp, chevron.
	// href is a blog URL on another origin (see postUrl). target="_blank" plus the
	// cross-origin URL already keep this out of the client router — rel="external"
	// is belt-and-braces, and is what satisfies svelte/no-navigation-without-resolve
	// for an href the component can't resolve(). Don't drop it: lint fails.
	import LiveDot from './LiveDot.svelte';

	let {
		href,
		title,
		publishedAt
	}: { href: string; title: string; publishedAt: string | undefined } = $props();

	const formatted = $derived.by(() => {
		if (!publishedAt) return null;
		const d = new Date(publishedAt);
		if (Number.isNaN(d.getTime())) return null;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}.${m}.${day}`;
	});
</script>

<a
	{href}
	target="_blank"
	rel="external noopener noreferrer"
	class="mt-3 flex items-center gap-3 rounded-[14px] border border-copper/20 bg-copper-lt px-4 py-3 transition-colors hover:bg-copper-lt/85"
>
	<span
		class="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-copper text-paper"
		aria-hidden="true"
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.4"
		>
			<circle cx="8" cy="8" r="6" />
			<path d="M2 8h12M8 2c2 1.8 2 10.2 0 12M8 2c-2 1.8-2 10.2 0 12" stroke-width="1.2" />
		</svg>
	</span>
	<div class="min-w-0 flex-1">
		<div
			class="truncate text-[calc(var(--dt-base)*14/17)] font-semibold tracking-[-0.005em] text-ink"
		>
			{title}
		</div>
		<div
			class="mt-0.5 flex items-center gap-2 font-mono text-[calc(var(--dt-base)*10.5/17)] tracking-[0.08em] text-copper-dk uppercase"
		>
			<LiveDot color="var(--color-copper-dk)" size={4} />
			{#if formatted}
				<span>Published {formatted}</span>
			{:else}
				<span>Published</span>
			{/if}
		</div>
	</div>
	<svg
		width="8"
		height="14"
		viewBox="0 0 8 14"
		class="shrink-0 text-copper-dk"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M1 1l6 6-6 6" />
	</svg>
</a>
