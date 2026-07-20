import { describe, it, expect } from 'vitest';
import { brewCompass, actionLabel, type ShotInput } from './compass';

// Medium roast window is [24, 32]s, ratio band [1.9, 2.35]. 18g dose throughout.
function shot(over: Partial<ShotInput> = {}): ShotInput {
	return {
		doseG: 18,
		yieldG: 36,
		timeS: 28,
		grind: '2.4.0',
		roast: 'medium',
		extraction: null,
		balance: null,
		...over
	};
}

describe('metrics', () => {
	it('derives ratio and flow rate (the spec worked example)', () => {
		const c = brewCompass(shot({ yieldG: 40, timeS: 30 }))!;
		expect(c.ratio).toBeCloseTo(2.22, 2);
		expect(c.flowRate).toBeCloseTo(1.33, 2);
	});
	it('returns null until dose, yield and time are present', () => {
		expect(brewCompass(shot({ yieldG: null }))).toBeNull();
		expect(brewCompass(shot({ timeS: null }))).toBeNull();
		expect(brewCompass(shot({ doseG: 0 }))).toBeNull();
	});
	it('plausibility floor: half-typed live values produce no verdict', () => {
		expect(brewCompass(shot({ timeS: 4 }))).toBeNull(); // "4" of a typed "40"
		expect(brewCompass(shot({ timeS: 9, yieldG: 90 }))).toBeNull(); // flow 10 g/s
	});
});

describe('taste leads when logged (research finding 1)', () => {
	it('balanced + 37s → HOLD, with the clock as an optional aside', () => {
		const c = brewCompass(shot({ extraction: 'balanced', timeS: 37 }))!;
		expect(c.action.kind).toBe('hold');
		expect(c.headline).toBe('Hold this recipe');
		expect(c.fromTaste).toBe(true);
		expect(c.aside).toContain('37s');
		expect(c.aside).toContain('Optional');
		expect(c.prose).not.toContain('coarser');
	});
	it('balanced + fast → HOLD too, aside mentions finer as optional', () => {
		const c = brewCompass(shot({ extraction: 'balanced', timeS: 20 }))!;
		expect(c.action.kind).toBe('hold');
		expect(c.aside).toContain('finer');
	});
	it('balanced in-window → HOLD with no aside', () => {
		const c = brewCompass(shot({ extraction: 'balanced' }))!;
		expect(c.action.kind).toBe('hold');
		expect(c.aside).toBeNull();
	});
	it('balanced pins the dot to centre regardless of time', () => {
		expect(brewCompass(shot({ extraction: 'balanced', timeS: 40 }))!.position).toBe(0);
		expect(brewCompass(shot({ extraction: 'balanced', timeS: 40 }))!.status).toBe('balanced');
	});
});

describe('the grind axis (sour ↔ bitter)', () => {
	it('sour + fast → grind finer, full step', () => {
		const c = brewCompass(shot({ extraction: 'sour', timeS: 21 }))!;
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'finer', deltaTicks: -4 });
		expect(c.status).toBe('under');
	});
	it('sour in-window → grind finer, gentle step', () => {
		const c = brewCompass(shot({ extraction: 'sour' }))!;
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'finer', deltaTicks: -2 });
	});
	it('sour + slow → increase yield (finer would choke it)', () => {
		const c = brewCompass(shot({ extraction: 'sour', timeS: 36 }))!;
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'increase', targetG: 39 });
		expect(c.prose).toContain('choking');
	});
	it('bitter + slow → grind coarser, full step', () => {
		const c = brewCompass(shot({ extraction: 'bitter', timeS: 36 }))!;
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'coarser', deltaTicks: 4 });
		expect(c.status).toBe('over');
	});
	it('bitter + fast → channeling diagnostic, not a grind move (finding 3)', () => {
		const c = brewCompass(shot({ extraction: 'bitter', timeS: 21 }))!;
		expect(c.action.kind).toBe('diagnose');
		expect(c.headline).toBe('Check your puck prep');
		expect(c.prose).toContain('WDT');
	});
	it('grind moves carry a concrete Lagom target', () => {
		const c = brewCompass(shot({ extraction: 'sour', timeS: 21, grind: '2.4.0' }))!;
		expect(c.action).toMatchObject({ kind: 'grind', target: '2.3.6' }); // −4 ticks
	});
	it('an unparseable grind still yields advice, just no target', () => {
		const c = brewCompass(shot({ extraction: 'sour', timeS: 21, grind: 'medium-ish' }))!;
		expect(c.action).toMatchObject({ kind: 'grind', target: null });
	});
});

describe('the strength axis — yield is a diagonal lever (finding 5)', () => {
	it('balanced + thin → REDUCE yield (Perger: less yield = stronger)', () => {
		const c = brewCompass(shot({ extraction: 'balanced', balance: 'light' }))!;
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'reduce', targetG: 34 });
		expect(c.prose).toContain('sour'); // the diagonal caveat
	});
	it('balanced + heavy → INCREASE yield', () => {
		const c = brewCompass(shot({ extraction: 'balanced', balance: 'heavy' }))!;
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'increase', targetG: 38 });
		expect(c.prose).toContain('bitter'); // the diagonal caveat
	});
	it('body alone still drives a yield move', () => {
		const c = brewCompass(shot({ balance: 'heavy' }))!;
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'increase' });
		expect(c.fromTaste).toBe(true);
	});
	it('an extraction fault outranks the body reading (one variable per shot)', () => {
		const c = brewCompass(shot({ extraction: 'bitter', balance: 'heavy', timeS: 36 }))!;
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'coarser' });
	});
});

describe('numbers speak when taste is silent', () => {
	it('slow, no taste → likely over-extracted, coarser, provisional', () => {
		const c = brewCompass(shot({ timeS: 40 }))!;
		expect(c.headline).toBe('Likely over-extracted');
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'coarser' });
		expect(c.fromTaste).toBe(false);
		expect(c.status).toBe('over');
	});
	it('fast, no taste → likely under-extracted, finer', () => {
		const c = brewCompass(shot({ timeS: 20 }))!;
		expect(c.headline).toBe('Likely under-extracted');
		expect(c.status).toBe('under');
	});
	it('in-window, ratio on target → sweet spot, defer to taste', () => {
		const c = brewCompass(shot())!;
		expect(c.headline).toBe('In the sweet spot');
		expect(c.action.kind).toBe('hold');
		expect(c.prose).toContain('not the timer');
	});
	it('ratio drift: time fine but 1:3.5 → yield move toward the band, taste decides', () => {
		const c = brewCompass(shot({ yieldG: 63 }))!; // 63/18 = 3.5, flow 2.25 ok
		expect(c.headline).toBe('Ratio drifted — taste to decide');
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'reduce' });
		expect(c.fromTaste).toBe(false);
	});
	it('ratio drift low: 1:1.2 ristretto against a medium band → increase', () => {
		const c = brewCompass(shot({ yieldG: 22 }))!;
		expect(c.headline).toBe('Ratio drifted — taste to decide');
		expect(c.action).toMatchObject({ kind: 'yield', direction: 'increase' });
	});
});

describe('the dot agrees with the headline (audit fix)', () => {
	it('every in-window no-taste time reads status balanced', () => {
		for (const t of [24, 25, 28, 31, 32]) {
			const c = brewCompass(shot({ timeS: t }))!;
			expect(c.status, `status at ${t}s`).toBe('balanced');
		}
	});
	it('position saturates the further past the window a shot runs', () => {
		const p35 = brewCompass(shot({ timeS: 35 }))!.position!;
		const p42 = brewCompass(shot({ timeS: 42 }))!.position!;
		expect(p42).toBeGreaterThan(p35);
		expect(p42).toBeLessThanOrEqual(1);
	});
});

describe('roast level', () => {
	it('30s is in-window for medium but slow for dark', () => {
		expect(brewCompass(shot({ roast: 'medium', timeS: 30 }))!.action.kind).toBe('hold');
		// dark window is [21, 28]
		expect(brewCompass(shot({ roast: 'dark', timeS: 30 }))!.headline).toBe('Likely over-extracted');
	});
	it('no roast level → default window still powers the time modifiers', () => {
		const c = brewCompass(shot({ roast: undefined, timeS: 40 }))!; // default [24,34]
		expect(c.headline).toBe('Likely over-extracted');
	});
	it('no roast level, in-window → sweet spot suggesting a roast level', () => {
		const c = brewCompass(shot({ roast: undefined }))!;
		expect(c.headline).toBe('In the sweet spot');
		expect(c.prose).toContain('roast level');
	});
	it('taste works without a roast level', () => {
		const c = brewCompass(shot({ roast: undefined, extraction: 'bitter', timeS: 30 }))!;
		expect(c.action).toMatchObject({ kind: 'grind', direction: 'coarser' });
	});
});

describe('actionLabel', () => {
	it('renders each action kind compactly', () => {
		expect(
			actionLabel({ kind: 'grind', direction: 'coarser', deltaTicks: 4, target: '2.4.4' })
		).toBe('Coarser → 2.4.4');
		expect(actionLabel({ kind: 'grind', direction: 'finer', deltaTicks: -2, target: null })).toBe(
			'2 ticks finer'
		);
		expect(actionLabel({ kind: 'yield', direction: 'increase', targetG: 39 })).toBe('Longer → 39g');
		expect(actionLabel({ kind: 'diagnose' })).toBe('Fix puck prep');
		expect(actionLabel({ kind: 'hold' })).toBe('Hold');
	});
});
