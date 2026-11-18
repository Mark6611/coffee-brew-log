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

// Loaded once and kept, so only the first tick pays for the import.
let hapticsModule: Promise<typeof import('@capacitor/haptics')> | null = null;

/**
 * A light haptic tick — what a native switch or segmented control gives when it
 * changes. Best-effort and native-only: the web build stays silent (iOS Safari
 * has no vibration API, and a buzzing Android PWA is not the intent).
 */
export async function hapticTick(): Promise<void> {
	if (!isNative) return;
	try {
		hapticsModule ??= import('@capacitor/haptics');
		const { Haptics, ImpactStyle } = await hapticsModule;
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		hapticsModule = null; // plugin absent or the load failed — try again next time
	}
}

// ─── iCloud sync bridge (CloudSyncPlugin.swift, registered in ViewController) ──
// Ported from sibling Buffy: the native side moves opaque {id, updatedAt, json}
// records in/out of CloudKit's private database; all merge logic lives in JS
// ($lib/cloudSync). registerPlugin is safe to call on web — every wrapper
// no-ops before touching it.
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { parseHingeState, type HingeState } from './hinge';

export interface CloudRecord {
	id: string;
	updatedAt: string;
	json: string;
}
interface CloudSyncBridge {
	isAvailable(): Promise<{ available: boolean }>;
	pull(opts: { type: string }): Promise<{ recordsJson: string }>;
	push(opts: { type: string; recordsJson: string }): Promise<void>;
}
const CloudSync = registerPlugin<CloudSyncBridge>('CloudSync');

/** Is iCloud available (device signed in, capability provisioned)? False on web. */
export async function cloudSyncIsAvailable(): Promise<boolean> {
	if (!isNative) return false;
	try {
		return (await CloudSync.isAvailable()).available;
	} catch {
		return false;
	}
}

/** Full snapshot of one record type from CloudKit. Throws on failure —
 * callers must NOT treat an error as an empty cloud. */
export async function cloudSyncPull(type: string): Promise<CloudRecord[]> {
	if (!isNative) return [];
	const { recordsJson } = await CloudSync.pull({ type });
	return JSON.parse(recordsJson) as CloudRecord[];
}

/** Upsert records of `type` to CloudKit — overwrites the server copy (the
 * merge decision already happened in JS). Throws on failure. */
export async function cloudSyncPush(type: string, records: CloudRecord[]): Promise<void> {
	if (!isNative || records.length === 0) return;
	await CloudSync.push({ type, recordsJson: JSON.stringify(records) });
}

// ─── iPhone Duo hinge (HingePlugin.swift, registered in ViewController) ──────
// Why the layout needs it: src/lib/hinge.ts.
interface HingeBridge {
	getState(): Promise<{ state: string }>;
	addListener(event: 'change', cb: (e: { state: string }) => void): Promise<PluginListenerHandle>;
}
const Hinge = registerPlugin<HingeBridge>('Hinge');

/** Follow the iPhone Duo's hinge. Devices without a hinge only ever report 'none';
 *  on the web this never calls back at all. */
export async function watchHinge(onChange: (state: HingeState) => void): Promise<void> {
	if (!isNative) return;
	try {
		// Subscribe first, then read the current state — and drop that read if a
		// change event already landed while it was in flight, or a stale state could
		// overwrite a newer one mid-fold.
		let events = 0;
		await Hinge.addListener('change', (e) => {
			events++;
			onChange(parseHingeState(e.state));
		});
		const before = events;
		const { state } = await Hinge.getState();
		if (events === before) onChange(parseHingeState(state));
	} catch {
		/* native shell without the plugin: width-only layout, as before */
	}
}

// ─── Native appearance (AppearancePlugin.swift, registered in ViewController) ──
// The in-app theme has three settings; iOS only knows the system one. Without
// this, choosing Dark in the app on a Light phone leaves everything UIKit draws
// — the keyboard, the date and time pickers, the share sheet and file picker —
// in Light over a dark app. `color-scheme` in layout.css covers what the web
// engine draws; this covers the rest by overriding the window's interface style.
interface AppearanceBridge {
	setStyle(opts: { style: 'light' | 'dark' | 'system' }): Promise<void>;
}
const Appearance = registerPlugin<AppearanceBridge>('Appearance');

/**
 * Make native UI follow the in-app theme PREFERENCE (not the effective theme):
 * 'system' clears the override so iOS goes back to following the device live.
 *
 * Side effect to know about: the override also drives `prefers-color-scheme`
 * inside the web view. That is harmless while the preference is explicit (the
 * theme store never consults it then) and on switching back to System the query
 * corrects itself a moment after the override clears — the store's own
 * matchMedia listener then re-applies.
 */
export async function setNativeAppearance(pref: 'light' | 'dark' | 'system'): Promise<void> {
	if (!isNative) return;
	try {
		await Appearance.setStyle({ style: pref });
	} catch {
		/* native shell without the plugin: native UI follows the system, as before */
	}
}
