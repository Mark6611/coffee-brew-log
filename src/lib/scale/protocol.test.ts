import { describe, it, expect } from 'vitest';
import {
	checksum,
	encode,
	encodeIdent,
	encodeNotificationRequest,
	encodeHeartbeat,
	encodeTare,
	encodeTimer,
	encodeGetSettings,
	isAcaiaName,
	AcaiaDecoder,
	type WeightEvent,
	type TimerEvent,
	type ButtonEvent,
	type SettingsEvent
} from './protocol';

const hex = (u: Uint8Array) => [...u].map((b) => b.toString(16).padStart(2, '0')).join(' ');

describe('checksum', () => {
	it('matches the known ident vector (even→0x9a, odd→0x6d)', () => {
		const ident = [...'012345678901234'].map((c) => c.charCodeAt(0));
		expect(checksum(ident)).toEqual([0x9a, 0x6d]);
	});
	it('matches the known notification-request vector (0x15, 0x06)', () => {
		expect(checksum([0x09, 0x00, 0x01, 0x01, 0x02, 0x02, 0x05, 0x03, 0x04])).toEqual([0x15, 0x06]);
	});
	it('masks each running sum to a byte', () => {
		expect(checksum([0xff, 0x00, 0x02])).toEqual([0x01, 0x00]); // 0xff+0x02 = 0x101 → 0x01
	});
});

describe('encoders produce exact wire bytes', () => {
	it('ident', () => {
		expect(hex(encodeIdent())).toBe(
			'ef dd 0b 30 31 32 33 34 35 36 37 38 39 30 31 32 33 34 9a 6d'
		);
	});
	it('notification request', () => {
		expect(hex(encodeNotificationRequest())).toBe('ef dd 0c 09 00 01 01 02 02 05 03 04 15 06');
	});
	it('heartbeat', () => {
		expect(hex(encodeHeartbeat())).toBe('ef dd 00 02 00 02 00');
	});
	it('tare', () => {
		expect(hex(encodeTare())).toBe('ef dd 04 00 00 00');
	});
	it('timer start/stop/reset', () => {
		expect(hex(encodeTimer('start'))).toBe('ef dd 0d 00 00 00 00');
		expect(hex(encodeTimer('stop'))).toBe('ef dd 0d 00 02 00 02');
		expect(hex(encodeTimer('reset'))).toBe('ef dd 0d 00 01 00 01');
	});
	it('getSettings is 21 bytes', () => {
		expect(encodeGetSettings().length).toBe(21);
	});
});

describe('isAcaiaName', () => {
	it('matches every known prefix, case-insensitive', () => {
		for (const n of ['ACAIA123', 'LUNAR-abc', 'PYXIS-01', 'PEARL-x', 'PROCHBT001', 'CINCO 9', 'lunar-lower'])
			expect(isAcaiaName(n)).toBe(true);
	});
	it('rejects non-Acaia and empty', () => {
		expect(isAcaiaName('Felicita')).toBe(false);
		expect(isAcaiaName('')).toBe(false);
		expect(isAcaiaName(undefined)).toBe(false);
	});
});

// Build a cmd 0x0C event frame the way the scale would, via the (separately
// tested) encoder, then assert the decoder parses it back.
const weightFrame = (mag: number, exp: number, negative = false) =>
	encode(0x0c, [0x08, 0x05, mag & 0xff, (mag >> 8) & 0xff, (mag >> 16) & 0xff, 0x00, exp, negative ? 0x02 : 0x00]);
const timerFrame = (min: number, sec: number, tenths: number) =>
	encode(0x0c, [0x05, 0x07, min, sec, tenths]);
const buttonFrame = (a: number, b: number) => encode(0x0c, [0x04, 0x08, a, b]);

describe('AcaiaDecoder', () => {
	it('parses a positive weight (18.5 g at 0.1 g precision)', () => {
		const d = new AcaiaDecoder();
		const [ev] = d.feed(weightFrame(185, 1));
		expect(ev.kind).toBe('weight');
		expect((ev as WeightEvent).grams).toBeCloseTo(18.5);
	});
	it('applies the sign flag', () => {
		const d = new AcaiaDecoder();
		const [ev] = d.feed(weightFrame(30, 1, true));
		expect((ev as WeightEvent).grams).toBeCloseTo(-3.0);
	});
	it('honors the precision exponent (0.01 g)', () => {
		const d = new AcaiaDecoder();
		const [ev] = d.feed(weightFrame(1836, 2));
		expect((ev as WeightEvent).grams).toBeCloseTo(18.36);
	});
	it('parses a timer event', () => {
		const d = new AcaiaDecoder();
		const [ev] = d.feed(timerFrame(0, 27, 5));
		expect(ev.kind).toBe('timer');
		expect((ev as TimerEvent).seconds).toBeCloseTo(27.5);
	});
	it('parses button events', () => {
		const d = new AcaiaDecoder();
		expect((d.feed(buttonFrame(0, 5))[0] as ButtonEvent).action).toBe('tare');
		expect((d.feed(buttonFrame(8, 5))[0] as ButtonEvent).action).toBe('start');
		expect((d.feed(buttonFrame(10, 7))[0] as ButtonEvent).action).toBe('stop');
		expect((d.feed(buttonFrame(9, 7))[0] as ButtonEvent).action).toBe('reset');
	});
	it('parses a settings frame (battery masks bit 7, unit = grams)', () => {
		const d = new AcaiaDecoder();
		const frame = encode(0x08, [0x09, 0x80 | 63, 2, 0, 0, 0, 0, 0, 0]);
		const [ev] = d.feed(frame);
		expect(ev.kind).toBe('settings');
		expect((ev as SettingsEvent).batteryPct).toBe(63);
		expect((ev as SettingsEvent).unit).toBe('g');
	});

	it('reassembles a frame fragmented across two notifications', () => {
		const d = new AcaiaDecoder();
		const f = weightFrame(200, 1);
		expect(d.feed(f.slice(0, 3))).toEqual([]); // partial → nothing yet
		const evs = d.feed(f.slice(3));
		expect(evs).toHaveLength(1);
		expect((evs[0] as WeightEvent).grams).toBeCloseTo(20);
	});
	it('splits multiple frames coalesced into one notification (Pyxis MTU)', () => {
		const d = new AcaiaDecoder();
		const combined = Uint8Array.from([...weightFrame(100, 1), ...timerFrame(0, 5, 0)]);
		const evs = d.feed(combined);
		expect(evs.map((e) => e.kind)).toEqual(['weight', 'timer']);
		expect((evs[0] as WeightEvent).grams).toBeCloseTo(10);
	});
	it('discards leading garbage before the EF DD header', () => {
		const d = new AcaiaDecoder();
		const evs = d.feed(Uint8Array.from([0xaa, 0xbb, 0x07, ...weightFrame(50, 1)]));
		expect(evs).toHaveLength(1);
		expect((evs[0] as WeightEvent).grams).toBeCloseTo(5);
	});
	it('skips pre-auth cmd 0x07 chatter without erroring', () => {
		const d = new AcaiaDecoder();
		const chatter = encode(0x07, [0x02, 0x00, 0x00]);
		expect(d.feed(chatter)).toEqual([]);
	});
});
