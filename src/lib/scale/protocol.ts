// Acaia BLE protocol codec (clean-room, both scale generations).
//
// The modern "EF DD" protocol used by every Acaia scale since ~2017 — legacy
// GATT (Pearl, pre-2021 Lunar) and Pyxis-style GATT (Pyxis, Lunar 2021, new
// Pearls). Pure functions + a stateful frame reassembler; no BLE, no Svelte,
// so it's fully unit-testable without hardware. Reverse-engineered from
// pyacaia / aioacaia / LunarGateway / de1app (cross-checked, see research).

export const ACAIA_NAME_PREFIXES = ['ACAIA', 'LUNAR', 'PYXIS', 'PEARL', 'PROCH', 'CINCO'];

export function isAcaiaName(name: string | undefined | null): boolean {
	if (!name) return false;
	const p = name.slice(0, 5).toUpperCase();
	return ACAIA_NAME_PREFIXES.includes(p);
}

// GATT — pick the pair by which characteristics the peripheral actually
// exposes (never by name). 16-bit UUIDs are compared in their 128-bit form.
export const LEGACY = {
	service: '00001820-0000-1000-8000-00805f9b34fb',
	char: '00002a80-0000-1000-8000-00805f9b34fb' // rx + tx share this one
};
export const PYXIS = {
	service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
	write: '49535343-8841-43f4-a8d4-ecbe34729bb3',
	notify: '49535343-1e4d-4bd9-ba61-23c647249616'
};

export type Generation = 'legacy' | 'pyxis';

// ─── Framing ─────────────────────────────────────────────────────────────
const MAGIC1 = 0xef;
const MAGIC2 = 0xdd;

// Checksum: byte-sum of even-indexed payload bytes, then odd-indexed, each
// masked to a byte. Appended ck1 (even) then ck2 (odd).
export function checksum(payload: number[]): [number, number] {
	let even = 0;
	let odd = 0;
	for (let i = 0; i < payload.length; i++) {
		if (i % 2 === 0) even += payload[i];
		else odd += payload[i];
	}
	return [even & 0xff, odd & 0xff];
}

/** Frame a message: EF DD <type> <payload...> <ck1> <ck2>. */
export function encode(msgType: number, payload: number[]): Uint8Array {
	const [ck1, ck2] = checksum(payload);
	return Uint8Array.from([MAGIC1, MAGIC2, msgType, ...payload, ck1, ck2]);
}

// ─── Outgoing messages ───────────────────────────────────────────────────
const MSG = { heartbeat: 0x00, tare: 0x04, getSettings: 0x06, ident: 0x0b, config: 0x0c, timer: 0x0d };

// 15-byte client id — the digit string is accepted by both generations.
const IDENT_PAYLOAD = [...'012345678901234'].map((c) => c.charCodeAt(0));

export function encodeIdent(): Uint8Array {
	return encode(MSG.ident, IDENT_PAYLOAD);
}

// Event config: stream weight every event, battery/2, timer/5, key/3, setting/4.
export function encodeNotificationRequest(): Uint8Array {
	return encode(MSG.config, [0x09, 0x00, 0x01, 0x01, 0x02, 0x02, 0x05, 0x03, 0x04]);
}

export function encodeHeartbeat(): Uint8Array {
	return encode(MSG.heartbeat, [0x02, 0x00]);
}

export function encodeTare(): Uint8Array {
	return encode(MSG.tare, [0x00]);
}

export type TimerCommand = 'start' | 'stop' | 'reset';
export function encodeTimer(cmd: TimerCommand): Uint8Array {
	const arg = cmd === 'start' ? 0x00 : cmd === 'stop' ? 0x02 : 0x01;
	return encode(MSG.timer, [0x00, arg]);
}

export function encodeGetSettings(): Uint8Array {
	return encode(MSG.getSettings, new Array(16).fill(0x00));
}

// ─── Incoming: weight/timer/button/settings ──────────────────────────────
export interface WeightEvent {
	kind: 'weight';
	/** grams, signed, already scaled by the precision exponent */
	grams: number;
}
export interface TimerEvent {
	kind: 'timer';
	seconds: number;
}
export interface ButtonEvent {
	kind: 'button';
	action: 'tare' | 'start' | 'stop' | 'reset' | 'unknown';
}
export interface SettingsEvent {
	kind: 'settings';
	batteryPct: number;
	unit: 'g' | 'oz' | 'unknown';
}
export type AcaiaEvent = WeightEvent | TimerEvent | ButtonEvent | SettingsEvent;

// Weight magnitude is u24 LE over bytes 0..2 (superset of the u16 most
// sources read); byte 4 is a base-10 precision exponent; flags bit 1 = sign.
function parseWeight(p: number[]): WeightEvent | null {
	if (p.length < 6) return null;
	const magnitude = p[0] + (p[1] << 8) + (p[2] << 16);
	const exp = p[4];
	const divisor = exp >= 1 && exp <= 6 ? 10 ** exp : 1;
	let grams = magnitude / divisor;
	if (p[5] & 0x02) grams = -grams;
	return { kind: 'weight', grams };
}

function parseTimer(p: number[]): TimerEvent | null {
	if (p.length < 3) return null;
	return { kind: 'timer', seconds: p[0] * 60 + p[1] + p[2] / 10 };
}

function parseButton(p: number[]): ButtonEvent {
	const a = p[0];
	const b = p[1];
	let action: ButtonEvent['action'] = 'unknown';
	if (a === 0 && b === 5) action = 'tare';
	else if (a === 8) action = 'start';
	else if (a === 10) action = 'stop';
	else if (a === 9) action = 'reset';
	return { kind: 'button', action };
}

// A cmd 0x0C event message: byte after the length byte is the event type.
function parseEvent(msg: number[]): AcaiaEvent | null {
	const eventType = msg[4];
	const payload = msg.slice(5, msg.length - 2); // strip 2 checksum bytes
	switch (eventType) {
		case 5:
			return parseWeight(payload);
		case 7:
			return parseTimer(payload);
		case 8:
			return parseButton(payload);
		case 11: {
			// Heartbeat ack can carry an embedded weight (arg 5) or timer (arg 7).
			if (payload[2] === 5) return parseWeight(payload.slice(3));
			if (payload[2] === 7) return parseTimer(payload.slice(3));
			return null;
		}
		default:
			return null;
	}
}

function parseSettings(msg: number[]): SettingsEvent {
	// payload starts at offset 3 (len byte doubles as payload[0]).
	const p = msg.slice(3);
	const batteryPct = (p[1] ?? 0) & 0x7f;
	const unit = p[2] === 2 ? 'g' : p[2] === 5 ? 'oz' : 'unknown';
	return { kind: 'settings', batteryPct, unit };
}

/**
 * Stateful reassembler: Acaia notifications fragment (legacy) and coalesce
 * (Pyxis 247-MTU). Feed each notification's bytes; get back zero or more
 * fully-framed events. Keeps a persistent buffer across calls.
 */
export class AcaiaDecoder {
	private buf: number[] = [];

	feed(chunk: Uint8Array | number[]): AcaiaEvent[] {
		for (const b of chunk) this.buf.push(b);
		const out: AcaiaEvent[] = [];

		for (;;) {
			// Find the frame header, discarding any leading garbage.
			let start = -1;
			for (let i = 0; i + 1 < this.buf.length; i++) {
				if (this.buf[i] === MAGIC1 && this.buf[i + 1] === MAGIC2) {
					start = i;
					break;
				}
			}
			if (start === -1) {
				// No header; keep only a trailing lone MAGIC1 (could start a header).
				const tail = this.buf[this.buf.length - 1] === MAGIC1 ? [MAGIC1] : [];
				this.buf = tail;
				break;
			}
			if (start > 0) this.buf = this.buf.slice(start);

			// Need at least magic(2)+cmd(1)+len(1)+checksum(2) = 6 bytes.
			if (this.buf.length < 6) break;

			const len = this.buf[3];
			const msgEnd = 3 + len + 2; // len byte..end + 2 checksum bytes
			if (this.buf.length < msgEnd) break; // wait for more data

			const msg = this.buf.slice(0, msgEnd);
			this.buf = this.buf.slice(msgEnd);

			const cmd = msg[2];
			if (cmd === 0x0c) {
				const ev = parseEvent(msg);
				if (ev) out.push(ev);
			} else if (cmd === 0x08) {
				out.push(parseSettings(msg));
			}
			// cmd 0x07 (pre-auth chatter) and others: skip.
		}
		return out;
	}

	reset(): void {
		this.buf = [];
	}
}
