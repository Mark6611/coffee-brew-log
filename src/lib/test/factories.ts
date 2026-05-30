// Test data factories. Deterministic ids (counter, not random) so snapshots /
// ordering assertions stay stable. Only imported from *.test.ts files.

import type { Bag, EspressoBrew, PourOverBrew } from '$lib/db/types';

let counter = 0;
function uuid(): string {
	counter += 1;
	return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

export function espresso(over: Partial<EspressoBrew> = {}): EspressoBrew {
	return {
		id: uuid(),
		method: 'espresso',
		brewedAt: '2026-05-01T08:00:00.000Z',
		doseGrams: 18,
		yieldGrams: 36,
		brewTimeSeconds: 28,
		grindSetting: '2.5',
		...over
	};
}

export function pourOver(over: Partial<PourOverBrew> = {}): PourOverBrew {
	return {
		id: uuid(),
		method: 'pour-over',
		brewedAt: '2026-05-01T08:00:00.000Z',
		doseGrams: 20,
		waterGrams: 320,
		brewTimeSeconds: 210,
		grindSetting: '6.0',
		...over
	};
}

export function bag(over: Partial<Bag> = {}): Bag {
	return {
		id: uuid(),
		name: 'Test Bag',
		createdAt: '2026-05-01T08:00:00.000Z',
		...over
	};
}
