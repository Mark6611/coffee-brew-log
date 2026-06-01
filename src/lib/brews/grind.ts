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

// Seed starting points per grinder × roast level — the cold-start nudge shown
// until the user has ≥3 brews at a roast level, after which the suggestion
// switches to the median of their own history (so these only matter early).
// Direction: lighter/denser roast → finer, darker/more-soluble → coarser.
//   Fellow Ode Gen 2 (pour-over): anchored on the owner's everyday 4.2, ±0.3.
//   Lagom Casa (espresso): owner doesn't have it yet — seeded across Option-O's
//   documented espresso range 0.3.8–0.8.0 (rotation.number.tick notation).
// Replace both with real dialed-in values once available.
const SEED_TABLE: Record<string, Partial<Record<RoastLevel, string>>> = {
	'Fellow Ode Gen 2': { light: '4.0', medium: '4.2', 'medium-dark': '4.4', dark: '4.5' },
	'Lagom Casa': { light: '0.4.5', medium: '0.5.5', 'medium-dark': '0.6.5', dark: '0.7.5' }
};

// Pull the numeric part of a free-text grind ("Ode 7.5" → 7.5). Null if none.
export function parseGrind(s: string | undefined | null): number | null {
	if (!s) return null;
	const m = s.match(/-?\d+(\.\d+)?/);
	if (!m) return null;
	const n = Number(m[0]);
	return Number.isNaN(n) ? null : n;
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
		// Positional median by parsed grind, returning the real logged value
		// verbatim — preserves notation (the Ode's "4.2", the Lagom's "0.6.5")
		// rather than reconstructing a number, which would drop the tick.
		const ranked = peers
			.map((p) => ({ raw: p.grindSetting as string, n: parseGrind(p.grindSetting) }))
			.filter((x): x is { raw: string; n: number } => x.n != null)
			.sort((a, b) => a.n - b.n);
		if (ranked.length > 0) {
			return {
				kind: 'history',
				value: ranked[Math.floor(ranked.length / 2)].raw,
				grinder,
				brews: peers.length
			};
		}
	}

	// RULE 3 — seed table fallback.
	const seed = SEED_TABLE[grinder]?.[bag.roastLevel];
	if (seed != null) return { kind: 'seed', value: seed, grinder };

	// RULE 4 — nothing to offer.
	return null;
}
