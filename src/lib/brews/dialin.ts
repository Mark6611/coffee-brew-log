import type { Bag, Brew, EspressoBrew, RoastLevel } from '$lib/db/types';

// Espresso dial-in engine. Everything here is advisory and computed at read
// time — nothing is stored (the sole exception, bag.dialedRecipe, is a user
// declaration snapshotted in the UI layer, not here).

// ─── Roast-level target windows (at the fixed 18g dose) ─────────────────
// Illustrative starting heuristics per the design handoff — tune as constants.

export interface RoastTarget {
	ratio: string; // display form, e.g. '1:2'
	yieldG: string; // concrete grams at 18g dose — never make the user do math
	time: [number, number]; // shot-time window in seconds
	/** numeric ratio band — the "chosen ratio" the compass checks drift against */
	ratioBand: [number, number];
	hint: string | null;
}

// Windows widened 2026-07 per the cited research pass: they are heuristic
// starting points, not laws (light roasts especially run long — Hoffmann's
// light method sits at 35–50s on longer ratios), and a generous window means
// the compass nags less and defers to taste more.
export const ROAST_TARGETS: Record<RoastLevel, RoastTarget> = {
	light: { ratio: '1:2.2–2.5', yieldG: '40–45g', time: [26, 36], ratioBand: [2.2, 2.8], hint: 'finer end' },
	medium: { ratio: '1:2', yieldG: '36g', time: [24, 32], ratioBand: [1.9, 2.35], hint: null },
	'medium-dark': { ratio: '1:1.8–2', yieldG: '32–36g', time: [23, 30], ratioBand: [1.7, 2.1], hint: null },
	dark: { ratio: '1:1.5–1.8', yieldG: '27–32g', time: [21, 28], ratioBand: [1.5, 1.9], hint: 'coarser end' }
};

// Fixed rail domain for the target-window bar (all roast windows fit).
export const TIME_RAIL: [number, number] = [18, 36];

// ─── Lagom Casa tick arithmetic ──────────────────────────────────────────
// Notation rotation.number.tick (e.g. '0.6.2'); 1 number = 10 ticks,
// 1 rotation = 10 numbers = 100 ticks. Borrow/carry across boundaries:
// 0.6.2 − 4 ticks = 0.5.8. Floor at 0.0.0.

export function parseLagom(s: string | undefined | null): number | null {
	if (!s) return null;
	const m = s.match(/(\d+)\.(\d)\.(\d)(?!\d)/);
	if (!m) return null;
	return Number(m[1]) * 100 + Number(m[2]) * 10 + Number(m[3]);
}

export function formatLagom(totalTicks: number): string {
	const t = Math.max(0, Math.round(totalTicks));
	return `${Math.floor(t / 100)}.${Math.floor((t % 100) / 10)}.${t % 10}`;
}

export function addTicks(grind: string, delta: number): string | null {
	const ticks = parseLagom(grind);
	if (ticks == null) return null;
	return formatLagom(ticks + delta);
}

// The 9-case next-shot matrix (resolveNextShot) that lived here was superseded
// 2026-07 by the Brew Compass — src/lib/brews/compass.ts — which is research-
// grounded (taste leads when logged; numbers speak when it's silent; bitter+fast
// reads as channeling; sour+slow moves yield, not grind), always has an answer,
// and needs no roast level to function.

// ─── Dial-in helpers for the UI layer ────────────────────────────────────

/** This bag's espresso shots, oldest → newest (dial-in progression order).
 * Ties on brewedAt (minute-precision manual entry) break on id so "latest"
 * is deterministic. */
export function espressoShotsFor(bag: Bag, allBrews: Brew[]): EspressoBrew[] {
	return allBrews
		.filter((b): b is EspressoBrew => b.method === 'espresso' && b.bagId === bag.id && !b.deletedAt)
		.sort((a, b) => a.brewedAt.localeCompare(b.brewedAt) || a.id.localeCompare(b.id));
}

/** Whether a shot landed inside its roast window. Null when no roast level. */
export function inWindow(shot: EspressoBrew, roast: RoastLevel | undefined): boolean | null {
	if (!roast) return null;
	const [lo, hi] = ROAST_TARGETS[roast].time;
	return shot.brewTimeSeconds >= lo && shot.brewTimeSeconds <= hi;
}

/** "Mark dialed" brightens when the last two shots tasted balanced. Taste is
 * the arbiter (research: a good-tasting shot outside the window is still a
 * good shot) — so no time gate, and no roast level required. */
export function readyToDial(shots: EspressoBrew[], _roast?: RoastLevel | undefined): boolean {
	if (shots.length < 2) return false;
	return shots.slice(-2).every((s) => s.extraction === 'balanced');
}
