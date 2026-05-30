import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Standalone Vitest config (not wired through the SvelteKit Vite plugin —
// the suite covers pure TS logic in src/lib, so we only need the $lib alias
// to resolve, not the full app build pipeline).
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
