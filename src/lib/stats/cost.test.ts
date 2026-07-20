import { describe, it, expect } from 'vitest';
import { costPerGram, brewCost, costSummary, costPerCupForBag } from './cost';
import type { Bag, Brew } from '$lib/db/types';

function bag(over: Partial<Bag> = {}): Bag {
	return {
		id: 'bag1',
		name: 'Test',
		roaster: 'R',
		weightGrams: 250,
		pricePaid: 500,
		roastLevel: 'medium',
		createdAt: '2026-01-01T00:00:00.000Z',
		...over
	} as Bag;
}

function brew(over: Partial<Brew> = {}): Brew {
	return {
		id: 'b1',
		method: 'espresso',
		bagId: 'bag1',
		doseGrams: 18,
		yieldGrams: 36,
		brewTimeSeconds: 28,
		grindSetting: '0.5.0',
		brewedAt: '2026-01-02T08:00:00.000Z',
		...over
	} as Brew;
}

describe('costPerGram', () => {
	it('divides price by weight', () => {
		expect(costPerGram(bag({ pricePaid: 500, weightGrams: 250 }))).toBe(2);
	});
	it('is null when price missing', () => {
		expect(costPerGram(bag({ pricePaid: undefined }))).toBeNull();
	});
	it('is null when weight missing', () => {
		expect(costPerGram(bag({ weightGrams: undefined }))).toBeNull();
	});
	it('is null when weight is zero (no divide-by-zero)', () => {
		expect(costPerGram(bag({ weightGrams: 0 }))).toBeNull();
	});
});

describe('brewCost', () => {
	it('multiplies dose by cost per gram', () => {
		const byId = new Map([['bag1', bag({ pricePaid: 500, weightGrams: 250 })]]);
		expect(brewCost(brew({ doseGrams: 18 }), byId)).toBe(36);
	});
	it('is null when the bag is unknown', () => {
		expect(brewCost(brew({ bagId: 'ghost' }), new Map())).toBeNull();
	});
	it('is null when the brew has no bag', () => {
		expect(brewCost(brew({ bagId: undefined }), new Map())).toBeNull();
	});
	it('is null when the bag lacks price', () => {
		const byId = new Map([['bag1', bag({ pricePaid: undefined })]]);
		expect(brewCost(brew(), byId)).toBeNull();
	});
});

describe('costSummary', () => {
	it('sums bean spend and averages resolvable cups', () => {
		const bags = [
			bag({ id: 'a', pricePaid: 500, weightGrams: 250 }),
			bag({ id: 'b', pricePaid: 300, weightGrams: 200 })
		];
		const brews = [
			brew({ id: '1', bagId: 'a', doseGrams: 18 }), // 2/g → 36
			brew({ id: '2', bagId: 'b', doseGrams: 20 }) // 1.5/g → 30
		];
		const s = costSummary(bags, brews);
		expect(s.totalBeanSpend).toBe(800);
		expect(s.totalBrewedValue).toBe(66);
		expect(s.cupsWithCost).toBe(2);
		expect(s.costPerCup).toBe(33);
	});
	it('ignores brews without resolvable cost in the average', () => {
		const bags = [bag({ id: 'a', pricePaid: 500, weightGrams: 250 })];
		const brews = [
			brew({ id: '1', bagId: 'a', doseGrams: 18 }), // 36
			brew({ id: '2', bagId: 'ghost', doseGrams: 18 }) // unresolved
		];
		const s = costSummary(bags, brews);
		expect(s.cupsWithCost).toBe(1);
		expect(s.costPerCup).toBe(36);
	});
	it('reports null cost per cup and still totals spend when no cups resolve', () => {
		const bags = [bag({ id: 'a', pricePaid: 400, weightGrams: undefined })];
		const s = costSummary(bags, [brew({ bagId: 'a' })]);
		expect(s.costPerCup).toBeNull();
		expect(s.totalBeanSpend).toBe(400);
	});
});

describe('costPerCupForBag', () => {
	it('averages the linked brews', () => {
		const b = bag({ id: 'a', pricePaid: 500, weightGrams: 250 });
		const brews = [
			brew({ id: '1', bagId: 'a', doseGrams: 18 }), // 36
			brew({ id: '2', bagId: 'a', doseGrams: 22 }), // 44
			brew({ id: '3', bagId: 'other', doseGrams: 18 })
		];
		expect(costPerCupForBag(b, brews)).toBe(40);
	});
	it('is null when the bag has no linked brews', () => {
		expect(costPerCupForBag(bag({ id: 'a' }), [brew({ bagId: 'other' })])).toBeNull();
	});
	it('is null when the bag has no price', () => {
		expect(
			costPerCupForBag(bag({ id: 'a', pricePaid: undefined }), [brew({ bagId: 'a' })])
		).toBeNull();
	});
});
