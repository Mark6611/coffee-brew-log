import type { Bag, Brew, DialedRecipe, Extraction } from '$lib/db/types';
import { calibrateGrind, type GrindCalibration } from './calibrate';
import { brewCompass, type Compass } from './compass';
import { formatBrewTime } from './compute';
import { resolveGrindSuggestion, type GrindSuggestion, type Method } from './grind';

// A bag's recent history on one method — the reference sheet opened from the
// brew form. Read-time only: derived from the bags and brews the form has
// already loaded, nothing stored (per the data-model rule).
//
// Method-scoped throughout, for the reason grind.ts gives: a grind belongs to
// a grinder, and the owner uses one per method.

export const HISTORY_LIMIT = 5;

export interface HistoryRow {
	id: string;
	/** Position among this bag's brews on this method, oldest = 1 ("shot 3"). */
	n: number;
	brewedAt: string;
	grind: string;
	doseG: number;
	/** Espresso yield or pour-over water, in grams. */
	outG: number;
	/** Display form — "27s" for espresso, "2:48" for pour-over. */
	time: string;
	/** Espresso only, and only when it was logged. Drives the row's dot. */
	extraction: Extraction | undefined;
	/** The logged taste in words ("sour · thin"); null when none was logged. */
	taste: string | null;
	rating: number | undefined;
}

/** What to do next. Absent when the newest row already says it all. */
export type HistoryNext =
	| { kind: 'dialed'; recipe: DialedRecipe }
	| { kind: 'compass'; compass: Compass }
	| { kind: 'start'; suggestion: Exclude<GrindSuggestion, { kind: 'prefill' }> };

export interface BagHistory {
	method: Method;
	/** Newest first, at most HISTORY_LIMIT. */
	rows: HistoryRow[];
	/** Every brew of this bag on this method — `rows` may show fewer. */
	total: number;
	/** Espresso only, and only once two good shots exist (see calibrate.ts). */
	calibration: GrindCalibration | null;
	next: HistoryNext | null;
}

/**
 * The logged taste in words. Espresso leads with the extraction verdict and
 * adds strength only when it is off ("sour · thin") — "balanced" there means
 * extraction. Pour-over has no extraction axis, so its strength is the whole
 * verdict and "balanced" is worth saying.
 */
export function tasteLabel(brew: Brew): string | null {
	const strength = brew.balance === 'light' ? 'thin' : brew.balance === 'heavy' ? 'heavy' : null;
	if (brew.method === 'pour-over') return strength ?? (brew.balance ? 'balanced' : null);
	const parts: string[] = [];
	if (brew.extraction) parts.push(brew.extraction);
	if (strength) parts.push(strength);
	return parts.length ? parts.join(' · ') : null;
}

export function bagHistory(
	bag: Bag,
	method: Method,
	allBrews: Brew[],
	allBags: Bag[],
	limit: number = HISTORY_LIMIT
): BagHistory {
	// Oldest → newest, ties broken by id: the order espressoShotsFor() uses, so
	// "shot 3" here is the same shot the form's header and the bag page number.
	const brews = allBrews
		.filter((b) => b.method === method && b.bagId === bag.id && !b.deletedAt)
		.sort((a, b) => a.brewedAt.localeCompare(b.brewedAt) || a.id.localeCompare(b.id));

	const rows = brews
		.map(
			(b, i): HistoryRow => ({
				id: b.id,
				n: i + 1,
				brewedAt: b.brewedAt,
				grind: b.grindSetting,
				doseG: b.doseGrams,
				outG: b.method === 'espresso' ? b.yieldGrams : b.waterGrams,
				time: formatBrewTime(b),
				extraction: b.method === 'espresso' ? b.extraction : undefined,
				taste: tasteLabel(b),
				rating: b.rating
			})
		)
		.slice(-limit)
		.reverse();

	return {
		method,
		rows,
		total: brews.length,
		calibration: method === 'espresso' ? calibrateGrind(bag, allBrews) : null,
		next: nextFor(bag, method, brews.at(-1) ?? null, allBrews, allBags)
	};
}

function nextFor(
	bag: Bag,
	method: Method,
	last: Brew | null,
	allBrews: Brew[],
	allBags: Bag[]
): HistoryNext | null {
	if (method === 'espresso') {
		// A dialed bag follows its recipe; the compass stands down (as on the form).
		if (bag.dialedRecipe) return { kind: 'dialed', recipe: bag.dialedRecipe };
		if (last?.method === 'espresso') {
			const compass = brewCompass({
				doseG: last.doseGrams,
				yieldG: last.yieldGrams,
				timeS: last.brewTimeSeconds,
				grind: last.grindSetting,
				roast: bag.roastLevel,
				extraction: last.extraction,
				balance: last.balance
			});
			if (compass) return { kind: 'compass', compass };
		}
	}
	// Cold start only. A 'prefill' is just the newest row's grind again.
	const suggestion = resolveGrindSuggestion(bag, method, allBrews, allBags);
	if (!suggestion || suggestion.kind === 'prefill') return null;
	return { kind: 'start', suggestion };
}
