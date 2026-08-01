import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

// The Capacitor build ships the app fully bundled inside the WebView — a
// service worker only interferes there (it can intercept chunk loads and
// blank the screen). BUILD_TARGET=capacitor disables the PWA plugin entirely,
// so the native bundle contains no sw.js/workbox at all.
const native = process.env.BUILD_TARGET === 'capacitor';

export default defineConfig({
	build: {
		// Pin the CSS minify pass to the app's real browser floor. Tailwind v4's
		// own pipeline emits media-query RANGE syntax — `(width>=40rem)` for its
		// breakpoints, and it even rewrites hand-written `(max-width: 600px)`
		// source into `(width<=600px)` — which Safari < 16.4 cannot parse, so
		// every responsive rule inside is silently dropped there. With cssTarget
		// set, Vite's Lightning CSS minifier compiles them back to min-/max-width
		// (and keeps/adds vendor prefixes the targets need).
		//
		// PLUMBING GOTCHA: this must be build.cssTarget. Vite's minify pass
		// hard-overrides `targets` with convertTargets(build.cssTarget), so
		// css.lightningcss.targets is silently ignored. Unset, cssTarget converts
		// to {} and Lightning lowers nothing — which is how the range syntax
		// shipped. The result is gated by scripts/verify-bundle-css.mjs in CI.
		cssTarget: [
			// iOS/Safari floor per App Store deployment target.
			'safari15',
			'ios15',
			// Desktop entries so Lightning keeps unprefixed forms alive (e.g. plain
			// backdrop-filter, which Safari-only targets would consider dead).
			'chrome100',
			'firefox100'
		],
		cssMinify: 'lightningcss'
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			disable: native,
			registerType: 'prompt',
			kit: {
				// adapter-static writes the SPA fallback to build/index.html, which sits
				// OUTSIDE the plugin's glob dir, so it never entered the precache manifest —
				// and the default navigateFallback ('/') then bound the NavigationRoute to a
				// non-precached URL, which workbox rejects synchronously. Result: the SW
				// registered but handled NO navigations, so every offline launch white-screened
				// despite all assets being cached. Naming the fallback precaches it and wires
				// navigateFallback to it. (Verify: rebuild and grep build/sw.js for index.html.)
				adapterFallback: 'index.html'
			},
			manifest: {
				name: 'Coffee Brew Log',
				short_name: 'Brew Log',
				description: 'Log espresso and pour-over brews.',
				theme_color: '#9C4A1F',
				background_color: '#F4EFE6',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: 'icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					},
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	]
});
