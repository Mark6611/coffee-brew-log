// Pure shot-tracking brain for scale-assisted brewing. Ingests raw weight
// samples (grams, timestamp) and answers: has the pour started (first weight),
// what's the smoothed weight + flow rate, and — for espresso — has the shot
// stalled (auto-stop). No BLE, no Svelte; unit-tested against synthetic
// sample streams. Algorithms mirror Beanconqueror's (EMA α=0.3, ~1s flow
// window, arm-at-1:1-then-stop-on-low-flow), reimplemented cleanly.

export interface ShotOptions {
	/** espresso arms auto-stop; pour-over just tracks weight/flow */
	method: 'espresso' | 'pour-over';
	/** dose grams — auto-stop won't arm until yield ≥ dose (≥ 1:1) */
	doseG: number;
	firstWeightThreshold: number; // g, default 0.1
	autoStop: boolean;
	stopFlowThreshold: number; // g/s, default 0.1
	minSamplesBeforeStop: number; // default 50
	minSecondsBeforeStop: number; // default 5
	armSkipSamples: number; // ignore the first N samples when arming, default 15
}

export const DEFAULT_SHOT_OPTIONS: Omit<ShotOptions, 'method' | 'doseG'> = {
	firstWeightThreshold: 0.1,
	autoStop: true,
	stopFlowThreshold: 0.1,
	minSamplesBeforeStop: 50,
	minSecondsBeforeStop: 5,
	armSkipSamples: 15
};

interface Sample {
	t: number; // ms
	w: number; // raw grams
	s: number; // EMA-smoothed grams
}

const EMA_ALPHA = 0.3;
const round1 = (n: number) => Math.round(n * 10) / 10;

export class ShotTracker {
	private samples: Sample[] = [];
	private prevSmoothed = 0;
	private _started = false;
	private _ended = false;
	private startT = 0;
	private armed = false;
	private readonly o: ShotOptions;

	constructor(opts: Partial<ShotOptions> & { method: ShotOptions['method']; doseG: number }) {
		this.o = { ...DEFAULT_SHOT_OPTIONS, ...opts };
	}

	/** Feed one weight reading. Returns the transitions the caller should act on. */
	push(rawGrams: number, tMs: number): { justStarted: boolean; justEnded: boolean } {
		const smoothed =
			this.samples.length === 0
				? rawGrams
				: rawGrams * EMA_ALPHA + this.prevSmoothed * (1 - EMA_ALPHA);
		this.prevSmoothed = smoothed;
		this.samples.push({ t: tMs, w: rawGrams, s: smoothed });

		let justStarted = false;
		let justEnded = false;

		if (!this._started && rawGrams >= this.o.firstWeightThreshold) {
			this._started = true;
			this.startT = tMs;
			justStarted = true;
		}

		// Arm once the shot has reached ~1:1 (yield ≥ dose), skipping the noisy
		// opening samples (slow tare, pressure-start jitter).
		if (this._started && !this.armed) {
			const minWeight = Math.max(this.o.doseG, 5);
			if (this.samples.slice(this.o.armSkipSamples).some((s) => s.w >= minWeight)) {
				this.armed = true;
			}
		}

		if (
			this._started &&
			!this._ended &&
			this.o.autoStop &&
			this.o.method === 'espresso' &&
			this.armed &&
			this.samples.length >= this.o.minSamplesBeforeStop &&
			(tMs - this.startT) / 1000 >= this.o.minSecondsBeforeStop &&
			this.flowRateAt(tMs) <= this.o.stopFlowThreshold
		) {
			this._ended = true;
			justEnded = true;
		}

		return { justStarted, justEnded };
	}

	/** g/s, differentiating smoothed weight over the last ~1 s of samples. */
	private flowRateAt(tMs: number): number {
		const windowStart = tMs - 1000;
		let ref = this.samples[0];
		for (let i = this.samples.length - 1; i >= 0; i--) {
			if (this.samples[i].t <= windowStart) {
				ref = this.samples[i];
				break;
			}
			ref = this.samples[i];
		}
		const last = this.samples[this.samples.length - 1];
		const dt = (last.t - ref.t) / 1000;
		if (dt <= 0) return 0;
		const flow = (last.s - ref.s) / dt;
		return Number.isFinite(flow) ? flow : 0;
	}

	get started(): boolean {
		return this._started;
	}
	get ended(): boolean {
		return this._ended;
	}
	/** Current stable yield in grams (rounded 0.1). */
	get yieldG(): number {
		const last = this.samples[this.samples.length - 1];
		return last ? round1(Math.max(0, last.w)) : 0;
	}
	/** Live smoothed weight (rounded 0.1) — for the on-screen readout. */
	get smoothedG(): number {
		return round1(this.prevSmoothed);
	}
	get flowRate(): number {
		const last = this.samples[this.samples.length - 1];
		return last ? round1(this.flowRateAt(last.t)) : 0;
	}
	/** Seconds since the pour started (0 before first weight). */
	get elapsedS(): number {
		if (!this._started) return 0;
		const last = this.samples[this.samples.length - 1];
		return (last.t - this.startT) / 1000;
	}
}
