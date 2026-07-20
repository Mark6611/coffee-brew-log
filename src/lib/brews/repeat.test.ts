import { describe, it, expect } from 'vitest';
import { brewAgainDraft } from './repeat';
import { espresso, pourOver } from '$lib/test/factories';

// This file also serves as a regression guard: repeat.ts must stay importable
// under vitest, which only aliases $lib (see vitest.config.ts). A `$app/*`
// runtime import here fails the whole suite at collection time.

describe('brewAgainDraft', () => {
	it('carries the recipe over', () => {
		const draft = brewAgainDraft(
			espresso({ doseGrams: 18.5, yieldGrams: 37, brewTimeSeconds: 29, grindSetting: '0.5.3' })
		);
		expect(draft.method).toBe('espresso');
		expect(draft.doseGrams).toBe(18.5);
		expect(draft.yieldGrams).toBe(37);
		expect(draft.brewTimeSeconds).toBe(29);
		// grindSetting is a string — grinders use different scales (see CLAUDE.md).
		expect(draft.grindSetting).toBe('0.5.3');
	});

	it('clears the taste verdicts so the next cup is judged from scratch', () => {
		const draft = brewAgainDraft(espresso({ rating: 5, balance: 'balanced' }));
		expect(draft.rating).toBeNull();
		expect(draft.balance).toBe('');
	});

	it('keeps only the fields that belong to the method', () => {
		const esp = brewAgainDraft(espresso());
		expect(esp.waterGrams).toBeNull();
		expect(esp.brewMinutes).toBeNull();

		const po = brewAgainDraft(pourOver({ waterGrams: 320, brewTimeSeconds: 210 }));
		expect(po.yieldGrams).toBeNull();
		expect(po.waterGrams).toBe(320);
		// 210s split into 3:30 for the two-field pour-over time input.
		expect(po.brewMinutes).toBe(3);
		expect(po.brewSecondsPart).toBe(30);
	});

	it('stamps savedAt, without which the new-brew form discards the draft', () => {
		expect(brewAgainDraft(espresso()).savedAt).toBeGreaterThan(0);
	});
});
