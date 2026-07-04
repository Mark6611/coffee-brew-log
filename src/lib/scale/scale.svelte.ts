// Acaia scale driver + reactive store. Native-only (Web Bluetooth is absent on
// iOS Safari — the whole reason for the Capacitor shell). On the web build it
// reports `unsupported` and every action is a no-op, so the PWA degrades
// gracefully. Uses @capacitor-community/bluetooth-le; protocol/parsing live in
// ./protocol (pure + unit-tested). Cannot be unit-tested here — verified on
// device. Lifecycle mirrors Beanconqueror: scan→connect→detect generation→
// subscribe→ident→config→heartbeat, with a watchdog re-ident on silence.

import { Capacitor } from '@capacitor/core';
import {
	AcaiaDecoder,
	isAcaiaName,
	LEGACY,
	PYXIS,
	encodeIdent,
	encodeNotificationRequest,
	encodeHeartbeat,
	encodeTare,
	type Generation
} from './protocol';

export type ScaleStatus =
	| 'unsupported'
	| 'idle'
	| 'scanning'
	| 'connecting'
	| 'connected'
	| 'disconnected';

const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
const DEVICE_KEY = 'brewlog-scale-id';

export const scale = $state<{
	status: ScaleStatus;
	deviceName: string | null;
	batteryPct: number | null;
	weightG: number | null;
	unit: 'g' | 'oz' | null;
	error: string | null;
}>({
	status: isNative ? 'idle' : 'unsupported',
	deviceName: null,
	batteryPct: null,
	weightG: null,
	unit: null,
	error: null
});

// Weight subscribers (the brew form feeds these into a ShotTracker).
type WeightListener = (grams: number, tMs: number) => void;
const weightListeners = new Set<WeightListener>();
export function onWeight(cb: WeightListener): () => void {
	weightListeners.add(cb);
	return () => weightListeners.delete(cb);
}

// Physical scale-button subscribers (tare/timer buttons on the scale).
type ButtonListener = (action: 'tare' | 'start' | 'stop' | 'reset') => void;
const buttonListeners = new Set<ButtonListener>();
export function onScaleButton(cb: ButtonListener): () => void {
	buttonListeners.add(cb);
	return () => buttonListeners.delete(cb);
}

let deviceId: string | null = null;
let generation: Generation = 'legacy';
let decoder = new AcaiaDecoder();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastNotificationAt = 0;
let writeQueue: Promise<void> = Promise.resolve();

function svc() {
	return generation === 'pyxis' ? PYXIS.service : LEGACY.service;
}
function writeChar() {
	return generation === 'pyxis' ? PYXIS.write : LEGACY.char;
}
function notifyChar() {
	return generation === 'pyxis' ? PYXIS.notify : LEGACY.char;
}

// Serialize writes with a small gap — the scale drops packets sent back-to-back.
async function send(bytes: Uint8Array): Promise<void> {
	if (!deviceId) return;
	const { BleClient, numbersToDataView } = await import('@capacitor-community/bluetooth-le');
	writeQueue = writeQueue
		.then(async () => {
			await BleClient.writeWithoutResponse(deviceId!, svc(), writeChar(), numbersToDataView([...bytes]));
			await new Promise((r) => setTimeout(r, 60));
		})
		.catch(() => {});
	return writeQueue;
}

async function handshake(): Promise<void> {
	await new Promise((r) => setTimeout(r, 150)); // let the first weight settle
	await send(encodeIdent());
	await new Promise((r) => setTimeout(r, 100));
	await send(encodeNotificationRequest());
}

function startHeartbeat(): void {
	stopTimers();
	// ≤ 2.75 s or the scale disconnects; 2 s with a re-ident on Pyxis.
	heartbeatTimer = setInterval(() => {
		if (generation === 'pyxis') void send(encodeIdent());
		void send(encodeHeartbeat());
	}, 2000);
	// If notifications stop for two beats, re-run the ident sequence.
	watchdogTimer = setInterval(() => {
		if (Date.now() - lastNotificationAt > 4000) void handshake();
	}, 4000);
}

function stopTimers(): void {
	if (heartbeatTimer) clearInterval(heartbeatTimer);
	if (watchdogTimer) clearInterval(watchdogTimer);
	heartbeatTimer = watchdogTimer = null;
}

function onNotification(bytes: number[]): void {
	lastNotificationAt = Date.now();
	for (const ev of decoder.feed(bytes)) {
		if (ev.kind === 'weight') {
			scale.weightG = ev.grams;
			const t = Date.now();
			for (const l of weightListeners) l(ev.grams, t);
		} else if (ev.kind === 'settings') {
			scale.batteryPct = ev.batteryPct;
			if (ev.unit !== 'unknown') scale.unit = ev.unit;
		} else if (ev.kind === 'button') {
			if (ev.action !== 'unknown') for (const l of buttonListeners) l(ev.action);
		}
	}
}

async function detectGeneration(id: string): Promise<Generation> {
	const { BleClient } = await import('@capacitor-community/bluetooth-le');
	try {
		const services = await BleClient.getServices(id);
		const hasPyxis = services.some(
			(s) => s.uuid.toLowerCase() === PYXIS.service && s.characteristics.some((c) => c.uuid.toLowerCase() === PYXIS.write)
		);
		return hasPyxis ? 'pyxis' : 'legacy';
	} catch {
		return 'legacy';
	}
}

/** Scan for an Acaia, connect, and start the live weight stream. */
export async function connectScale(): Promise<void> {
	if (!isNative) {
		scale.status = 'unsupported';
		return;
	}
	const { BleClient } = await import('@capacitor-community/bluetooth-le');
	scale.error = null;
	try {
		await BleClient.initialize({ androidNeverForLocation: true });
		scale.status = 'scanning';

		// Scan and pick the first Acaia by advertised name (iOS needs a fresh
		// discovery before it can connect by id).
		const found = await new Promise<string | null>((resolve) => {
			let done = false;
			const finish = (id: string | null) => {
				if (done) return;
				done = true;
				void BleClient.stopLEScan().catch(() => {});
				resolve(id);
			};
			void BleClient.requestLEScan({ allowDuplicates: false }, (r) => {
				const name = r.device?.name ?? r.localName;
				// Single-scale user: connect to the first Acaia the scan reports.
				if (isAcaiaName(name)) {
					scale.deviceName = name ?? 'Acaia';
					finish(r.device.deviceId);
				}
			}).catch(() => finish(null));
			setTimeout(() => finish(null), 15000); // 15 s scan timeout
		});

		if (!found) {
			scale.status = 'idle';
			scale.error = 'No Acaia scale found. Make sure it is awake and nearby.';
			return;
		}

		deviceId = found;
		localStorage.setItem(DEVICE_KEY, found);
		scale.status = 'connecting';

		await BleClient.connect(found, () => {
			// disconnect callback
			stopTimers();
			scale.status = 'disconnected';
			scale.weightG = null;
		});

		generation = await detectGeneration(found);
		decoder = new AcaiaDecoder();
		lastNotificationAt = Date.now();

		const { dataViewToNumbers } = await import('@capacitor-community/bluetooth-le');
		await BleClient.startNotifications(found, svc(), notifyChar(), (value) => {
			onNotification(dataViewToNumbers(value));
		});

		await handshake();
		startHeartbeat();
		scale.status = 'connected';
	} catch (e) {
		scale.status = 'idle';
		scale.error = e instanceof Error ? e.message : 'Could not connect to the scale.';
	}
}

export async function disconnectScale(): Promise<void> {
	stopTimers();
	if (isNative && deviceId) {
		const { BleClient } = await import('@capacitor-community/bluetooth-le');
		await BleClient.disconnect(deviceId).catch(() => {});
	}
	deviceId = null;
	scale.status = isNative ? 'idle' : 'unsupported';
	scale.weightG = null;
}

export async function tareScale(): Promise<void> {
	if (scale.status === 'connected') await send(encodeTare());
}
