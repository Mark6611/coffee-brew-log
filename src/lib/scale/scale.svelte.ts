// Acaia scale driver — DISABLED for the 1.0 App Store submission.
//
// App Review holds any app that pairs with a physical accessory until a demo
// video of the hardware handshake is provided (Guideline 2.1). Rather than gate
// 1.0 on that, the BLE feature is out of this build entirely:
//   - @capacitor-community/bluetooth-le uninstalled (linking CoreBluetooth
//     without NSBluetoothAlwaysUsageDescription trips ITMS-90683 at upload)
//   - the Info.plist usage string removed
//   - this driver stubbed to a permanent 'unsupported'
//
// The pure codec + shot tracker (./protocol.ts, ./shot.ts + their 30 tests)
// are untouched — they are the hard part and stay ready. To bring the feature
// back for 1.1: `npm i @capacitor-community/bluetooth-le`, restore this file
// from git history (last full version: commit fe2a811), re-add the Info.plist
// usage string, and film the pairing for review.

export type ScaleStatus =
	| 'unsupported'
	| 'idle'
	| 'scanning'
	| 'connecting'
	| 'connected'
	| 'disconnected';

export const scale = $state<{
	status: ScaleStatus;
	deviceName: string | null;
	batteryPct: number | null;
	weightG: number | null;
	unit: 'g' | 'oz' | null;
	error: string | null;
}>({
	status: 'unsupported',
	deviceName: null,
	batteryPct: null,
	weightG: null,
	unit: null,
	error: null
});

type WeightListener = (grams: number, tMs: number) => void;
export function onWeight(_cb: WeightListener): () => void {
	return () => {};
}

type ButtonListener = (action: 'tare' | 'start' | 'stop' | 'reset') => void;
export function onScaleButton(_cb: ButtonListener): () => void {
	return () => {};
}

export async function connectScale(): Promise<void> {}
export async function disconnectScale(): Promise<void> {}
export async function tareScale(): Promise<void> {}
