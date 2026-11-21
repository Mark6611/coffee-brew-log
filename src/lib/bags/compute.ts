import type { Bag, Brew } from '$lib/db/types';

export interface BagConsumption {
	used: number;
	remaining: number | null;
	percentUsed: number | null;
	brewCount: number;
	lastBrewedAt: string | null;
}

export function bagConsumption(bag: Bag, brews: Brew[]): BagConsumption {
	const linked = brews.filter((b) => b.bagId === bag.id);
	const used = linked.reduce((sum, b) => sum + b.doseGrams, 0);
	const remaining = bag.weightGrams != null ? bag.weightGrams - used : null;
	const percentUsed = bag.weightGrams != null ? (used / bag.weightGrams) * 100 : null;
	const lastBrewedAt =
		linked.length === 0
			? null
			: linked.reduce(
					(latest, b) => (latest && latest > b.brewedAt ? latest : b.brewedAt),
					null as string | null
				);
	return { used, remaining, percentUsed, brewCount: linked.length, lastBrewedAt };
}

/** Bags in the order you reach for them: the one brewed from most recently
 *  first. A bag also counts as used the day it was added, so one bought today
 *  sits above the bag last brewed yesterday instead of sinking below every bag
 *  that has a brew. Ties keep the order they arrived in. Worked out at read
 *  time from the brews — nothing stores a "last used" date. */
export function bagsByRecentUse(bags: Bag[], brews: Brew[]): Bag[] {
	const lastBrew = new Map<string, number>();
	for (const b of brews) {
		if (!b.bagId) continue;
		// Compared as instants, not strings: "…08:00:00Z" sorts AFTER
		// "…08:00:00.500Z" as text, and both shapes pass the schema.
		const at = Date.parse(b.brewedAt);
		if (at > (lastBrew.get(b.bagId) ?? -Infinity)) lastBrew.set(b.bagId, at);
	}
	const usedAt = (bag: Bag) =>
		Math.max(lastBrew.get(bag.id) ?? -Infinity, Date.parse(bag.createdAt) || 0);
	return bags
		.map((bag) => ({ bag, at: usedAt(bag) }))
		.sort((a, b) => b.at - a.at)
		.map((x) => x.bag);
}

export function formatRoastedAt(iso: string | undefined, now: Date = new Date()): string {
	// Derive the day count from daysSinceRoast (floor) so this label, freshnessLabel,
	// and freshnessStale all agree — rounding here made the list read "22 days ago"
	// while the detail page said "21" and never flagged stale, at the same moment.
	const days = daysSinceRoast(iso, now);
	if (days == null) return '';
	const date = new Date(iso + 'T00:00:00');
	if (days < 0)
		return 'roasted ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	if (days === 0) return 'roasted today';
	if (days === 1) return 'roasted yesterday';
	if (days < 30) return `roasted ${days} days ago`;
	return 'roasted ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysSinceRoast(iso: string | undefined, now: Date = new Date()): number | null {
	if (!iso) return null;
	const date = new Date(iso + 'T00:00:00');
	return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export function freshnessTone(iso: string | undefined, now: Date = new Date()): string | null {
	const days = daysSinceRoast(iso, now);
	if (days == null) return null;
	if (days <= 14) return 'var(--color-success)';
	if (days <= 21) return 'var(--color-warning)';
	return 'var(--color-danger)';
}

export function freshnessLabel(iso: string | undefined, now: Date = new Date()): string | null {
	const days = daysSinceRoast(iso, now);
	if (days == null) return null;
	if (days < 0) return 'NOT YET ROASTED';
	if (days === 0) return 'ROASTED TODAY';
	if (days === 1) return 'ROASTED YESTERDAY';
	return `ROASTED ${days} DAYS AGO`;
}

// Past the "careful" window (the danger tier in freshnessTone). The single
// source of truth for "stale enough to flag", so views don't string-match the
// CSS var freshnessTone returns.
export function freshnessStale(iso: string | undefined, now: Date = new Date()): boolean {
	const days = daysSinceRoast(iso, now);
	return days != null && days > 21;
}
