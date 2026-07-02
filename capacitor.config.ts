import type { CapacitorConfig } from '@capacitor/cli';

// Native shell config. The iOS app wraps the same static SvelteKit build the
// Vercel PWA serves (adapter-static, SPA fallback) — one codebase, two shells.
// The native shell exists to reach hardware the web can't on iOS (Bluetooth LE
// for the Acaia scale, later machine integrations).
const config: CapacitorConfig = {
	appId: 'com.kornkran.brewlog',
	appName: 'Coffee Brew Log',
	webDir: 'build'
};

export default config;
