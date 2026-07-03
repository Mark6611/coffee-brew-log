import { describe, it, expect } from 'vitest';
import {
	parseLagom,
	formatLagom,
	addTicks,
	resolveNextShot,
	inWindow,
	readyToDial,
	ROAST_TARGETS
} from './dialin';
import { bag, espresso } from '$lib/test/factories';
import type { EspressoBrew } from '$lib/db/types';

// Medium roast window is [25, 30] — the matrix tests pivot on it.
const mediumBag = () => bag({ roastLevel: 'medium' });
const shot = (over: Partial<EspressoBrew> = {}) =>
	espresso({ grindSetting: '0.6.2', doseGrams: 18, yieldGrams: 36, ...over });

describe('Lagom tick arithmetic', () => {
	it('parses rotation.number.tick to total ticks', () => {
		expect(parseLagom('0.6.2')).toBe(62);
		expect(parseLagom('1.0.0')).toBe(100);
		expect(parseLagom('Lagom 0.3.8')).toBe(38); // tolerant of a prefix
	});
	it('rejects non-Lagom strings', () => {
		expect(parseLagom('4.2')).toBeNull(); // Ode-style two-part
		expect(parseLagom('fine')).toBeNull();
		expect(parseLagom('')).toBeNull();
		expect(parseLagom(undefined)).toBeNull();
	});
	it('borrows across the 10-tick boundary going finer', () => {
		expect(addTicks('0.6.2', -4)).toBe('0.5.8');
	});
	it('carries across the 10-tick boundary going coarser', () => {
		expect(addTicks('0.5.8', +4)).toBe('0.6.2');
	});
	it('borrows across the rotation boundary', () => {
		expect(addTicks('1.0.2', -4)).toBe('0.9.8');
	});
	it('floors at 0.0.0', () => {
		expect(addTicks('0.0.2', -4)).toBe('0.0.0');
	});
	it('returns null for an unparseable grind', () => {
		expect(addTicks('fine', -4)).toBeNull();
	});
	it('round-trips format/parse', () => {
		expect(formatLagom(parseLagom('0.7.0')!)).toBe('0.7.0');
	});
});

describe('resolveNextShot — the 9-case matrix (medium window 25–30s)', () => {
	const b = mediumBag();

	it('1: fast + sour → −4 finer', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 22, extraction: 'sour' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -4, direction: 'finer', target: '0.5.8' });
	});
	it('2: slow + bitter → +4 coarser', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 33, extraction: 'bitter' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: 4, direction: 'coarser', target: '0.6.6' });
	});
	it('3: fast + bitter → −2 (small step, mixed signals)', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 22, extraction: 'bitter' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -2, target: '0.6.0' });
	});
	it('4: slow + sour → +2, prose mentions temp', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 33, extraction: 'sour' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: 2, target: '0.6.4' });
		expect(r?.kind === 'move' && r.prose).toContain('temp');
	});
	it('5: fast, no taste → −3', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 22 }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -3, target: '0.5.9' });
	});
	it('6: slow, no taste → +3', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 33 }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: 3, target: '0.6.5' });
	});
	it('7: in window + sour → −2, prose mentions temp lever', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 27, extraction: 'sour' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -2, target: '0.6.0' });
	});
	it('8: in window + bitter → +2', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 27, extraction: 'bitter' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: 2, target: '0.6.4' });
	});
	it('9: in window + balanced → hold', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 27, extraction: 'balanced' }), b);
		expect(r?.kind).toBe('hold');
	});
	it('in window, no taste → silent (null)', () => {
		expect(resolveNextShot(shot({ brewTimeSeconds: 27 }), b)).toBeNull();
	});
	it('matrix ordering: fast + balanced falls to the plain-fast rule (−3)', () => {
		const r = resolveNextShot(shot({ brewTimeSeconds: 22, extraction: 'balanced' }), b);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -3 });
	});
	it('no roast level → silent (null)', () => {
		expect(resolveNextShot(shot({ brewTimeSeconds: 22, extraction: 'sour' }), bag({}))).toBeNull();
	});
	it('unparseable grind still moves, with null target', () => {
		const r = resolveNextShot(
			shot({ brewTimeSeconds: 22, extraction: 'sour', grindSetting: 'fine' }),
			b
		);
		expect(r).toMatchObject({ kind: 'move', deltaTicks: -4, target: null });
	});
	it('window boundaries are inclusive (25s and 30s are in-window)', () => {
		expect(resolveNextShot(shot({ brewTimeSeconds: 25 }), b)).toBeNull();
		expect(resolveNextShot(shot({ brewTimeSeconds: 30 }), b)).toBeNull();
	});
});

describe('inWindow / readyToDial', () => {
	it('inWindow respects the roast window and null-roast', () => {
		expect(inWindow(shot({ brewTimeSeconds: 27 }), 'medium')).toBe(true);
		expect(inWindow(shot({ brewTimeSeconds: 22 }), 'medium')).toBe(false);
		expect(inWindow(shot({ brewTimeSeconds: 27 }), undefined)).toBeNull();
	});
	it('readyToDial: last two in-window AND balanced → true', () => {
		const shots = [
			shot({ brewTimeSeconds: 22, extraction: 'sour' }),
			shot({ brewTimeSeconds: 27, extraction: 'balanced' }),
			shot({ brewTimeSeconds: 28, extraction: 'balanced' })
		];
		expect(readyToDial(shots, 'medium')).toBe(true);
	});
	it('readyToDial: a sour shot in the last two → false', () => {
		const shots = [
			shot({ brewTimeSeconds: 27, extraction: 'balanced' }),
			shot({ brewTimeSeconds: 27, extraction: 'sour' })
		];
		expect(readyToDial(shots, 'medium')).toBe(false);
	});
	it('readyToDial: fewer than 2 shots or no roast → false', () => {
		expect(readyToDial([shot({ brewTimeSeconds: 27, extraction: 'balanced' })], 'medium')).toBe(false);
		expect(readyToDial([], 'medium')).toBe(false);
		expect(
			readyToDial(
				[
					shot({ brewTimeSeconds: 27, extraction: 'balanced' }),
					shot({ brewTimeSeconds: 27, extraction: 'balanced' })
				],
				undefined
			)
		).toBe(false);
	});
});

describe('ROAST_TARGETS sanity', () => {
	it('all four roast levels have windows inside the 18–36s rail', () => {
		for (const t of Object.values(ROAST_TARGETS)) {
			expect(t.time[0]).toBeGreaterThanOrEqual(18);
			expect(t.time[1]).toBeLessThanOrEqual(36);
			expect(t.time[0]).toBeLessThan(t.time[1]);
		}
	});
});
