<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';

	let { text }: { text: string | null | undefined } = $props();

	// gfm: tables / strikethrough / task lists, the modern default
	// breaks: single newline → <br>, matches how people write notes
	marked.setOptions({ gfm: true, breaks: true });

	// marked passes raw HTML in the source straight through (it dropped its own
	// `sanitize` option in v4), so its output is scrubbed before it reaches
	// {@html}. This was once waved off as "the only author is the signed-in user"
	// — no longer true: Settings can restore a hand-edited backup JSON, where
	// `notes` is validated as a string but never scrubbed, and this component
	// renders that field on the brew detail, bag detail and brew card. DOMPurify
	// strips <script>, inline event handlers and javascript:/data: URLs while
	// keeping the formatting tags real notes use. (The blog publish path is a
	// second reader-isn't-author surface; it's gated off today — BLOG_ENABLED —
	// and html-brew must sanitize on its own side when it ships.)
	//
	// ssr=false, so this only runs in the browser; the window guard is a
	// failsafe so a non-DOM context can never fall through to unsanitized HTML.
	const html = $derived(
		text && typeof window !== 'undefined' ? DOMPurify.sanitize(marked.parse(text) as string) : ''
	);
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
