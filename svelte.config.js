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
