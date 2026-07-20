<script lang="ts">
	import LiveDot from './LiveDot.svelte';
	// Display the post's publishedAt as a small mono stamp:
	//   • LiveDot (success-green)  PUBLISHED 2026.05.20
	// Render only when `publishedAt` is a real ISO timestamp.
	let { publishedAt }: { publishedAt: string | undefined } = $props();

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

{#if formatted}
	<div class="mt-1.5 flex items-center gap-2 font-mono text-[11px] tracking-[0.04em] text-muted">
		<LiveDot color="var(--color-success)" size={5} />
		<span>PUBLISHED {formatted}</span>
	</div>
{/if}
