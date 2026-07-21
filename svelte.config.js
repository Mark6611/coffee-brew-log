import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		// Defence-in-depth behind the note sanitizer ($lib/markdown.ts). Delivered
		// as a <meta http-equiv> tag rather than an HTTP header because the app also
		// runs in the Capacitor shell at capacitor://localhost, where Vercel's
		// response headers never reach — a meta tag ships inside the HTML, so one
		// policy covers both. (Header-only concerns like frame-ancestors go in
		// vercel.json for the web build instead.)
		//
		// hash mode, not nonce: this is a fully static SPA (ssr = false), so there
		// is no server to mint a per-request nonce. SvelteKit hashes its own inline
		// bootstrap and the theme <script> in app.html at build time and folds those
		// hashes into script-src, so script-src stays free of 'unsafe-inline'.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				// SvelteKit hashes its OWN inline bootstrap automatically, but not the
				// author-written theme <script> in app.html — that one is passed through
				// verbatim, so its hash is pinned here by hand. If you edit that script,
				// update this hash (the build prints the right one as a CSP console error,
				// or run: openssl dgst -sha256 -binary <script-body> | openssl base64).
				// A stale hash fails soft: the script is blocked and the pre-hydration
				// theme flash returns — it does not break the app.
				'script-src': ['self', 'sha256-UtPhxnXX+lLejCHai22bbuaqQOQqfVDpu5mx+AukbdE='],
				// The app sets ~50 inline style="" attributes; those can't be hashed
				// (dynamic, and hashes don't cover style attributes anyway). Style
				// injection is far less dangerous than script, which stays locked down.
				'style-src': ['self', 'unsafe-inline'],
				// Photos are stored as data: URLs (canvas.toDataURL, see photo/resize.ts).
				'img-src': ['self', 'data:'],
				'font-src': ['self'],
				// Supabase sync/auth on the web build. Wildcarded at the subdomain so a
				// project rotation doesn't silently break sync; native uses no network.
				'connect-src': ['self', 'https://*.supabase.co', 'wss://*.supabase.co'],
				'manifest-src': ['self'],
				'worker-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['none']
			}
		},
		prerender: {
			handleHttpError: ({ path, message }) => {
				// The PWA manifest (linked in app.html) is intentionally NOT generated
				// in the capacitor/native build (BUILD_TARGET=capacitor disables the PWA
				// plugin), so prerendering /privacy crawls that <link> and 404s. Ignore
				// only this asset; in the web build the manifest exists and this never
				// fires. Any other broken link still fails the build.
				if (path === '/manifest.webmanifest') return;
				throw new Error(message);
			}
		}
	}
};

export default config;
