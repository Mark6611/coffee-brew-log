import { describe, it, expect } from 'vitest';
import { resolveGrindSuggestion, parseGrind, grinderFor } from './grind';
import { bag, pourOver, espresso } from '$lib/test/factories';

describe('parseGrind', () => {
	it('extracts the leading numeric part of a free-text grind', () => {
		expect(parseGrind('4.2')).toBe(4.2);
		expect(parseGrind('Ode 7.5')).toBe(7.5);
		// Lagom rotation.number.tick — leading "0.6" is enough to rank/sort.
		expect(parseGrind('0.6.5')).toBe(0.6);
	});
	it('returns null when there is no number', () => {
		expect(parseGrind('fine')).toBeNull();
		expect(parseGrind('')).toBeNull();
		expect(parseGrind(undefined)).toBeNull();
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
			pourOver({ bagId: target.id, grindSetting: '4.2', deletedAt: '2026-05-05T08:00:00.000Z' })
		];
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target])).toEqual({
			kind: 'seed',
			value: '4.5',
			grinder: 'Fellow Ode Gen 2'
		});
	});

	it('RULE 2: ≥3 brews at this roast level × method → median of real logged values', () => {
		const target = bag({ roastLevel: 'dark' });
		const [d1, d2, d3] = [bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' })];
		const brews = [
			pourOver({ bagId: d1.id, grindSetting: '4.0' }),
			pourOver({ bagId: d2.id, grindSetting: '4.2' }),
			pourOver({ bagId: d3.id, grindSetting: '4.5' })
		];
		expect(resolveGrindSuggestion(target, 'pour-over', brews, [target, d1, d2, d3])).toEqual({
			kind: 'history',
			value: '4.2',
			grinder: 'Fellow Ode Gen 2',
			brews: 3
		});
	});

	it('RULE 2: preserves the Lagom rotation.number.tick notation verbatim', () => {
		const target = bag({ roastLevel: 'dark' });
		const [d1, d2, d3] = [bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' }), bag({ roastLevel: 'dark' })];
		const brews = [
			espresso({ bagId: d1.id, grindSetting: '0.7.2' }),
			espresso({ bagId: d2.id, grindSetting: '0.7.5' }),
			espresso({ bagId: d3.id, grindSetting: '0.7.8' })
		];
		const r = resolveGrindSuggestion(target, 'espresso', brews, [target, d1, d2, d3]);
		expect(r?.kind).toBe('history');
		expect(r?.value).toBe('0.7.5'); // a real logged value, tick intact
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
			value: '0.4.5',
			grinder: 'Lagom Casa'
		});
	});

	it('RULE 4: no same-bag history and no roast level → silent (null)', () => {
		const target = bag({});
		expect(resolveGrindSuggestion(target, 'pour-over', [], [target])).toBeNull();
	});
});
