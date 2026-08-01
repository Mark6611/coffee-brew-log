// Round-trip guard for Supabase sync: push shape → PostgREST echo → pull parse.
//
// Postgres `numeric` columns come back from PostgREST as STRINGS, and
// `timestamptz` comes back with a "+00:00" offset instead of "Z". A coercion
// gap between that shape and the Zod schemas made the pull path drop every
// row once — production data loss. This test runs the app's REAL functions
// (bagToServerRow/brewToServerRow → simulated PostgREST serialization →
// parseBagFromServer /
// parseBrewFromServer) and asserts zero dropped rows with numerics restored
// to numbers.
//
// Run: npm test  (vitest picks up src/**/*.test.ts)

import { describe, expect, it } from 'vitest';
import {
	bagToServerRow,
	brewToServerRow,
	parseBagFromServer,
	parseBrewFromServer
} from '$lib/syncRows';
import { bag, espresso, pourOver } from '$lib/test/factories';

const USER_ID = '99999999-9999-4999-8999-999999999999';

// The shared factories mint counter UUIDs with zeroed version/variant bits,
// which Zod v4's z.string().uuid() (RFC 4122-strict) rejects — fine for the
// compute tests, fatal here where rows go through the real schemas. Pin
// valid-v4-shaped deterministic ids instead.
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// What PostgREST does to an upserted row on the way back down:
//  - every `numeric` column serializes as a string ("18.5", not 18.5);
//  - every `timestamptz` echoes with an explicit offset, not the "Z" suffix;
//  - JSONB columns (dialedRecipe) keep real JSON numbers untouched.
function postgrestEcho(row: Record<string, unknown>): Record<string, unknown> {
	const echoed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (typeof value === 'number') {
			echoed[key] = String(value);
		} else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*Z$/.test(value)) {
			echoed[key] = value.replace(/Z$/, '+00:00');
		} else {
			echoed[key] = value;
		}
	}
	return echoed;
}

describe('sync round-trip (push shape → PostgREST echo → pull parse)', () => {
	const bags = [
		bag({
			id: ID(1),
			weightGrams: 250,
			pricePaid: 18.5,
			roaster: 'Roast Test',
			archived: false,
			updatedAt: '2026-05-02T09:00:00.000Z', // local-only — must be stripped on push
			dialedRecipe: {
				grind: '2.5',
				doseG: 18,
				yieldG: 36,
				timeS: 28,
				tempC: 93,
				declaredAt: '2026-05-01T08:00:00.000Z'
			}
		})
	];
	const brews = [
		espresso({
			id: ID(2),
			doseGrams: 18,
			yieldGrams: 36.5,
			brewTimeSeconds: 28,
			rating: 4.5,
			waterTempC: 93.5,
			updatedAt: '2026-05-02T09:00:00.000Z'
		}),
		pourOver({
			id: ID(3),
			doseGrams: 20,
			waterGrams: 320,
			waterTempC: 96,
			rating: 4,
			deletedAt: '2026-05-03T10:00:00.000Z' // tombstones must round-trip too
		})
	];

	const pulledBags = bags
		.map((b) => postgrestEcho(bagToServerRow(b, USER_ID)))
		.map(parseBagFromServer)
		.filter((b) => b !== null);
	const pulledBrews = brews
		.map((b) => postgrestEcho(brewToServerRow(b, USER_ID)))
		.map(parseBrewFromServer)
		.filter((b) => b !== null);

	it('drops zero rows', () => {
		expect(pulledBags).toHaveLength(bags.length);
		expect(pulledBrews).toHaveLength(brews.length);
	});

	it('restores stringified numeric columns to numbers', () => {
		const [pulledBag] = pulledBags;
		expect(pulledBag.weightGrams).toBe(250);
		expect(pulledBag.pricePaid).toBe(18.5);

		const [esp, po] = pulledBrews;
		if (esp.method !== 'espresso') throw new Error('espresso lost its method discriminant');
		expect(esp.doseGrams).toBe(18);
		expect(esp.yieldGrams).toBe(36.5);
		expect(esp.brewTimeSeconds).toBe(28);
		expect(esp.rating).toBe(4.5);
		expect(esp.waterTempC).toBe(93.5);

		if (po.method !== 'pour-over') throw new Error('pour-over lost its method discriminant');
		expect(po.waterGrams).toBe(320);
		expect(po.waterTempC).toBe(96);
		expect(po.rating).toBe(4);
	});

	it('keeps grindSetting a string (grinders use different scales)', () => {
		for (const brew of pulledBrews) expect(typeof brew.grindSetting).toBe('string');
	});

	it('normalizes offset timestamps back to Z-suffixed ISO', () => {
		expect(pulledBags[0].createdAt).toBe(bags[0].createdAt);
		expect(pulledBrews[0].brewedAt).toBe(brews[0].brewedAt);
		expect(pulledBrews[1].deletedAt).toBe(brews[1].deletedAt);
	});

	it('keeps JSONB numerics as numbers through the round trip', () => {
		expect(pulledBags[0].dialedRecipe?.doseG).toBe(18);
		expect(pulledBags[0].dialedRecipe?.tempC).toBe(93);
	});

	it('strips the server-side userId and the local-only updatedAt', () => {
		expect(pulledBags[0]).not.toHaveProperty('userId');
		expect(pulledBags[0]).not.toHaveProperty('updatedAt');
		expect(pulledBrews[0]).not.toHaveProperty('userId');
		expect(pulledBrews[0]).not.toHaveProperty('updatedAt');
	});
});

// The bug this column list exists to prevent, pinned at the wire level.
//
// Clearing an optional field stores `undefined` (brews/[id]/edit does
// `notes.trim() || undefined`, `rating ?? undefined`, `balance || undefined`).
// The old spread-based push then lost the key to JSON.stringify, PostgREST left
// the column at its previous value, and the next pull wrote the stale value
// back over the cleared local copy — a cleared note came back.
//
// Every assertion goes through JSON.parse(JSON.stringify(...)) on purpose: on
// the raw object `undefined` and `null` both "exist", and an accidental
// undefined would pass. Only the serialized body proves what reaches the server.
describe('push payload: cleared fields serialize as explicit null', () => {
	const wire = (row: Record<string, unknown>) => JSON.parse(JSON.stringify(row));

	it('sends null for a brew whose optional fields were cleared', () => {
		const cleared = brewToServerRow(
			espresso({
				id: ID(900),
				notes: undefined,
				rating: undefined,
				balance: undefined,
				bagId: undefined
			}),
			USER_ID
		);
		const body = wire(cleared);
		for (const key of ['notes', 'rating', 'balance', 'bagId']) {
			expect(Object.hasOwn(body, key), `${key} must survive JSON as an explicit null`).toBe(true);
			expect(body[key]).toBeNull();
		}
	});

	it('sends null for a bag whose optional fields were cleared', () => {
		const body = wire(
			bagToServerRow(bag({ id: ID(901), notes: undefined, roastedAt: undefined }), USER_ID)
		);
		for (const key of ['notes', 'roastedAt']) {
			expect(Object.hasOwn(body, key)).toBe(true);
			expect(body[key]).toBeNull();
		}
	});

	// deleteBag unlinks by dropping the key entirely (`const { bagId, ...rest }`),
	// so the unlink only reaches the server because a missing key also becomes null.
	it('sends bagId: null when the key was removed outright, not just undefined', () => {
		const { bagId: _dropped, ...unlinked } = espresso({ id: ID(902), bagId: ID(1) });
		const body = wire(brewToServerRow(unlinked as never, USER_ID));
		expect(body.bagId).toBeNull();
	});

	// updatedAt is the LOCAL iCloud clock with no Supabase column. If it ever
	// entered the column list every push would 400, because toServerRow names
	// every column on every row.
	it('never sends updatedAt', () => {
		expect(
			Object.hasOwn(wire(brewToServerRow(espresso({ id: ID(903) }), USER_ID)), 'updatedAt')
		).toBe(false);
		expect(Object.hasOwn(wire(bagToServerRow(bag({ id: ID(904) }), USER_ID)), 'updatedAt')).toBe(
			false
		);
	});
});
