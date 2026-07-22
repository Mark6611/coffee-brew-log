import { describe, it, expect } from 'vitest';
import { calibrateGrind } from './calibrate';
import type { Bag, EspressoBrew, Extraction } from '$lib/db/types';

const bag: Bag = {
	id: '00000000-0000-0000-0000-0000000000aa',
	name: 'Test bag',
	createdAt: '2026-01-01T00:00:00.000Z'
};

let seq = 0;
function shot(
	grind: string,
	opts: { extraction?: Extraction; rating?: number; at?: string } = {}
): EspressoBrew {
	seq += 1;
	return {
		id: `00000000-0000-0000-0000-0000000000${String(seq).padStart(2, '0')}`,
		method: 'espresso',
		bagId: bag.id,
		brewedAt: opts.at ?? `2026-02-${String(seq).padStart(2, '0')}T08:00:00.000Z`,
		doseGrams: 18,
		yieldGrams: 38,
		brewTimeSeconds: 28,
		grindSetting: grind,
		extraction: opts.extraction,
		rating: opts.rating
	};
}

describe('calibrateGrind', () => {
	it('withholds a calibration below two good shots', () => {
		expect(calibrateGrind(bag, [])).toBeNull();
		expect(calibrateGrind(bag, [shot('2.9.0', { extraction: 'balanced' })])).toBeNull();
		// A lone balanced shot among sour ones is still just one good shot.
		expect(
			calibrateGrind(bag, [
				shot('3.2.0', { extraction: 'sour' }),
				shot('2.9.0', { extraction: 'balanced' })
			])
		).toBeNull();
	});

	it('converges on the recency-weighted grind of balanced shots', () => {
		const cal = calibrateGrind(bag, [
			shot('2.9.0', { extraction: 'balanced', at: '2026-02-01T08:00:00.000Z' }),
			shot('2.9.2', { extraction: 'balanced', at: '2026-02-02T08:00:00.000Z' }),
			shot('2.9.4', { extraction: 'balanced', at: '2026-02-03T08:00:00.000Z' })
		]);
		expect(cal).not.toBeNull();
		// Weighted toward the most recent (2.9.4) but anchored by the older two.
		expect(cal!.grind).toBe('2.9.2');
		expect(cal!.sampleCount).toBe(3);
		expect(cal!.totalShots).toBe(3);
		expect(cal!.basis).toBe('balanced');
		expect(cal!.spreadTicks).toBe(4);
		expect(cal!.confidence).toBe('medium');
	});

	it('excludes sour/bitter shots even when highly rated', () => {
		const cal = calibrateGrind(bag, [
			shot('3.5.0', { extraction: 'bitter', rating: 5 }), // disqualified by taste
			shot('2.9.0', { extraction: 'balanced' }),
			shot('2.9.0', { extraction: 'balanced' })
		]);
		expect(cal!.grind).toBe('2.9.0'); // the bitter 3.5.0 didn't drag it coarser
		expect(cal!.sampleCount).toBe(2);
		expect(cal!.totalShots).toBe(3);
	});

	it('counts a high rating when no extraction was logged (basis: rated)', () => {
		const cal = calibrateGrind(bag, [shot('2.8.0', { rating: 5 }), shot('2.8.0', { rating: 4.5 })]);
		expect(cal!.basis).toBe('rated');
		expect(cal!.grind).toBe('2.8.0');
	});

	it('reports high confidence for many tightly-clustered good shots', () => {
		const cal = calibrateGrind(bag, [
			shot('2.9.0', { extraction: 'balanced' }),
			shot('2.9.1', { extraction: 'balanced' }),
			shot('2.9.2', { extraction: 'balanced' }),
			shot('2.9.1', { extraction: 'balanced' })
		]);
		expect(cal!.confidence).toBe('high');
		expect(cal!.spreadTicks).toBe(2);
	});

	it('ignores shots whose grind is not Lagom notation', () => {
		const cal = calibrateGrind(bag, [
			shot('medium-fine', { extraction: 'balanced' }),
			shot('2.9.0', { extraction: 'balanced' }),
			shot('2.9.0', { extraction: 'balanced' })
		]);
		expect(cal!.totalShots).toBe(2); // the non-numeric grind is excluded
		expect(cal!.grind).toBe('2.9.0');
	});
});
