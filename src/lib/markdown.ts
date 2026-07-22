import { Marked } from 'marked';
import DOMPurify from 'dompurify';

// Renders note markdown to HTML that is safe to hand to {@html}.
//
// marked does NOT sanitize — it passes raw HTML in the source straight through
// (it dropped its own `sanitize` option in v4) and emits `javascript:` hrefs
// from ordinary markdown links. So its output is scrubbed with DOMPurify, which
// strips <script>, inline event handlers and javascript:/data: URLs while
// keeping the formatting tags real notes use.
//
// This matters because `notes` is not always authored by the viewer: Settings
// restore-from-file runs a user-supplied JSON backup through bulkImport, where
// `notes` is z.string() — a type check, not a sanitizer. The field renders on
// the brew detail, bag detail and brew card. (Publishing to the html-brew blog
// is a second reader-isn't-author surface; it's gated off today — BLOG_ENABLED
// — and html-brew must scrub on its own side when it ships.)
//
// Extracted from MarkdownText.svelte so the sanitization is unit-testable
// (markdown.test.ts). Kept off `$app/*` so vitest — which aliases only $lib —
// can import it.

// A local instance rather than the shared `marked` singleton, so these options
// can't leak into any other caller.
const marked = new Marked({
	// gfm: tables / strikethrough / task lists, the modern default
	// breaks: single newline → <br>, matches how people write notes
	gfm: true,
	breaks: true
});

/**
 * Note markdown → sanitized HTML. Returns '' for empty/absent text.
 *
 * The `window` guard is a failsafe: DOMPurify needs a DOM, and the app is
 * ssr=false so this only runs in the browser anyway — but if it were ever
 * reached without a DOM, returning '' is safer than emitting unsanitized HTML.
 */
export function renderNoteMarkdown(text: string | null | undefined): string {
	if (!text || typeof window === 'undefined') return '';
	return DOMPurify.sanitize(marked.parse(text) as string);
}
