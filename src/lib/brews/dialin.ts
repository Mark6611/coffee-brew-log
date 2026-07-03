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
	hint: string | null;
}

export const ROAST_TARGETS: Record<RoastLevel, RoastTarget> = {
	light: { ratio: '1:2.2–2.5', yieldG: '40–45g', time: [26, 32], hint: 'finer end' },
	medium: { ratio: '1:2', yieldG: '36g', time: [25, 30], hint: null },
	'medium-dark': { ratio: '1:1.8–2', yieldG: '32–36g', time: [24, 28], hint: null },
	dark: { ratio: '1:1.5–1.8', yieldG: '27–32g', time: [22, 26], hint: 'coarser end' }
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

// ─── The 9-case next-shot matrix ─────────────────────────────────────────

export type NextShot =
	| {
			kind: 'move';
			deltaTicks: number; // signed: negative = finer, positive = coarser
			direction: 'finer' | 'coarser';
			target: string | null; // concrete Lagom value, null if grind unparseable
			headline: string;
			prose: string;
	  }
	| { kind: 'hold'; headline: string; prose: string };

function windowProse(timeS: number, lo: number, hi: number): string {
	if (timeS < lo) return `${timeS}s is below the ${lo}–${hi}s window`;
	if (timeS > hi) return `${timeS}s is above the ${lo}–${hi}s window`;
	return `${timeS}s sits inside the ${lo}–${hi}s window`;
}

export function resolveNextShot(shot: EspressoBrew, bag: Bag): NextShot | null {
	const roast = bag.roastLevel;
	// No roast level → no window → stay silent (restraint over guessing).
	if (!roast) return null;

	const [lo, hi] = ROAST_TARGETS[roast].time;
	const timeS = shot.brewTimeSeconds;
	const fast = timeS < lo;
	const slow = timeS > hi;
	const t = shot.extraction;
	const w = windowProse(timeS, lo, hi);

	const move = (deltaTicks: number, headline: string, tail: string): NextShot => ({
		kind: 'move',
		deltaTicks,
		direction: deltaTicks < 0 ? 'finer' : 'coarser',
		target: addTicks(shot.grindSetting, deltaTicks),
		headline,
		prose: `${w}${tail}`
	});

	if (fast && t === 'sour')
		return move(-4, 'Fast and sour — go finer.', ' and the shot read sour: classic under-extraction.');
	if (slow && t === 'bitter')
		return move(+4, 'Slow and bitter — go coarser.', ' and the shot read bitter: classic over-extraction.');
	if (fast && t === 'bitter')
		return move(
			-2,
			'Fast but bitter — small step finer; taste again.',
			' yet read bitter — mixed signals, so move gently and re-taste.'
		);
	if (slow && t === 'sour')
		return move(
			+2,
			'Slow but sour — small step coarser; consider temp.',
			' yet read sour — mixed signals; raising brew temp on the Series 1 is the other lever.'
		);
	if (fast) return move(-3, 'Ran fast — finer.', '.');
	if (slow) return move(+3, 'Ran slow — coarser.', '.');
	if (t === 'sour')
		return move(
			-2,
			'In the window but sour — nudge finer, or check temp.',
			' but read sour; a nudge finer, or a hotter brew temp on the Series 1, are the levers.'
		);
	if (t === 'bitter')
		return move(+2, 'In the window but bitter — nudge coarser.', ' but read bitter — nudge coarser.');
	if (t === 'balanced')
		return {
			kind: 'hold',
			headline: 'On target. Hold here.',
			prose: `${w} and tasted balanced. A second consistent shot is the cue to mark this bag dialed.`
		};
	return null; // in window, no taste logged → silent
}

// ─── Dial-in helpers for the UI layer ────────────────────────────────────

/** This bag's espresso shots, oldest → newest (dial-in progression order). */
export function espressoShotsFor(bag: Bag, allBrews: Brew[]): EspressoBrew[] {
	return allBrews
		.filter((b): b is EspressoBrew => b.method === 'espresso' && b.bagId === bag.id && !b.deletedAt)
		.sort((a, b) => (a.brewedAt < b.brewedAt ? -1 : 1));
}

/** Whether a shot landed inside its roast window. Null when no roast level. */
export function inWindow(shot: EspressoBrew, roast: RoastLevel | undefined): boolean | null {
	if (!roast) return null;
	const [lo, hi] = ROAST_TARGETS[roast].time;
	return shot.brewTimeSeconds >= lo && shot.brewTimeSeconds <= hi;
}

/** "Mark dialed" brightens when the last two shots are in-window AND balanced. */
export function readyToDial(shots: EspressoBrew[], roast: RoastLevel | undefined): boolean {
	if (!roast || shots.length < 2) return false;
	return shots
		.slice(-2)
		.every((s) => s.extraction === 'balanced' && inWindow(s, roast) === true);
}
