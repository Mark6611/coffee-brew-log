import type { RoastLevel } from '$lib/db/types';
import { ROAST_TARGETS, addTicks } from './dialin';

// The Brew Compass — a rule-based recommendation, not a measurement of
// extraction yield. Pure + computed at read time; nothing here is stored.
//
// Grounded in a cited research pass (Rao, Hoffmann, Perger/Barista Hustle,
// EspressoAF, Coffee Ad Astra, Meticulist — 2026-07). The rules that matter:
//
//  1. TASTE LEADS WHEN LOGGED. A shot that tastes balanced is never "wrong"
//     because the clock says 37s (unanimous across sources; no authority gives
//     a threshold where a good-tasting shot must be corrected). Long/short
//     times get MENTIONED as an optional aside, never forced as a correction.
//  2. NUMBERS SPEAK WHEN TASTE IS SILENT. With no taste logged, time + flow
//     are the only evidence and the compass acts on them confidently.
//  3. Bitter + fast = channeling signature → fix puck prep, not the grinder
//     (a channel raises permeability; true over-extraction needs contact time).
//  4. Sour + already slow → raise yield, not the grind (finer risks choking;
//     more water genuinely raises extraction).
//  5. Yield is a DIAGONAL lever (Perger): more yield = weaker AND more
//     extracted; less = stronger AND less extracted. So thin → reduce yield,
//     heavy → increase yield — with a caveat about the extraction side-effect.
//  6. Ratio is an upfront DECISION (the roast band is the target); grind is
//     the lever; time is an outcome. Golden Rule: one variable per shot.

export type Extraction = 'sour' | 'balanced' | 'bitter'; // brew.extraction — grind axis
export type Strength = 'light' | 'balanced' | 'heavy'; // brew.balance — strength axis

/** One concrete move. Exactly one variable, then taste again. */
export type CompassAction =
	| { kind: 'grind'; direction: 'finer' | 'coarser'; deltaTicks: number; target: string | null }
	| { kind: 'yield'; direction: 'increase' | 'reduce'; targetG: number }
	| { kind: 'diagnose' }
	| { kind: 'hold' };

export interface Compass {
	/** yield ÷ dose (2.0 renders as "1:2.00") */
	ratio: number;
	/** yield ÷ time, g/s */
	flowRate: number;
	timeS: number;
	/** −1 under … 0 balanced … +1 over. Taste pins it; in-window time centres it. */
	position: number | null;
	status: 'under' | 'balanced' | 'over' | 'unknown';
	headline: string;
	prose: string;
	/** Optional aside — informational, never the action (e.g. the 37s note). */
	aside: string | null;
	action: CompassAction;
	/** true when taste drove the verdict; false = provisional read from numbers. */
	fromTaste: boolean;
}

export interface ShotInput {
	doseG: number | null;
	yieldG: number | null;
	timeS: number | null;
	grind: string | null;
	roast: RoastLevel | undefined;
	extraction?: Extraction | '' | null;
	balance?: Strength | '' | null;
}

// Default window when the bag has no roast level — espresso runs ~24–34s
// across styles, so the time modifiers keep working (research: windows are
// heuristic starting points, not laws).
const DEFAULT_WINDOW: [number, number] = [24, 34];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function positionOf(t: Extraction | null, timeS: number, win: [number, number]): number {
	if (t === 'sour') return -0.6;
	if (t === 'bitter') return 0.6;
	if (t === 'balanced') return 0;
	const [lo, hi] = win;
	if (timeS >= lo && timeS <= hi) {
		// In-window: keep the dot inside the balanced band (a lean, not a verdict).
		const mid = (lo + hi) / 2;
		return clamp(((timeS - mid) / (hi - lo)) * 0.4, -0.2, 0.2);
	}
	// Out of window: scale by how far past the edge, saturating ~8s out.
	return timeS < lo ? clamp(-0.3 - (lo - timeS) / 12, -1, -0.3) : clamp(0.3 + (timeS - hi) / 12, 0.3, 1);
}

function statusOf(position: number | null): Compass['status'] {
	if (position == null) return 'unknown';
	if (position <= -0.25) return 'under';
	if (position >= 0.25) return 'over';
	return 'balanced';
}

/**
 * The compass. Returns null until dose, yield and time are all present and
 * plausible. Works on raw form values (live) and on a saved shot alike.
 */
export function brewCompass(s: ShotInput): Compass | null {
	const { doseG, yieldG, timeS, roast } = s;
	if (!doseG || !yieldG || !timeS || doseG <= 0 || yieldG <= 0 || timeS <= 0) return null;
	// Plausibility floor — half-typed live values must not produce a verdict.
	if (timeS < 8 || yieldG / timeS > 6) return null;

	const ratio = yieldG / doseG;
	const flowRate = yieldG / timeS;
	const target = roast ? ROAST_TARGETS[roast] : null;
	const win = target?.time ?? DEFAULT_WINDOW;
	const band = target?.ratioBand ?? [1.75, 2.35];
	const fast = timeS < win[0];
	const slow = timeS > win[1];
	const t: Extraction | null = s.extraction || null;
	const b: Strength | null = s.balance || null;

	const grind = (deltaTicks: number): CompassAction => ({
		kind: 'grind',
		direction: deltaTicks < 0 ? 'finer' : 'coarser',
		deltaTicks,
		target: s.grind ? addTicks(s.grind, deltaTicks) : null
	});
	const yieldMove = (delta: number): Extract<CompassAction, { kind: 'yield' }> => ({
		kind: 'yield',
		direction: delta > 0 ? 'increase' : 'reduce',
		targetG: Math.round((yieldG + delta) * 10) / 10
	});

	// The optional aside — the clock's opinion, offered but never enforced
	// once taste has spoken (research finding 1).
	const timeAside = fast
		? `Fast at ${timeS}s (window ${win[0]}–${win[1]}s) — if you want it slower, one step finer gets there. Optional.`
		: slow
			? `Long at ${timeS}s (window ${win[0]}–${win[1]}s) — if you want it quicker, one step coarser gets there. Optional.`
			: null;

	const make = (
		headline: string,
		prose: string,
		action: CompassAction,
		fromTaste: boolean,
		aside: string | null = null
	): Compass => {
		const position = positionOf(t, timeS, win);
		return {
			ratio,
			flowRate,
			timeS,
			position,
			status: statusOf(position),
			headline,
			prose,
			aside,
			action,
			fromTaste
		};
	};

	// ── 1. Channeling signature: bitter + fast → puck prep, not the grinder ──
	if (t === 'bitter' && fast)
		return make(
			'Check your puck prep',
			`Bitter yet only ${timeS}s — a fast shot lacks the contact time for true over-extraction, so this pattern points at channeling. Redistribute (WDT) and level the tamp before touching the grinder.`,
			{ kind: 'diagnose' },
			true
		);

	// ── 2. Taste leads (extraction axis first — one variable per shot) ──────
	if (t === 'sour') {
		if (slow)
			return make(
				'Lengthen the shot',
				`Sour but already ${timeS}s — grinding finer risks choking it. Keep the grind and pull to about ${yieldMove(+3).targetG}g; more water genuinely raises extraction.`,
				yieldMove(+3),
				true
			);
		return make(
			'Grind finer',
			`Sour reads under-extracted. Tighten the grind and keep dose and yield steady.`,
			grind(fast ? -4 : -2),
			true
		);
	}

	if (t === 'bitter')
		return make(
			'Grind slightly coarser',
			`Bitter reads over-extracted. Open the flow, keeping dose and yield steady.`,
			grind(slow ? +4 : +2),
			true
		);

	if (t === 'balanced') {
		// Extraction is right; only strength is left. Yield is a diagonal lever —
		// the caveat is part of the advice (research finding 5).
		if (b === 'light')
			return make(
				'Pull a shorter shot',
				`Balanced but thin — cut the yield to about ${yieldMove(-2).targetG}g to concentrate it. Cutting yield also trims extraction a touch, so watch for sourness creeping in.`,
				yieldMove(-2),
				true,
				timeAside
			);
		if (b === 'heavy')
			return make(
				'Pull a longer shot',
				`Balanced but heavy — stretch the yield to about ${yieldMove(+2).targetG}g to soften it. More yield also raises extraction a touch, so watch for bitterness.`,
				yieldMove(+2),
				true,
				timeAside
			);
		return make(
			'Hold this recipe',
			`Balanced at 1:${ratio.toFixed(2)} — taste is the arbiter, and it says you're there. A second consistent shot is the cue to mark this bag dialed.`,
			{ kind: 'hold' },
			true,
			timeAside
		);
	}

	// Body logged without an extraction read → strength move with the caveat.
	if (b === 'light')
		return make(
			'Pull a shorter shot',
			`Thin reads under-strength. Cut the yield to about ${yieldMove(-2).targetG}g — and since less yield also means less extraction, re-taste for sourness.`,
			yieldMove(-2),
			true,
			timeAside
		);
	if (b === 'heavy')
		return make(
			'Pull a longer shot',
			`Heavy reads over-strength. Stretch the yield to about ${yieldMove(+2).targetG}g — more yield also extracts more, so re-taste for bitterness.`,
			yieldMove(+2),
			true,
			timeAside
		);

	// ── 3. No taste → the numbers speak, confidently but provisionally ──────
	if (fast)
		return make(
			'Likely under-extracted',
			`${timeS}s is below the ${win[0]}–${win[1]}s window at ${flowRate.toFixed(2)} g/s. Grind finer, then let taste confirm.`,
			grind(-3),
			false
		);
	if (slow)
		return make(
			'Likely over-extracted',
			`${timeS}s is above the ${win[0]}–${win[1]}s window at ${flowRate.toFixed(2)} g/s. Open the flow — keep dose and yield steady, then target ${win[0]}–${win[1]} seconds.`,
			grind(+3),
			false
		);

	// Time is fine — check the shot hit its chosen ratio (ratio is the upfront
	// decision; drifting off it silently is how recipes wander).
	if (ratio < band[0] || ratio > band[1]) {
		const wantG = Math.round(doseG * (ratio < band[0] ? band[0] : band[1]) * 10) / 10;
		const dir = ratio < band[0] ? 'short of' : 'past';
		return make(
			'Ratio drifted — taste to decide',
			`1:${ratio.toFixed(2)} is ${dir} the 1:${band[0]}–1:${band[1]} target for this roast, though the ${timeS}s time looks right. If it tasted off, bring the yield to about ${wantG}g; if it tasted good, this is your recipe now.`,
			yieldMove(wantG - yieldG),
			false
		);
	}

	return make(
		'In the sweet spot',
		target
			? `Your flow and ratio are in a strong starting range. Let taste — not the timer — decide the next move.`
			: `1:${ratio.toFixed(2)} at ${flowRate.toFixed(2)} g/s looks like a solid shot. Set a roast level on the bag for tuned targets.`,
		{ kind: 'hold' },
		false
	);
}

/** Compact renderer for the action, e.g. "Coarser → 2.4.4" / "Yield → 38g". */
export function actionLabel(a: CompassAction): string {
	if (a.kind === 'grind')
		return a.target
			? `${a.direction === 'finer' ? 'Finer' : 'Coarser'} → ${a.target}`
			: `${Math.abs(a.deltaTicks)} ticks ${a.direction}`;
	if (a.kind === 'yield')
		return `${a.direction === 'increase' ? 'Longer' : 'Shorter'} → ${a.targetG}g`;
	if (a.kind === 'diagnose') return 'Fix puck prep';
	return 'Hold';
}
