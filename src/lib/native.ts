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

// ─── iCloud sync bridge (CloudSyncPlugin.swift, registered in ViewController) ──
// Ported from sibling Buffy: the native side moves opaque {id, updatedAt, json}
// records in/out of CloudKit's private database; all merge logic lives in JS
// ($lib/cloudSync). registerPlugin is safe to call on web — every wrapper
// no-ops before touching it.
import { registerPlugin } from '@capacitor/core';

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
