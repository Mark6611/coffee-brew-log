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

export function formatRoastedAt(iso: string | undefined, now: Date = new Date()): string {
	if (!iso) return '';
	const date = new Date(iso + 'T00:00:00');
	const days = Math.round((now.getTime() - date.getTime()) / 86_400_000);
	if (days < 0) return 'roasted ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	if (days === 0) return 'roasted today';
	if (days === 1) return 'roasted yesterday';
	if (days < 30) return `roasted ${days} days ago`;
	return 'roasted ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysSinceRoast(
	iso: string | undefined,
	now: Date = new Date()
): number | null {
	if (!iso) return null;
	const date = new Date(iso + 'T00:00:00');
	return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

export function freshnessTone(
	iso: string | undefined,
	now: Date = new Date()
): string | null {
	const days = daysSinceRoast(iso, now);
	if (days == null) return null;
	if (days <= 14) return 'var(--color-success)';
	if (days <= 21) return 'var(--color-warning)';
	return 'var(--color-danger)';
}

export function freshnessLabel(
	iso: string | undefined,
	now: Date = new Date()
): string | null {
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
