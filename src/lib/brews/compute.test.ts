import { describe, it, expect } from 'vitest';
import { ratio, formatRatio, formatBrewTime, weekStats, groupBrewsByDay } from './compute';
import { espresso, pourOver } from '$lib/test/factories';

describe('ratio', () => {
	it('uses yield/dose for espresso', () => {
		expect(ratio(espresso({ doseGrams: 18, yieldGrams: 36 }))).toBe(2);
	});
	it('uses water/dose for pour-over', () => {
		expect(ratio(pourOver({ doseGrams: 20, waterGrams: 320 }))).toBe(16);
	});
});

describe('formatRatio', () => {
	it('formats to one decimal with a 1: prefix', () => {
		expect(formatRatio(pourOver({ doseGrams: 20, waterGrams: 320 }))).toBe('1:16.0');
		expect(formatRatio(espresso({ doseGrams: 18, yieldGrams: 27 }))).toBe('1:1.5');
	});
});

describe('formatBrewTime', () => {
	it('formats pour-over seconds as m:ss with zero-padding', () => {
		expect(formatBrewTime(pourOver({ brewTimeSeconds: 210 }))).toBe('3:30');
		expect(formatBrewTime(pourOver({ brewTimeSeconds: 125 }))).toBe('2:05');
	});
	it('formats espresso as raw seconds', () => {
		expect(formatBrewTime(espresso({ brewTimeSeconds: 28 }))).toBe('28s');
	});
});

describe('weekStats', () => {
	const now = new Date('2026-05-08T08:00:00.000Z');

	it('counts only brews within the last 7 days', () => {
		const brews = [
			pourOver({ brewedAt: '2026-05-05T08:00:00.000Z' }), // in window
			espresso({ brewedAt: '2026-05-02T08:00:00.000Z' }), // in window
			pourOver({ brewedAt: '2026-04-20T08:00:00.000Z' }) // out of window
		];
		expect(weekStats(brews, now).count).toBe(2);
	});

	it('averages the ratio across in-window brews', () => {
		const brews = [
			pourOver({ doseGrams: 20, waterGrams: 320, brewedAt: '2026-05-05T08:00:00.000Z' }), // 16
			espresso({ doseGrams: 18, yieldGrams: 36, brewedAt: '2026-05-06T08:00:00.000Z' }) // 2
		];
		expect(weekStats(brews, now).avgRatio).toBe('1:9.0');
	});

	it('counts favorites in-window only', () => {
		const brews = [
			pourOver({ isFavorite: true, brewedAt: '2026-05-05T08:00:00.000Z' }),
			pourOver({ isFavorite: true, brewedAt: '2026-04-01T08:00:00.000Z' })
		];
		expect(weekStats(brews, now).favoritesCount).toBe(1);
	});

	it('returns a null avgRatio and zero counts for an empty list', () => {
		expect(weekStats([], now)).toEqual({ count: 0, avgRatio: null, favoritesCount: 0 });
	});
});

describe('groupBrewsByDay', () => {
	const now = new Date('2026-05-08T12:00:00.000Z');

	it('buckets brews sharing a day into one group', () => {
		const brews = [
			pourOver({ brewedAt: '2026-05-08T12:00:00.000Z' }),
			espresso({ brewedAt: '2026-05-08T12:00:00.000Z' })
		];
		const groups = groupBrewsByDay(brews, now);
		expect(groups).toHaveLength(1);
		expect(groups[0].brews).toHaveLength(2);
	});

	it('separates brews on different days into different groups', () => {
		const brews = [
			pourOver({ brewedAt: '2026-05-08T12:00:00.000Z' }),
			pourOver({ brewedAt: '2026-04-20T12:00:00.000Z' })
		];
		expect(groupBrewsByDay(brews, now)).toHaveLength(2);
	});

	it('labels a brew at "now" with a TODAY key', () => {
		const groups = groupBrewsByDay([pourOver({ brewedAt: now.toISOString() })], now);
		expect(groups[0].dayKey).toContain('TODAY');
	});
});
