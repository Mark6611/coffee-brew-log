import type { CapacitorConfig } from '@capacitor/cli';

// Native shell config. The iOS app wraps the same static SvelteKit build the
// Vercel PWA serves (adapter-static, SPA fallback) — one codebase, two shells.
// The native shell exists to reach hardware the web can't on iOS (Bluetooth LE
// for the Acaia scale, later machine integrations).
const config: CapacitorConfig = {
	appId: 'com.mark.brewlog',
	appName: 'Coffee Brew Log',
	webDir: 'build',
	ios: {
		// Dark paper behind the webview so cold launch shows a warm dark frame,
		// not a white flash (the owner runs the app in dark theme).
		backgroundColor: '#16120e'
	},
	plugins: {
		SplashScreen: {
			// Hold the splash until the web view has painted; hideSplash() in the
			// root layout then fades it out — no black gap before first paint.
			launchAutoHide: false,
			backgroundColor: '#16120e',
			showSpinner: false
		}
	}
};

export default config;
