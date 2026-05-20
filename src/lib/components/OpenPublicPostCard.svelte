<script lang="ts">
	// Detail-page CTA card that links out to the live blog post.
	// Copper-lt fill, copper icon button, post title, mono PUBLISHED stamp, chevron.
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
	rel="noopener noreferrer"
	class="bg-copper-lt hover:bg-copper-lt/85 mt-3 flex items-center gap-3 rounded-[14px] border border-[rgba(156,74,31,0.18)] px-3.5 py-3 transition-colors"
>
	<span
		class="bg-copper text-paper grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
		aria-hidden="true"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
			<circle cx="8" cy="8" r="6" />
			<path d="M2 8h12M8 2c2 1.8 2 10.2 0 12M8 2c-2 1.8-2 10.2 0 12" stroke-width="1.2" />
		</svg>
	</span>
	<div class="min-w-0 flex-1">
		<div
			class="text-ink truncate text-[14px] font-semibold tracking-[-0.005em]"
		>{title}</div>
		<div
			class="text-copper-dk mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] uppercase"
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
		class="text-copper-dk shrink-0"
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
