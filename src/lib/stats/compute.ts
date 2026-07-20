import type { Brew, Bag } from '$lib/db/types';
import { ratio } from '$lib/brews/compute';
import { daysSinceRoast } from '$lib/bags/compute';

export type Range = '12w' | '6m' | 'all';

export function filterByRange(brews: Brew[], range: Range, now: Date = new Date()): Brew[] {
	if (range === 'all') return brews;
	const days = range === '12w' ? 84 : 182;
	const cutoff = now.getTime() - days * 86_400_000;
	return brews.filter((b) => new Date(b.brewedAt).getTime() >= cutoff);
}

export function brewsByWeek(brews: Brew[], weeks = 12, now: Date = new Date()): number[] {
	const buckets = new Array(weeks).fill(0);
	const totalMs = weeks * 7 * 86_400_000;
	const start = now.getTime() - totalMs;
	for (const b of brews) {
		const t = new Date(b.brewedAt).getTime();
		if (t < start || t > now.getTime()) continue;
		const wk = Math.min(weeks - 1, Math.floor((t - start) / (7 * 86_400_000)));
		buckets[wk]++;
	}
	return buckets;
}

export function avgRatio(brews: Brew[]): number | null {
	// A ratio only compares within a method (espresso dose:yield ~1:2 vs pour-over
	// dose:water ~1:16); averaging across methods yields a number no brew has and that
	// swings with the espresso/pour-over mix rather than with dialing-in. Restrict to
	// pour-overs, matching ratioBuckets below.
	const pourovers = brews.filter((b) => b.method === 'pour-over');
	if (pourovers.length === 0) return null;
	return pourovers.reduce((s, b) => s + ratio(b), 0) / pourovers.length;
}

export function avgRating(brews: Brew[]): number | null {
	const rated = brews.filter((b) => b.rating != null);
	if (rated.length === 0) return null;
	return rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length;
}

export interface MethodSplit {
	espresso: number;
	pourOver: number;
	espressoPct: number;
	pourOverPct: number;
}

export function methodSplit(brews: Brew[]): MethodSplit {
	const e = brews.filter((b) => b.method === 'espresso').length;
	const p = brews.filter((b) => b.method === 'pour-over').length;
	const total = e + p;
	return {
		espresso: e,
		pourOver: p,
		espressoPct: total === 0 ? 0 : (e / total) * 100,
		pourOverPct: total === 0 ? 0 : (p / total) * 100
	};
}

export interface RatioBuckets {
	ratios: number[];
	counts: number[];
	median: number | null;
}

export function ratioBuckets(brews: Brew[]): RatioBuckets {
	const ratios = [14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18];
	const pourovers = brews.filter((b) => b.method === 'pour-over');
	const counts = new Array(ratios.length).fill(0);

	for (const b of pourovers) {
		const r = ratio(b);
		let bestIdx = 0;
		let bestDist = Math.abs(ratios[0] - r);
		for (let i = 1; i < ratios.length; i++) {
			const d = Math.abs(ratios[i] - r);
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		}
		counts[bestIdx]++;
	}

	if (pourovers.length === 0) return { ratios, counts, median: null };
	const sorted = pourovers.map(ratio).sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	return { ratios, counts, median };
}

export function topRatedBrews(brews: Brew[], n = 3): Brew[] {
	return brews
		.filter((b) => b.rating != null)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
		.slice(0, n);
}

export function mostBrewedBag(brews: Brew[], bags: Bag[]): { bag: Bag | null; count: number } {
	const counts: Record<string, number> = {};
	for (const b of brews) {
		if (b.bagId) counts[b.bagId] = (counts[b.bagId] ?? 0) + 1;
	}
	const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	if (entries.length === 0) return { bag: null, count: 0 };
	const [topId, count] = entries[0];
	return { bag: bags.find((b) => b.id === topId) ?? null, count };
}

export interface FreshnessAtBrew {
	fresh: number;
	careful: number;
	old: number;
	total: number;
}

export function freshnessAtBrew(brews: Brew[], bags: Bag[]): FreshnessAtBrew {
	let fresh = 0;
	let careful = 0;
	let old = 0;
	for (const b of brews) {
		if (!b.bagId) continue;
		const bag = bags.find((x) => x.id === b.bagId);
		if (!bag?.roastedAt) continue;
		const days = daysSinceRoast(bag.roastedAt, new Date(b.brewedAt));
		if (days == null) continue;
		if (days <= 14) fresh++;
		else if (days <= 21) careful++;
		else old++;
	}
	return { fresh, careful, old, total: fresh + careful + old };
}

export function brewsByHour(brews: Brew[]): number[] {
	const hours = new Array(24).fill(0);
	for (const b of brews) {
		const h = new Date(b.brewedAt).getHours();
		hours[h]++;
	}
	return hours;
}

export function peakHour(byHour: number[]): { hour: number; count: number } | null {
	let maxIdx = 0;
	let maxVal = 0;
	for (let i = 0; i < byHour.length; i++) {
		if (byHour[i] > maxVal) {
			maxVal = byHour[i];
			maxIdx = i;
		}
	}
	if (maxVal === 0) return null;
	return { hour: maxIdx, count: maxVal };
}

function format12h(hour: number): string {
	const h = hour % 12 || 12;
	const ampm = hour < 12 ? 'AM' : 'PM';
	return `${h} ${ampm}`;
}

export function pullQuote(
	brews: Brew[],
	bags: Bag[],
	range: Range,
	now: Date = new Date()
): string {
	const filtered = filterByRange(brews, range, now);
	if (filtered.length === 0) return 'No brews in this range yet.';

	const observations: { text: string; strength: number }[] = [];

	// Weekly trend
	const weekly = brewsByWeek(filtered, 12, now);
	const lastWeek = weekly[weekly.length - 1];
	const prevWeek = weekly[weekly.length - 2];
	if (prevWeek > 0) {
		const delta = lastWeek - prevWeek;
		if (Math.abs(delta) >= 2) {
			observations.push({
				text:
					delta > 0
						? `You logged ${delta} more brew${delta === 1 ? '' : 's'} this week than last.`
						: `You logged ${-delta} fewer brew${-delta === 1 ? '' : 's'} this week than last.`,
				strength: Math.abs(delta)
			});
		}
	}

	// Method split
	const ms = methodSplit(filtered);
	if (Math.abs(ms.espressoPct - ms.pourOverPct) > 30) {
		const winner = ms.pourOverPct > ms.espressoPct ? 'pour-over' : 'espresso';
		const pct = Math.max(ms.pourOverPct, ms.espressoPct);
		observations.push({
			text: `${Math.round(pct)}% of your brews are ${winner}.`,
			strength: pct - 50
		});
	}

	// Peak hour
	const byHour = brewsByHour(filtered);
	const peak = peakHour(byHour);
	if (peak && peak.count >= 3) {
		observations.push({
			text: `You brew most often around ${format12h(peak.hour)}.`,
			strength: peak.count
		});
	}

	// Most brewed bag
	const top = mostBrewedBag(filtered, bags);
	if (top.bag && top.count >= 3) {
		observations.push({
			text: `You've brewed ${top.bag.name} ${top.count} times — your most-used bag.`,
			strength: top.count
		});
	}

	// Average rating
	const ar = avgRating(filtered);
	if (ar != null && filtered.filter((b) => b.rating != null).length >= 5) {
		if (ar >= 4) {
			observations.push({
				text: `Your average rating is ${ar.toFixed(1)} — you're dialing in.`,
				strength: ar
			});
		}
	}

	if (observations.length === 0) {
		const label =
			range === 'all'
				? 'in total'
				: range === '12w'
					? 'in the last 12 weeks'
					: 'in the last 6 months';
		return `You logged ${filtered.length} brew${filtered.length === 1 ? '' : 's'} ${label}.`;
	}
	observations.sort((a, b) => b.strength - a.strength);
	return observations[0].text;
}

export function formatHour(hour: number): string {
	return format12h(hour);
}
