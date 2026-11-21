import { describe, it, expect } from 'vitest';
import {
	bagConsumption,
	bagsByRecentUse,
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

describe('bagsByRecentUse', () => {
	const names = (bags: { name: string }[]) => bags.map((b) => b.name);

	it('puts the bag brewed from most recently first, whenever it was added', () => {
		const old = bag({ name: 'old', createdAt: '2026-03-01T08:00:00.000Z' });
		const mid = bag({ name: 'mid', createdAt: '2026-04-01T08:00:00.000Z' });
		const fresh = bag({ name: 'fresh', createdAt: '2026-04-20T08:00:00.000Z' });
		const brews = [
			espresso({ bagId: fresh.id, brewedAt: '2026-04-21T08:00:00.000Z' }),
			espresso({ bagId: mid.id, brewedAt: '2026-04-25T08:00:00.000Z' }),
			espresso({ bagId: old.id, brewedAt: '2026-04-22T08:00:00.000Z' }),
			pourOver({ bagId: old.id, brewedAt: '2026-05-02T08:00:00.000Z' })
		];
		expect(names(bagsByRecentUse([fresh, mid, old], brews))).toEqual(['old', 'mid', 'fresh']);
	});

	it('counts a bag as used the day it was added', () => {
		const brewedYesterday = bag({ name: 'yesterday', createdAt: '2026-03-01T08:00:00.000Z' });
		const boughtToday = bag({ name: 'today', createdAt: '2026-05-02T07:00:00.000Z' });
		const neverOpened = bag({ name: 'shelf', createdAt: '2026-04-01T08:00:00.000Z' });
		const brews = [espresso({ bagId: brewedYesterday.id, brewedAt: '2026-05-01T08:00:00.000Z' })];
		expect(names(bagsByRecentUse([neverOpened, brewedYesterday, boughtToday], brews))).toEqual([
			'today',
			'yesterday',
			'shelf'
		]);
	});

	it('ignores brews with no bag, and brews of a bag that is not in the list', () => {
		const a = bag({ name: 'a', createdAt: '2026-04-02T08:00:00.000Z' });
		const b = bag({ name: 'b', createdAt: '2026-04-01T08:00:00.000Z' });
		const brews = [
			espresso({ brewedAt: '2026-05-09T08:00:00.000Z' }),
			espresso({ bagId: 'gone', brewedAt: '2026-05-09T08:00:00.000Z' })
		];
		expect(names(bagsByRecentUse([a, b], brews))).toEqual(['a', 'b']);
	});

	it('compares instants, not text: a timestamp without milliseconds is not later', () => {
		const whole = bag({ name: 'whole', createdAt: '2026-03-01T08:00:00.000Z' });
		const half = bag({ name: 'half', createdAt: '2026-03-01T08:00:00.000Z' });
		const brews = [
			espresso({ bagId: whole.id, brewedAt: '2026-05-02T08:00:00Z' }),
			espresso({ bagId: half.id, brewedAt: '2026-05-02T08:00:00.500Z' })
		];
		expect(names(bagsByRecentUse([whole, half], brews))).toEqual(['half', 'whole']);
	});

	it('keeps the incoming order on a tie, and leaves the list it was given alone', () => {
		const first = bag({ name: 'first' });
		const second = bag({ name: 'second' });
		const given = [first, second];
		expect(names(bagsByRecentUse(given, []))).toEqual(['first', 'second']);
		expect(bagsByRecentUse(given, [])).not.toBe(given);
		expect(names(given)).toEqual(['first', 'second']);
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
		expect(freshnessLabel('2026-05-14', new Date('2026-05-15T00:00:00'))).toBe('ROASTED YESTERDAY');
		expect(freshnessLabel('2026-05-10', new Date('2026-05-15T00:00:00'))).toBe(
			'ROASTED 5 DAYS AGO'
		);
		expect(freshnessLabel('2026-05-20', new Date('2026-05-15T00:00:00'))).toBe('NOT YET ROASTED');
	});
});
