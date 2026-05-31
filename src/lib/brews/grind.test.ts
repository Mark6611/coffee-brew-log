import { describe, it, expect } from 'vitest';
import { resolveGrindSuggestion, parseGrind, median, grinderFor } from './grind';
import { bag, pourOver, espresso } from '$lib/test/factories';

describe('parseGrind', () => {
	it('extracts the numeric part of a free-text grind', () => {
		expect(parseGrind('Ode 7.5')).toBe(7.5);
		expect(parseGrind('Lagom 2.4')).toBe(2.4);
		expect(parseGrind('7')).toBe(7);
	});
	it('returns null when there is no number', () => {
		expect(parseGrind('fine')).toBeNull();
		expect(parseGrind('')).toBeNull();
		expect(parseGrind(undefined)).toBeNull();
	});
});

describe('median', () => {
	it('handles odd, even, single, and empty', () => {
		expect(median([6, 7, 8])).toBe(7);
		expect(median([6, 8])).toBe(7);
		expect(median([7])).toBe(7);
		expect(median([])).toBeNull();
	});
});

describe('grinderFor', () => {
	it('maps method to the owner’s grinder', () => {
		expect(grinderFor('pour-over')).toBe('Fellow Ode Gen 2');
		expect(grinderFor('espresso')).toBe('Lagom Casa');
	});
});

describe('resolveGrindSuggestion — precedence', () => {
	it('RULE 1: a prior brew of THIS bag prefills (and wins over history)', () => {
		const target = bag({ roastLevel: 'dark' });
		const [d1, d2, d3] = [bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' })];
		const brews = [
			pourOver({ bagId: target.id, grindSetting: 'Ode 9', brewedAt: '2026-05-10T08:00:00.000Z' }),
			pourOver({ bagId: d1.id, grindSetting: 'Ode 6' }),
			pourOver({ bagId: d2.id, grindSetting: 'Ode 6' }),
			pourOver({ bagId: d3.id, grindSetting: 'Ode 6' })
		];
		const r = resolveGrindSuggestion(target, 'pour-over', brews, [target, d1, d2, d3]);
		expect(r).toEqual({ kind: 'prefill', value: 'Ode 9', grinder: 'Fellow Ode Gen 2' });
	});

	it('RULE 1: picks the newest same-bag brew', () => {
		const target = bag({ roastLevel: 'dark' });
		const brews = [
			pourOver({ bagId: target.id, grindSetting: 'Ode 7', brewedAt: '2026-05-01T08:00:00.000Z' }),
			pourOver({ bagId: target.id, grindSetting: 'Ode 8', brewedAt: '2026-05-09T08:00:00.000Z' })
		];
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target])?.value).toBe('Ode 8');
	});

	it('RULE 1: ignores a deleted same-bag brew (falls through to seed)', () => {
		const target = bag({ roastLevel: 'dark' });
		const brews = [
			pourOver({ bagId: target.id, grindSetting: 'Ode 9', deletedAt: '2026-05-05T08:00:00.000Z' })
		];
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target])).toEqual({
			kind: 'seed',
			value: 'Ode 6',
			grinder: 'Fellow Ode Gen 2'
		});
	});

	it('RULE 2: ≥3 brews at this roast level × method → history median', () => {
		const target = bag({ roastLevel: 'dark' });
		const [d1, d2, d3] = [bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' })];
		const brews = [
			pourOver({ bagId: d1.id, grindSetting: 'Ode 6' }),
			pourOver({ bagId: d2.id, grindSetting: 'Ode 6.5' }),
			pourOver({ bagId: d3.id, grindSetting: 'Ode 7' })
		];
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target, d1, d2, d3])).toEqual({
			kind: 'history',
			value: 'Ode 6.5',
			grinder: 'Fellow Ode Gen 2',
			brews: 3
		});
	});

	it('RULE 2: history is scoped to the method (espresso brews don’t count for pour-over)', () => {
		const target = bag({ roastLevel: 'dark' });
		const [d1, d2, d3] = [bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' })];
		const brews = [
			espresso({ bagId: d1.id, grindSetting: 'Lagom 2' }),
			espresso({ bagId: d2.id, grindSetting: 'Lagom 2' }),
			espresso({ bagId: d3.id, grindSetting: 'Lagom 2' })
		];
		// No pour-over peers → falls to the pour-over seed.
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target, d1, d2, d3])?.kind).toBe('seed');
	});

	it('RULE 3: roast level set but <3 peers → seed table', () => {
		expect(resolveGrindSuggestion(bag({ roastLevel: 'light' }), 'espresso', [], [])).toEqual({
			kind: 'seed',
			value: 'Lagom 2.6',
			grinder: 'Lagom Casa'
		});
	});

	it('RULE 4: no same-bag history and no roast level → silent (null)', () => {
		const target = bag({});
		expect(resolveGrindSuggestion(target, 'pour-over', [], [target])).toBeNull();
	});
});
