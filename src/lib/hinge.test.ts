import { describe, expect, it } from 'vitest';
import { applyHingeState, isFoldable, parseHingeState } from './hinge';

describe('parseHingeState', () => {
	it('passes through every state the native plugin sends', () => {
		for (const s of ['none', 'unknown', 'closed', 'partial', 'open'] as const) {
			expect(parseHingeState(s)).toBe(s);
		}
	});

	it('treats anything else as no hinge', () => {
		for (const v of [undefined, null, '', 'OPEN', 'fullyOpen', 1, {}]) {
			expect(parseHingeState(v)).toBe('none');
		}
	});
});

describe('isFoldable', () => {
	it('is true for any report of a hinge, in any pose', () => {
		for (const s of ['unknown', 'closed', 'partial', 'open'] as const) {
			expect(isFoldable(s)).toBe(true);
		}
		expect(isFoldable('none')).toBe(false);
	});
});

describe('applyHingeState', () => {
	it('never marks a device without a hinge', () => {
		const root = { dataset: {} as DOMStringMap };
		applyHingeState(root, 'none');
		expect('foldable' in root.dataset).toBe(false);
	});

	it('marks a hinged device and stays marked through every pose — no mid-fold flip', () => {
		const root = { dataset: {} as DOMStringMap };
		for (const s of ['closed', 'partial', 'open', 'closed', 'none', 'unknown'] as const) {
			applyHingeState(root, s);
			expect('foldable' in root.dataset).toBe(true);
		}
	});
});
