// Native-shell (Capacitor) helpers. Every function no-ops on the web, and the
// plugins are loaded via dynamic import inside try/catch, so the Vercel PWA
// build carries no hard dependency on any Capacitor plugin.

import { Capacitor } from '@capacitor/core';

export const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

/**
 * Style the iOS status bar to match the effective theme. Plugin semantics:
 * Style.Dark = light text (for dark UIs), Style.Light = dark text (for light
 * UIs). Called on boot and again whenever the theme toggle changes.
 */
export async function setupNativeChrome(theme: 'light' | 'dark'): Promise<void> {
	if (!isNative) return;
	try {
		const { StatusBar, Style } = await import('@capacitor/status-bar');
		await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
	} catch {
		/* plugin may be absent */
	}
}

/** Hide the native splash once the app has painted (kills the cold-launch black gap). */
export async function hideSplash(): Promise<void> {
	if (!isNative) return;
	try {
		const { SplashScreen } = await import('@capacitor/splash-screen');
		await SplashScreen.hide({ fadeOutDuration: 200 });
	} catch {
		/* plugin may be absent */
	}
}
