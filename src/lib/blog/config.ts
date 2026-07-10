// Whether the public blog is live. The Astro site (sibling `html-brew` repo)
// has no real /posts/<id> deployment yet — every publish link 404s — so the PWA
// ships with the publish UI OFF (App Review 2.1: no dead features; also keeps
// the phase-2 blog out of phase-1 per CLAUDE.md). Flip to true once html-brew
// actually renders posts; the publish toggle, badges, and CTA reappear.
export const BLOG_ENABLED = false;

// Public-facing URL of the Brew Sheet blog.
// Update this constant when the Astro site (sibling `html-brew` repo) gets a
// real deployment. Until then, links from the PWA point at the placeholder.
export const BLOG_URL = 'https://html-brew.vercel.app';

// Build the URL for a single post by brew id.
// V1 uses the brew id directly so the URL is stable regardless of blogTitle
// edits. If/when we add a `slug` column (handoff: "set on first publish,
// immutable thereafter"), this is the single place to change.
export function postUrl(brewId: string): string {
	return `${BLOG_URL}/posts/${brewId}`;
}
