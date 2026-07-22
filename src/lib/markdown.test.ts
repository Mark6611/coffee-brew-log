// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderNoteMarkdown } from './markdown';

// DOMPurify needs a DOM, so this file runs under jsdom (the rest of the suite is
// node). jsdom specifically, not happy-dom: DOMPurify's own test suite targets
// jsdom, and under happy-dom it silently fails to strip event handlers and
// javascript: hrefs — a false green that would have shipped an unsanitised
// component. The threat model: `notes` can arrive from a restored backup the
// viewer did not author (Settings restore → bulkImport, where notes is
// z.string()). marked passes raw HTML through and emits javascript: hrefs from
// ordinary links; DOMPurify is what neutralises both.
//
// Assertions target security INVARIANTS on the parsed tags, not exact output
// strings — DOMPurify's serialisation can shift between versions; what must hold
// is "nothing executable survives". Every assertion here fails on raw
// (unsanitised) marked output, so removing DOMPurify breaks the build.

const BANNED_TAGS = /^(script|iframe|object|embed|style|form|link|meta|base)$/;

/** Throws if the rendered HTML contains anything executable. */
function expectInert(html: string) {
	const tags = [...html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g)].map(
		(m) => ({ name: m[1].toLowerCase(), attrs: m[2] })
	);
	for (const tag of tags) {
		expect(tag.name, `banned <${tag.name}> in: ${html}`).not.toMatch(BANNED_TAGS);
		expect(tag.attrs, `event handler on <${tag.name}>: ${html}`).not.toMatch(/\bon[a-z]+\s*=/i);
		// javascript:/vbscript: never belong anywhere.
		expect(tag.attrs, `script url on <${tag.name}>: ${html}`).not.toMatch(
			/(?:javascript|vbscript):/i
		);
	}
	// data:/javascript:/vbscript: in a NAVIGABLE attribute (href) is the danger;
	// data: on an <img src> is inert (an image source never navigates or executes)
	// and DOMPurify keeps it, so this is scoped to href.
	for (const [, href] of html.matchAll(/\bhref\s*=\s*"([^"]*)"/gi)) {
		expect(href, `navigable dangerous href in: ${html}`).not.toMatch(
			/^\s*(?:javascript|vbscript|data):/i
		);
	}
}

describe('renderNoteMarkdown — XSS is neutralised', () => {
	const attacks = [
		'<img src=x onerror=alert(1)>',
		'<script>alert(1)</script>',
		'<svg onload=alert(1)></svg>',
		'<iframe src="https://evil.example"></iframe>',
		'<a href="https://ok.example" onclick="alert(1)">x</a>',
		'<style>body{display:none}</style>',
		'<body onload=alert(1)>',
		'<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
		'<div><p onmouseover="alert(1)">hover</p></div>',
		'[click me](javascript:alert(1))',
		'[x](&#106;avascript:alert(1))',
		'[x](https://e.com/" onmouseover="alert(1))',
		'![alt](data:text/html,<script>alert(1)</script>)'
	];

	for (const src of attacks) {
		it(`neutralises ${src.slice(0, 40)}`, () => {
			expectInert(renderNoteMarkdown(src));
		});
	}

	it('drops a javascript: link but keeps its text', () => {
		const html = renderNoteMarkdown('[click me](javascript:alert(1))');
		expect(html).not.toMatch(/javascript:/i);
		expect(html).toContain('click me');
	});
});

describe('renderNoteMarkdown — legitimate content survives', () => {
	it('keeps ordinary formatting', () => {
		const html = renderNoteMarkdown('**bold** and _em_ and `code`\n\n- one\n- two');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>em</em>');
		expect(html).toContain('<code>code</code>');
		expect(html).toContain('<li>one</li>');
		expectInert(html);
	});

	it('keeps a real https link', () => {
		const html = renderNoteMarkdown('[Brew Sheet](https://html-brew.vercel.app/posts/1)');
		expect(html).toContain('href="https://html-brew.vercel.app/posts/1"');
		expectInert(html);
	});

	it('renders a realistic brew note unharmed', () => {
		const html = renderNoteMarkdown(
			'# Day 3\n\nBloom went long. The bed never crusted.\n\n*Stone fruit on cool-down.*'
		);
		expect(html).toContain('<h1>Day 3</h1>');
		expect(html).toContain('<em>Stone fruit on cool-down.</em>');
		expectInert(html);
	});
});

describe('renderNoteMarkdown — empties', () => {
	it('returns an empty string for nothing to render', () => {
		expect(renderNoteMarkdown('')).toBe('');
		expect(renderNoteMarkdown(null)).toBe('');
		expect(renderNoteMarkdown(undefined)).toBe('');
	});
});
