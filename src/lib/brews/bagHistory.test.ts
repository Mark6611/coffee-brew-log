import { describe, it, expect } from 'vitest';
import { bagHistory, tasteLabel, HISTORY_LIMIT } from './bagHistory';
import { espressoShotsFor } from './dialin';
import { bag as makeBag, espresso, pourOver } from '$lib/test/factories';

const at = (day: number) => `2026-03-${String(day).padStart(2, '0')}T08:00:00.000Z`;

describe('tasteLabel', () => {
	it('leads with the extraction verdict and adds strength only when it is off', () => {
		expect(tasteLabel(espresso({ extraction: 'sour', balance: 'light' }))).toBe('sour · thin');
		expect(tasteLabel(espresso({ extraction: 'balanced', balance: 'balanced' }))).toBe('balanced');
		expect(tasteLabel(espresso({ extraction: 'bitter', balance: 'heavy' }))).toBe('bitter · heavy');
	});

	it('is null for an espresso with nothing logged, or only a balanced strength', () => {
		expect(tasteLabel(espresso())).toBeNull();
		expect(tasteLabel(espresso({ balance: 'balanced' }))).toBeNull();
	});

	it('treats strength as the whole verdict for a pour-over', () => {
		expect(tasteLabel(pourOver({ balance: 'balanced' }))).toBe('balanced');
		expect(tasteLabel(pourOver({ balance: 'light' }))).toBe('thin');
		expect(tasteLabel(pourOver())).toBeNull();
	});
});

describe('bagHistory', () => {
	it('lists the newest brews first, capped, numbered from the oldest', () => {
		const bag = makeBag();
		const shots = Array.from({ length: 7 }, (_, i) =>
			espresso({ bagId: bag.id, brewedAt: at(i + 1), grindSetting: `2.${i}.0` })
		);
		const h = bagHistory(bag, 'espresso', shots, [bag]);
		expect(h.total).toBe(7);
		expect(h.rows).toHaveLength(HISTORY_LIMIT);
		expect(h.rows.map((r) => r.n)).toEqual([7, 6, 5, 4, 3]);
		expect(h.rows[0].grind).toBe('2.6.0');
	});

	it('numbers shots exactly as the dial-in engine orders them, ties included', () => {
		const bag = makeBag();
		// Two shots in the same minute: order must fall back to id, as in dialin.ts.
		const shots = [
			espresso({ bagId: bag.id, brewedAt: at(2) }),
			espresso({ bagId: bag.id, brewedAt: at(1) }),
			espresso({ bagId: bag.id, brewedAt: at(2) })
		];
		const h = bagHistory(bag, 'espresso', shots, [bag]);
		const engine = espressoShotsFor(bag, shots).map((s) => s.id);
		expect([...h.rows].reverse().map((r) => r.id)).toEqual(engine);
	});

	it('keeps to one bag and one method, and skips deleted brews', () => {
		const bag = makeBag();
		const other = makeBag();
		const mine = espresso({ bagId: bag.id, brewedAt: at(3) });
		const h = bagHistory(
			bag,
			'espresso',
			[
				mine,
				espresso({ bagId: other.id, brewedAt: at(4) }),
				pourOver({ bagId: bag.id, brewedAt: at(5) }),
				espresso({ bagId: bag.id, brewedAt: at(6), deletedAt: at(7) })
			],
			[bag, other]
		);
		expect(h.rows.map((r) => r.id)).toEqual([mine.id]);
		expect(h.total).toBe(1);
	});

	it('carries the numbers a row shows, per method', () => {
		const bag = makeBag();
		const e = espresso({
			bagId: bag.id,
			doseGrams: 18,
			yieldGrams: 38,
			brewTimeSeconds: 27,
			extraction: 'sour',
			rating: 3.5
		});
		const p = pourOver({ bagId: bag.id, doseGrams: 15, waterGrams: 250, brewTimeSeconds: 168 });
		expect(bagHistory(bag, 'espresso', [e, p], [bag]).rows[0]).toMatchObject({
			doseG: 18,
			outG: 38,
			time: '27s',
			extraction: 'sour',
			taste: 'sour',
			rating: 3.5
		});
		expect(bagHistory(bag, 'pour-over', [e, p], [bag]).rows[0]).toMatchObject({
			doseG: 15,
			outG: 250,
			time: '2:48',
			extraction: undefined
		});
	});

	it('offers a sweet spot for espresso only, once two good shots exist', () => {
		const bag = makeBag();
		const one = [espresso({ bagId: bag.id, grindSetting: '2.9.0', extraction: 'balanced' })];
		expect(bagHistory(bag, 'espresso', one, [bag]).calibration).toBeNull();
		const two = [
			...one,
			espresso({ bagId: bag.id, brewedAt: at(2), grindSetting: '2.9.2', extraction: 'balanced' })
		];
		expect(bagHistory(bag, 'espresso', two, [bag]).calibration?.sampleCount).toBe(2);
		expect(bagHistory(bag, 'pour-over', two, [bag]).calibration).toBeNull();
	});

	describe('next', () => {
		it('is the settled recipe on a dialed bag, whatever the last shot says', () => {
			const recipe = { grind: '2.4.0', doseG: 18, yieldG: 38, timeS: 29, declaredAt: at(3) };
			const bag = makeBag({ dialedRecipe: recipe });
			const sour = espresso({ bagId: bag.id, extraction: 'sour' });
			expect(bagHistory(bag, 'espresso', [sour], [bag]).next).toEqual({ kind: 'dialed', recipe });
		});

		it('is the compass read of the newest shot while dialing in', () => {
			const bag = makeBag({ roastLevel: 'medium' });
			const shots = [
				espresso({ bagId: bag.id, brewedAt: at(1), grindSetting: '3.0.0', extraction: 'balanced' }),
				espresso({ bagId: bag.id, brewedAt: at(2), grindSetting: '3.0.0', extraction: 'sour' })
			];
			const next = bagHistory(bag, 'espresso', shots, [bag]).next;
			expect(next?.kind).toBe('compass');
			// Sour, in-window: the compass moves the grind finer from the NEWEST shot.
			if (next?.kind === 'compass') {
				expect(next.compass.fromTaste).toBe(true);
				expect(next.compass.action).toMatchObject({ kind: 'grind', direction: 'finer' });
			}
		});

		it('is a starting point on a bag with no brews on this method', () => {
			const bag = makeBag({ roastLevel: 'medium' });
			const next = bagHistory(bag, 'espresso', [], [bag]).next;
			expect(next).toMatchObject({ kind: 'start', suggestion: { kind: 'seed', value: '0.5.5' } });
		});

		it('is absent when it would only repeat the newest row', () => {
			const bag = makeBag({ roastLevel: 'light' });
			const brews = [pourOver({ bagId: bag.id, grindSetting: '4.2' })];
			expect(bagHistory(bag, 'pour-over', brews, [bag]).next).toBeNull();
		});

		it('is absent with no brews and no roast level to seed from', () => {
			const bag = makeBag();
			expect(bagHistory(bag, 'pour-over', [], [bag]).next).toBeNull();
		});
	});
});
