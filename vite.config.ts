import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Coffee Brew Log',
				short_name: 'Brew Log',
				description: 'Log espresso and pour-over brews.',
				theme_color: '#b45309',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: 'icon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any maskable'
					}
				]
			}
		})
	]
});
