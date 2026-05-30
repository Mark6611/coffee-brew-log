import { describe, it, expect } from 'vitest';
import {
	bagConsumption,
	daysSinceRoast,
	freshnessTone,
	freshnessLabel,
	freshnessStale
} from './compute';
import { bag, espresso, pourOver } from '$lib/test/factories';

describe('bagConsumption', () => {
	it('sums doses of linked brews and derives remaining + percent', () => {
		const theBag = bag({ weightGrams: 250 });
		const brews = [
			espresso({ bagId: theBag.id, doseGrams: 18, brewedAt: '2026-05-03T08:00:00.000Z' }),
			pourOver({ bagId: theBag.id, doseGrams: 20, brewedAt: '2026-05-05T08:00:00.000Z' }),
			pourOver({ bagId: 'unlinked', doseGrams: 99 })
		];
		const c = bagConsumption(theBag, brews);
		expect(c.used).toBe(38);
		expect(c.remaining).toBe(212);
		expect(c.percentUsed).toBeCloseTo(15.2);
		expect(c.brewCount).toBe(2);
		expect(c.lastBrewedAt).toBe('2026-05-05T08:00:00.000Z');
	});

	it('returns null remaining/percent when the bag has no weight', () => {
		const noWeight = bag({ weightGrams: undefined });
		const c = bagConsumption(noWeight, [espresso({ bagId: noWeight.id, doseGrams: 18 })]);
		expect(c.used).toBe(18);
		expect(c.remaining).toBeNull();
		expect(c.percentUsed).toBeNull();
	});

	it('handles a bag with no linked brews', () => {
		const c = bagConsumption(bag({ weightGrams: 250 }), []);
		expect(c.used).toBe(0);
		expect(c.remaining).toBe(250);
		expect(c.brewCount).toBe(0);
		expect(c.lastBrewedAt).toBeNull();
	});
});

describe('daysSinceRoast', () => {
	it('counts whole days between the roast date and now', () => {
		// Both constructed as local midnight, so the offset cancels regardless of TZ.
		const now = new Date('2026-05-15T00:00:00');
		expect(daysSinceRoast('2026-05-01', now)).toBe(14);
	});
	it('returns null when no roast date is given', () => {
		expect(daysSinceRoast(undefined)).toBeNull();
	});
	it('is negative for a future roast date', () => {
		expect(daysSinceRoast('2026-05-20', new Date('2026-05-15T00:00:00'))).toBe(-5);
	});
});

describe('freshnessTone', () => {
	it('is success through 14 days, warning through 21, danger after', () => {
		expect(freshnessTone('2026-05-01', new Date('2026-05-15T00:00:00'))).toBe(
			'var(--color-success)'
		); // 14d
		expect(freshnessTone('2026-05-01', new Date('2026-05-22T00:00:00'))).toBe(
			'var(--color-warning)'
		); // 21d
		expect(freshnessTone('2026-05-01', new Date('2026-05-23T00:00:00'))).toBe(
			'var(--color-danger)'
		); // 22d
	});
	it('returns null without a roast date', () => {
		expect(freshnessTone(undefined)).toBeNull();
	});
});

describe('freshnessStale', () => {
	it('is true only past the 21-day careful window', () => {
		expect(freshnessStale('2026-05-01', new Date('2026-05-22T00:00:00'))).toBe(false); // 21d
		expect(freshnessStale('2026-05-01', new Date('2026-05-23T00:00:00'))).toBe(true); // 22d
	});
	it('is false without a roast date', () => {
		expect(freshnessStale(undefined)).toBe(false);
	});
});

describe('freshnessLabel', () => {
	it('uses friendly labels at the day boundaries', () => {
		expect(freshnessLabel('2026-05-15', new Date('2026-05-15T00:00:00'))).toBe('ROASTED TODAY');
		expect(freshnessLabel('2026-05-14', new Date('2026-05-15T00:00:00'))).toBe(
			'ROASTED YESTERDAY'
		);
		expect(freshnessLabel('2026-05-10', new Date('2026-05-15T00:00:00'))).toBe(
			'ROASTED 5 DAYS AGO'
		);
		expect(freshnessLabel('2026-05-20', new Date('2026-05-15T00:00:00'))).toBe('NOT YET ROASTED');
	});
});
