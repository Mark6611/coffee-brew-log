<script lang="ts">
	// Detail-page badge cluster: a copper pill that links out to the live post.
	// LiveDot + PUBLISHED + external-link glyph.
	// href is a blog URL on another origin (see postUrl). target="_blank" plus the
	// cross-origin URL already keep this out of the client router — rel="external"
	// is belt-and-braces, and is what satisfies svelte/no-navigation-without-resolve
	// for an href the component can't resolve(). Don't drop it: lint fails.
	import LiveDot from './LiveDot.svelte';
	let { href }: { href: string } = $props();
</script>

<a
	{href}
	target="_blank"
	rel="external noopener noreferrer"
	class="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-copper-lt px-2.5 font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.12em] text-copper-dk uppercase transition-colors hover:bg-copper-lt/80"
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
