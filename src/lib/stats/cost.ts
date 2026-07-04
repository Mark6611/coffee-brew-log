import type { Bag, Brew } from '$lib/db/types';

// Cost analytics — pure, read-time. Every figure derives from data already
// stored (bag.pricePaid, bag.weightGrams, brew.doseGrams); nothing is
// persisted. Currency is whatever the owner paid in — figures are unitless.

/** A bag's cost per gram of coffee, or null if price/weight aren't both set. */
export function costPerGram(bag: Bag): number | null {
	if (bag.pricePaid == null || bag.weightGrams == null || bag.weightGrams <= 0) return null;
	return bag.pricePaid / bag.weightGrams;
}

/** What a single brew's dose cost, resolving the bag by id. Null if unknown. */
export function brewCost(brew: Brew, bagsById: Map<string, Bag>): number | null {
	if (!brew.bagId) return null;
	const bag = bagsById.get(brew.bagId);
	if (!bag) return null;
	const cpg = costPerGram(bag);
	if (cpg == null) return null;
	return cpg * brew.doseGrams;
}

export interface CostSummary {
	/** Sum of every bag's purchase price (money out the door). */
	totalBeanSpend: number;
	/** Average cost of a brew, over brews whose cost is resolvable. */
	costPerCup: number | null;
	/** How many of the given brews had a resolvable cost. */
	cupsWithCost: number;
	/** Total value of coffee actually brewed (sum of resolvable brew costs). */
	totalBrewedValue: number;
}

export function costSummary(bags: Bag[], brews: Brew[]): CostSummary {
	const byId = new Map(bags.map((b) => [b.id, b]));
	const totalBeanSpend = bags.reduce((s, b) => s + (b.pricePaid ?? 0), 0);
	let sum = 0;
	let n = 0;
	for (const brew of brews) {
		const c = brewCost(brew, byId);
		if (c != null) {
			sum += c;
			n++;
		}
	}
	return {
		totalBeanSpend,
		costPerCup: n > 0 ? sum / n : null,
		cupsWithCost: n,
		totalBrewedValue: sum
	};
}

/** Average per-cup cost for one bag (null if price/weight unset or no brews). */
export function costPerCupForBag(bag: Bag, brews: Brew[]): number | null {
	const cpg = costPerGram(bag);
	if (cpg == null) return null;
	const linked = brews.filter((b) => b.bagId === bag.id);
	if (linked.length === 0) return null;
	const total = linked.reduce((s, b) => s + cpg * b.doseGrams, 0);
	return total / linked.length;
}
