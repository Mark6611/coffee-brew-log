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
