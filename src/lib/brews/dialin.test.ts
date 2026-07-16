import { describe, it, expect } from 'vitest';
import { parseLagom, formatLagom, addTicks, inWindow, readyToDial, ROAST_TARGETS, TIME_RAIL } from './dialin';
import { espresso } from '$lib/test/factories';
import type { EspressoBrew } from '$lib/db/types';

// The 9-case matrix (resolveNextShot) was superseded by the Brew Compass —
// its behavior is pinned in compass.test.ts. What remains here: Lagom tick
// arithmetic, the roast-target constants, and the dial-declaration helpers.

const shot = (over: Partial<EspressoBrew> = {}) =>
	espresso({ grindSetting: '0.6.2', doseGrams: 18, yieldGrams: 36, ...over });

describe('Lagom tick arithmetic', () => {
	it('parses rotation.number.tick to total ticks', () => {
		expect(parseLagom('0.6.2')).toBe(62);
		expect(parseLagom('2.4.0')).toBe(240);
	});
	it('rejects non-Lagom strings', () => {
		expect(parseLagom('6')).toBeNull();
		expect(parseLagom('4.2')).toBeNull();
		expect(parseLagom('coarse-ish')).toBeNull();
	});
	it('borrows across the 10-tick boundary going finer', () => {
		expect(addTicks('0.6.2', -4)).toBe('0.5.8');
	});
	it('carries across the 10-tick boundary going coarser', () => {
		expect(addTicks('0.6.8', +4)).toBe('0.7.2');
	});
	it('borrows across the rotation boundary', () => {
		expect(addTicks('1.0.2', -4)).toBe('0.9.8');
	});
	it('floors at 0.0.0', () => {
		expect(addTicks('0.0.2', -5)).toBe('0.0.0');
	});
	it('returns null for an unparseable grind', () => {
		expect(addTicks('espresso-range', -4)).toBeNull();
	});
	it('round-trips format/parse', () => {
		expect(formatLagom(parseLagom('3.7.9')!)).toBe('3.7.9');
	});
});

describe('inWindow / readyToDial', () => {
	it('inWindow respects the roast window and null-roast', () => {
		expect(inWindow(shot({ brewTimeSeconds: 27 }), 'medium')).toBe(true);
		expect(inWindow(shot({ brewTimeSeconds: 22 }), 'medium')).toBe(false);
		expect(inWindow(shot({ brewTimeSeconds: 27 }), undefined)).toBeNull();
	});
	it('readyToDial: last two balanced → true (taste is the arbiter — no time gate)', () => {
		const shots = [
			shot({ brewTimeSeconds: 22, extraction: 'sour' }),
			shot({ brewTimeSeconds: 37, extraction: 'balanced' }), // outside any window — still counts
			shot({ brewTimeSeconds: 28, extraction: 'balanced' })
		];
		expect(readyToDial(shots)).toBe(true);
	});
	it('readyToDial: a sour shot in the last two → false', () => {
		const shots = [
			shot({ brewTimeSeconds: 27, extraction: 'balanced' }),
			shot({ brewTimeSeconds: 27, extraction: 'sour' })
		];
		expect(readyToDial(shots)).toBe(false);
	});
	it('readyToDial: works without a roast level', () => {
		const shots = [
			shot({ brewTimeSeconds: 27, extraction: 'balanced' }),
			shot({ brewTimeSeconds: 27, extraction: 'balanced' })
		];
		expect(readyToDial(shots, undefined)).toBe(true);
	});
	it('readyToDial: fewer than 2 shots → false', () => {
		expect(readyToDial([shot({ extraction: 'balanced' })])).toBe(false);
		expect(readyToDial([])).toBe(false);
	});
});

describe('ROAST_TARGETS sanity', () => {
	it('all four roast levels have coherent windows inside the rail', () => {
		for (const t of Object.values(ROAST_TARGETS)) {
			expect(t.time[0]).toBeGreaterThanOrEqual(TIME_RAIL[0]);
			expect(t.time[1]).toBeLessThanOrEqual(TIME_RAIL[1]);
			expect(t.time[0]).toBeLessThan(t.time[1]);
		}
	});
	it('ratio bands are coherent and ordered dark < medium < light', () => {
		for (const t of Object.values(ROAST_TARGETS)) {
			expect(t.ratioBand[0]).toBeLessThan(t.ratioBand[1]);
		}
		expect(ROAST_TARGETS.dark.ratioBand[1]).toBeLessThanOrEqual(ROAST_TARGETS.medium.ratioBand[1]);
		expect(ROAST_TARGETS.medium.ratioBand[1]).toBeLessThanOrEqual(ROAST_TARGETS.light.ratioBand[1]);
	});
});
