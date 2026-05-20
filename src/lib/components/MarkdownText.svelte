<script lang="ts">
	import { marked } from 'marked';

	let { text }: { text: string | null | undefined } = $props();

	// gfm: tables / strikethrough / task lists, the modern default
	// breaks: single newline → <br>, matches how people write notes
	marked.setOptions({ gfm: true, breaks: true });

	// XSS note: marked does NOT sanitize raw HTML in source by default.
	// Acceptable for this app because the only author is the signed-in user
	// (their own data; they can't XSS themselves). If/when the HTML Brew blog
	// project ships, revisit — anonymous readers shouldn't see arbitrary HTML.
	const html = $derived(text ? marked.parse(text) : '');
</script>

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
