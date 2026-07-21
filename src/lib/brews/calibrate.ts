import type { Bag, Brew, EspressoBrew } from '$lib/db/types';
import { espressoShotsFor, parseLagom, formatLagom } from './dialin';

// Per-bag grind calibration. Where the Brew Compass advises the NEXT single
// shot, this looks across a bag's whole espresso history and converges on the
// grind that has actually produced good coffee — the "sweet spot" — and reports
// how confident that estimate is. It tightens as more shots are logged.
//
// Read-time only, nothing stored (per the data-model rule). Lagom tick notation
// is assumed for espresso (the user's grinder); shots whose grind doesn't parse
// are ignored, and if too few good shots remain the calibration is withheld
// rather than guessed.

export interface GrindCalibration {
	/** Recommended grind in Lagom notation, e.g. "2.9.2". */
	grind: string;
	/** Good shots that informed the estimate. */
	sampleCount: number;
	/** All parseable espresso shots for the bag (denominator for "N of M"). */
	totalShots: number;
	confidence: 'low' | 'medium' | 'high';
	/** Tick spread of the good shots — dispersion, not the estimate. */
	spreadTicks: number;
	/** What qualified the good shots: all balanced, all rating-only, or a mix. */
	basis: 'balanced' | 'rated' | 'mixed';
}

// A shot informs the sweet spot only if it tasted good. A logged sour/bitter
// verdict disqualifies it outright — even if highly rated — because its grind
// is precisely what the user was moving away from. A shot with no extraction
// logged counts only if it earned a high star rating.
function isGood(s: EspressoBrew): boolean {
	if (s.extraction === 'sour' || s.extraction === 'bitter') return false;
	if (s.extraction === 'balanced') return true;
	return s.rating != null && s.rating >= 4;
}

// Balanced shots weigh full; a rating nudges within that. Absent a rating we
// assume a neutral 0.7 so an unrated balanced shot still carries real weight.
function qualityWeight(s: EspressoBrew): number {
	const tasteBase = s.extraction === 'balanced' ? 1 : 0.5;
	const ratingFactor = s.rating != null ? s.rating / 5 : 0.7;
	return tasteBase * ratingFactor;
}

export function calibrateGrind(bag: Bag, allBrews: Brew[]): GrindCalibration | null {
	const shots = espressoShotsFor(bag, allBrews); // oldest → newest
	const parseable = shots.filter((s) => parseLagom(s.grindSetting) != null);
	const good = parseable.filter(isGood);
	// One good shot is just "that shot", not a calibration — the compass covers
	// the single-shot case. Two is the floor for an aggregate.
	if (good.length < 2) return null;

	// Recency decay: the newest good shot weighs 1, each older one 0.85× the one
	// after it — so a months-old balanced shot informs but doesn't dominate as
	// the grinder or technique drifts.
	const n = good.length;
	const ticksList: number[] = [];
	let wsum = 0;
	let acc = 0;
	good.forEach((s, i) => {
		const ticks = parseLagom(s.grindSetting)!;
		ticksList.push(ticks);
		const recency = Math.pow(0.85, n - 1 - i);
		const w = qualityWeight(s) * recency;
		wsum += w;
		acc += w * ticks;
	});
	const sweet = acc / wsum;
	const spreadTicks = Math.max(...ticksList) - Math.min(...ticksList);

	const balancedCount = good.filter((s) => s.extraction === 'balanced').length;
	const basis: GrindCalibration['basis'] =
		balancedCount === good.length ? 'balanced' : balancedCount === 0 ? 'rated' : 'mixed';

	// Confidence rises with sample size and falls as the good shots disagree
	// (wide tick spread = the sweet spot isn't settled yet).
	let confidence: GrindCalibration['confidence'];
	if (good.length >= 4 && spreadTicks <= 4) confidence = 'high';
	else if (good.length >= 3 || spreadTicks <= 3) confidence = 'medium';
	else confidence = 'low';

	return {
		grind: formatLagom(sweet),
		sampleCount: good.length,
		totalShots: parseable.length,
		confidence,
		spreadTicks,
		basis
	};
}
