// Prerender the privacy policy to static HTML so it's fully readable without JS
// (App Store reviewers and crawlers fetch the raw document). Required by App
// Review 5.1.1 — a URL in App Store Connect AND an in-app link (Settings).
export const prerender = true;
