import { describe, it, expect } from 'vitest';
import { ShotTracker } from './shot';

// Helper: feed a linear pour then a plateau, at a fixed sample rate.
function feed(
	tracker: ShotTracker,
	segments: { toG: number; secs: number }[],
	hz = 10
): { justStarted: number; justEnded: number } {
	let t = 0;
	let w = 0;
	let started = 0;
	let ended = 0;
	const dt = 1000 / hz;
	for (const seg of segments) {
		const steps = Math.round(seg.secs * hz);
		const from = w;
		for (let i = 1; i <= steps; i++) {
			t += dt;
			w = from + ((seg.toG - from) * i) / steps;
			const r = tracker.push(w, t);
			if (r.justStarted) started++;
			if (r.justEnded) ended++;
		}
	}
	return { justStarted: started, justEnded: ended };
}

describe('ShotTracker — start detection', () => {
	it('fires justStarted exactly once when weight crosses the threshold', () => {
		const t = new ShotTracker({ method: 'espresso', doseG: 18, autoStop: false });
		const r = feed(t, [{ toG: 36, secs: 4 }]);
		expect(r.justStarted).toBe(1);
		expect(t.started).toBe(true);
	});
	it('stays unstarted while weight sits below the threshold', () => {
		const t = new ShotTracker({ method: 'espresso', doseG: 18, firstWeightThreshold: 0.5 });
		t.push(0.0, 100);
		t.push(0.2, 200);
		expect(t.started).toBe(false);
	});
});

describe('ShotTracker — live readouts', () => {
	it('reports yield and a positive flow rate mid-pour', () => {
		const t = new ShotTracker({ method: 'espresso', doseG: 18, autoStop: false });
		feed(t, [{ toG: 36, secs: 4 }]); // 9 g/s target
		expect(t.yieldG).toBeCloseTo(36, 0);
		expect(t.flowRate).toBeGreaterThan(5);
	});
	it('smooths — EMA lags a step change', () => {
		const t = new ShotTracker({ method: 'pour-over', doseG: 18 });
		t.push(0, 0);
		t.push(100, 100);
		expect(t.smoothedG).toBeLessThan(100); // 0*0.7 + 100*0.3 = 30
		expect(t.smoothedG).toBeCloseTo(30, 0);
	});
});

describe('ShotTracker — espresso auto-stop', () => {
	const opts = {
		method: 'espresso' as const,
		doseG: 18,
		minSamplesBeforeStop: 20,
		minSecondsBeforeStop: 2,
		armSkipSamples: 3
	};

	it('ends when flow stalls after reaching ≥ 1:1', () => {
		const t = new ShotTracker(opts);
		// Pour to 36 g over 4 s (armed past 18 g), then flat for 2 s.
		const r = feed(t, [{ toG: 36, secs: 4 }, { toG: 36, secs: 2 }]);
		expect(r.justEnded).toBe(1);
		expect(t.ended).toBe(true);
		expect(t.yieldG).toBeCloseTo(36, 0);
	});
	it('does NOT end if yield never reaches the dose (never armed)', () => {
		const t = new ShotTracker(opts);
		// Only ever reaches 10 g (< 18 g dose), then plateaus.
		const r = feed(t, [{ toG: 10, secs: 4 }, { toG: 10, secs: 3 }]);
		expect(r.justEnded).toBe(0);
		expect(t.ended).toBe(false);
	});
	it('does NOT end during a mid-pour pre-infusion pause before arming', () => {
		const t = new ShotTracker(opts);
		// Pause at 8 g (below dose) for 3 s — pre-infusion, must not stop.
		const r = feed(t, [{ toG: 8, secs: 2 }, { toG: 8, secs: 3 }, { toG: 36, secs: 3 }]);
		// It should only end during the FINAL plateau, which we didn't add, so 0.
		expect(r.justEnded).toBe(0);
	});
	it('respects the minimum-time gate', () => {
		const t = new ShotTracker({ ...opts, minSecondsBeforeStop: 30 });
		const r = feed(t, [{ toG: 36, secs: 4 }, { toG: 36, secs: 3 }]);
		expect(r.justEnded).toBe(0); // stalled, but 30 s gate not met
	});
	it('pour-over never auto-stops even when flow stalls', () => {
		const t = new ShotTracker({ ...opts, method: 'pour-over' });
		const r = feed(t, [{ toG: 300, secs: 4 }, { toG: 300, secs: 3 }]);
		expect(r.justEnded).toBe(0);
	});
});
