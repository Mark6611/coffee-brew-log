import type { Brew, Bag, RoastLevel } from '$lib/db/types';

// Read-time, advisory grind suggestion. NEVER stored — computed from the bag's
// roast level + brew method + the user's own history. See the design handoff's
// precedence tree (same-bag prefill > history > seed > silent).

export type Method = 'espresso' | 'pour-over';

export type GrindSuggestion =
	| { kind: 'prefill'; value: string; grinder: string }
	| { kind: 'history'; value: string; grinder: string; brews: number }
	| { kind: 'seed'; value: string; grinder: string };

// Method picks the grinder — the owner uses one per method.
export function grinderFor(method: Method): string {
	return method === 'espresso' ? 'Lagom Casa' : 'Fellow Ode Gen 2';
}

// Seed starting points per grinder × roast level. ILLUSTRATIVE — the owner
// replaces these with their actual dialed-in numbers. Darker roast = more
// brittle/soluble, ground a touch coarser as a starting point.
const SEED_TABLE: Record<string, Partial<Record<RoastLevel, string>>> = {
	'Fellow Ode Gen 2': { light: 'Ode 8', medium: 'Ode 7', 'medium-dark': 'Ode 6.5', dark: 'Ode 6' },
	'Lagom Casa': {
		light: 'Lagom 2.6',
		medium: 'Lagom 2.4',
		'medium-dark': 'Lagom 2.2',
		dark: 'Lagom 2.0'
	}
};

// Pull the numeric part of a free-text grind ("Ode 7.5" → 7.5). Null if none.
export function parseGrind(s: string | undefined | null): number | null {
	if (!s) return null;
	const m = s.match(/-?\d+(\.\d+)?/);
	if (!m) return null;
	const n = Number(m[0]);
	return Number.isNaN(n) ? null : n;
}

export function median(nums: number[]): number | null {
	if (nums.length === 0) return null;
	const sorted = [...nums].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function displayValue(grinder: string, n: number): string {
	const prefix = grinder === 'Lagom Casa' ? 'Lagom' : 'Ode';
	return `${prefix} ${n}`;
}

export function resolveGrindSuggestion(
	bag: Bag,
	method: Method,
	allBrews: Brew[],
	allBags: Bag[]
): GrindSuggestion | null {
	const grinder = grinderFor(method);

	// RULE 1 — a prior brew of THIS bag (with a grind) → prefill, not a suggestion.
	const sameBag = allBrews
		.filter((b) => b.bagId === bag.id && b.grindSetting && !b.deletedAt)
		.sort((a, b) => (a.brewedAt < b.brewedAt ? 1 : -1))[0];
	if (sameBag) return { kind: 'prefill', value: sameBag.grindSetting, grinder };

	// No roast level → silent.
	if (!bag.roastLevel) return null;

	// RULE 2 — ≥3 prior brews at this roast level × method → personal suggestion.
	const bagById = new Map(allBags.map((b) => [b.id, b]));
	const peers = allBrews.filter((b) => {
		if (b.deletedAt || !b.grindSetting || b.method !== method || !b.bagId) return false;
		return bagById.get(b.bagId)?.roastLevel === bag.roastLevel;
	});
	if (peers.length >= 3) {
		const nums = peers
			.map((p) => parseGrind(p.grindSetting))
			.filter((n): n is number => n != null);
		const med = median(nums);
		if (med != null) {
			return { kind: 'history', value: displayValue(grinder, med), grinder, brews: peers.length };
		}
	}

	// RULE 3 — seed table fallback.
	const seed = SEED_TABLE[grinder]?.[bag.roastLevel];
	if (seed != null) return { kind: 'seed', value: seed, grinder };

	// RULE 4 — nothing to offer.
	return null;
}
