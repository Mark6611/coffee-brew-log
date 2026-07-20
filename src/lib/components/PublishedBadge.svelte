<script lang="ts">
	// Detail-page badge cluster: a copper pill that links out to the live post.
	// LiveDot + PUBLISHED + external-link glyph.
	import LiveDot from './LiveDot.svelte';
	let { href }: { href: string } = $props();
</script>

<a
	{href}
	target="_blank"
	rel="noopener noreferrer"
	class="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-copper-lt px-2.5 font-mono text-[10.5px] font-medium tracking-[0.12em] text-copper-dk uppercase transition-colors hover:bg-copper-lt/80"
>
	<LiveDot color="var(--color-copper-dk)" size={5} />
	<span>Published</span>
	<svg
		width="9"
		height="9"
		viewBox="0 0 10 10"
		class="-ml-0.5"
		fill="none"
		stroke="currentColor"
		stroke-width="1.4"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3.5 1.5h5v5M8.5 1.5L3 7" />
	</svg>
</a>
