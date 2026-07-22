<script lang="ts">
	import { renderNoteMarkdown } from '$lib/markdown';

	let { text }: { text: string | null | undefined } = $props();

	// Sanitized at render — see $lib/markdown.ts for the DOMPurify wiring and the
	// threat model (notes can arrive from a restored backup), and markdown.test.ts
	// for the XSS payload battery. The {@html} below only ever receives
	// DOMPurify-scrubbed output.
	const html = $derived(renderNoteMarkdown(text));
</script>

<!-- html is DOMPurify-scrubbed in renderNoteMarkdown(); the rule flags every
     {@html} regardless of source, so it is disabled on the next line only. -->
<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div class="markdown">{@html html}</div>

<style>
	.markdown :global(p) {
		margin: 0;
	}
	.markdown :global(p + p) {
		margin-top: 0.6em;
	}
	.markdown :global(strong) {
		font-weight: 600;
	}
	.markdown :global(ul),
	.markdown :global(ol) {
		margin: 0.3em 0;
		padding-left: 1.5em;
	}
	.markdown :global(li) {
		margin: 0.15em 0;
	}
	.markdown :global(a) {
		color: var(--color-copper, currentColor);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.markdown :global(code) {
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.92em;
		background: rgba(0, 0, 0, 0.18);
		padding: 0.05em 0.3em;
		border-radius: 3px;
	}
	.markdown :global(blockquote) {
		margin: 0.5em 0;
		padding-left: 0.8em;
		border-left: 2px solid currentColor;
		opacity: 0.85;
	}
	.markdown :global(hr) {
		margin: 0.8em 0;
		border: 0;
		border-top: 1px solid currentColor;
		opacity: 0.25;
	}
</style>
