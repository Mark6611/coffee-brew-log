import { describe, it, expect } from 'vitest';
import {
	filterByRange,
	avgRatio,
	avgRating,
	methodSplit,
	ratioBuckets,
	topRatedBrews,
	mostBrewedBag,
	peakHour
} from './compute';
import { bag, espresso, pourOver } from '$lib/test/factories';

describe('filterByRange', () => {
	const now = new Date('2026-05-08T08:00:00.000Z');
	const recent = pourOver({ brewedAt: '2026-05-01T08:00:00.000Z' });
	const old = pourOver({ brewedAt: '2026-01-01T08:00:00.000Z' });

	it('keeps everything for "all"', () => {
		expect(filterByRange([recent, old], 'all', now)).toHaveLength(2);
	});
	it('drops brews older than 12 weeks for "12w"', () => {
		const out = filterByRange([recent, old], '12w', now);
		expect(out).toEqual([recent]);
	});
	it('keeps the older brew within 6 months for "6m"', () => {
		expect(filterByRange([recent, old], '6m', now)).toHaveLength(2);
	});
});

describe('methodSplit', () => {
	it('computes counts and percentages', () => {
		const split = methodSplit([espresso(), espresso(), espresso(), pourOver()]);
		expect(split.espresso).toBe(3);
		expect(split.pourOver).toBe(1);
		expect(split.espressoPct).toBe(75);
		expect(split.pourOverPct).toBe(25);
	});
	it('does not divide by zero on an empty list', () => {
		const split = methodSplit([]);
		expect(split.espressoPct).toBe(0);
		expect(split.pourOverPct).toBe(0);
	});
});

describe('avgRatio / avgRating', () => {
	it('averages ratios across methods', () => {
		const brews = [
			pourOver({ doseGrams: 20, waterGrams: 320 }), // 16
			espresso({ doseGrams: 18, yieldGrams: 36 }) // 2
		];
		expect(avgRatio(brews)).toBe(9);
	});
	it('returns null ratio for an empty list', () => {
		expect(avgRatio([])).toBeNull();
	});
	it('averages only rated brews', () => {
		const brews = [pourOver({ rating: 4 }), pourOver({ rating: 5 }), pourOver()];
		expect(avgRating(brews)).toBe(4.5);
	});
	it('returns null rating when nothing is rated', () => {
		expect(avgRating([pourOver(), espresso()])).toBeNull();
	});
});

describe('ratioBuckets', () => {
	it('assigns each pour-over to its nearest ratio bucket', () => {
		const brews = [
			pourOver({ doseGrams: 20, waterGrams: 300 }), // 15.0 → index 2
			pourOver({ doseGrams: 20, waterGrams: 320 }) // 16.0 → index 4
		];
		const { counts, median } = ratioBuckets(brews);
		expect(counts[2]).toBe(1);
		expect(counts[4]).toBe(1);
		expect(median).toBe(15.5); // even count → mean of the two middles
	});
	it('ignores espresso brews and returns a null median when empty', () => {
		expect(ratioBuckets([espresso()]).median).toBeNull();
	});
	it('takes the middle value as median for an odd count', () => {
		const brews = [
			pourOver({ doseGrams: 20, waterGrams: 300 }), // 15
			pourOver({ doseGrams: 20, waterGrams: 320 }), // 16
			pourOver({ doseGrams: 20, waterGrams: 340 }) // 17
		];
		expect(ratioBuckets(brews).median).toBe(16);
	});
});

describe('topRatedBrews', () => {
	it('returns the highest-rated brews, excluding unrated, capped at n', () => {
		const brews = [
			pourOver({ rating: 5 }),
			pourOver({ rating: 3 }),
			pourOver({ rating: 4 }),
			pourOver() // unrated, excluded
		];
		const top = topRatedBrews(brews, 2);
		expect(top.map((b) => b.rating)).toEqual([5, 4]);
	});
});

describe('mostBrewedBag', () => {
	it('returns the bag with the most linked brews', () => {
		const a = bag({ name: 'Alpha' });
		const b = bag({ name: 'Beta' });
		const brews = [
			pourOver({ bagId: a.id }),
			pourOver({ bagId: a.id }),
			pourOver({ bagId: a.id }),
			pourOver({ bagId: b.id })
		];
		const result = mostBrewedBag(brews, [a, b]);
		expect(result.bag?.name).toBe('Alpha');
		expect(result.count).toBe(3);
	});
	it('returns null bag when there are no linked brews', () => {
		expect(mostBrewedBag([], [])).toEqual({ bag: null, count: 0 });
	});
});

describe('peakHour', () => {
	it('finds the hour with the highest count', () => {
		const byHour = new Array(24).fill(0);
		byHour[2] = 5;
		byHour[9] = 3;
		expect(peakHour(byHour)).toEqual({ hour: 2, count: 5 });
	});
	it('returns null when there is no activity', () => {
		expect(peakHour(new Array(24).fill(0))).toBeNull();
	});
});
