// Row shaping for Supabase sync — the pure halves of $lib/sync's push and pull
// paths. Push: withUserId() shapes a local record into the upsert row. Pull:
// parseBagFromServer()/parseBrewFromServer() normalize a PostgREST row
// (stringified numerics, offset timestamps) back into a schema-valid record.
//
// Extracted from sync.ts so these stay unit-testable: sync.ts's own import
// chain reaches auth.svelte.ts (runes) and the Dexie db instance, neither of
// which plain vitest can load — the same reason cloudSync keeps mergeRecords
// pure. Tested by syncRows.test.ts (a full push → PostgREST echo → pull
// round-trip); a Postgres-numeric-vs-Zod coercion gap here caused production
// data loss on sync pull once already.

import { BrewSchema, BagSchema, type Brew, type Bag } from './db/types';
import type { EspressoBrew, PourOverBrew } from './db/types';

// ─── Push: local row → upsert payload ────────────────────────────────
//
// Built from a FIXED column list that sends an explicit `null` for every absent
// optional field, rather than spreading the row.
//
// The spread version lost data. Clearing a field stores `undefined`
// (brews/[id]/edit: `notes.trim() || undefined`, `rating ?? undefined`,
// `balance || undefined`), JSON.stringify drops undefined-valued keys, so the
// column never entered PostgREST's ON CONFLICT DO UPDATE SET list and kept its
// OLD server value — then the next pull bulkPut it back over the cleared local
// copy. Clearing a note and syncing resurrected the note. `photo` and
// `dialedRecipe` escaped only because their UIs set an explicit null, which
// survives JSON; that was accidental, not designed.
//
// Record<…, true> makes each column set compile-time exhaustive: a new schema
// field that is missing here fails `npm run check` instead of silently never
// syncing, and a typo fails as an excess key.
//
// `updatedAt` is deliberately EXCLUDED from both sets. It is the LOCAL
// iCloud-merge clock and has no column in the Supabase tables — naming it here
// would 400 every push, and because toServerRow always names every column that
// would fail ALL pushes, not just rows that happen to carry the field.

const BAG_COLUMN_FLAGS: Record<Exclude<keyof Bag, 'updatedAt'>, true> = {
	id: true,
	name: true,
	roaster: true,
	origin: true,
	roastedAt: true,
	process: true,
	roastLevel: true,
	weightGrams: true,
	pricePaid: true,
	notes: true,
	archived: true,
	photo: true,
	createdAt: true,
	dialedRecipe: true,
	deletedAt: true
};

const BREW_COLUMN_FLAGS: Record<
	Exclude<keyof EspressoBrew | keyof PourOverBrew, 'updatedAt'>,
	true
> = {
	id: true,
	method: true,
	brewedAt: true,
	coffeeName: true,
	roaster: true,
	bagId: true,
	doseGrams: true,
	brewTimeSeconds: true,
	grindSetting: true,
	notes: true,
	rating: true,
	balance: true,
	isFavorite: true,
	photo: true,
	deletedAt: true,
	published: true,
	publishedAt: true,
	blogTitle: true,
	blogBody: true,
	bagSnapshot: true,
	yieldGrams: true,
	extraction: true,
	waterGrams: true,
	waterTempC: true
};

export const BAG_COLUMNS = Object.keys(BAG_COLUMN_FLAGS);
export const BREW_COLUMNS = Object.keys(BREW_COLUMN_FLAGS);

function toServerRow(
	row: Record<string, unknown>,
	columns: string[],
	userId: string
): Record<string, unknown> {
	const payload: Record<string, unknown> = { userId };
	for (const column of columns) {
		payload[column] = row[column] === undefined ? null : row[column];
	}
	return payload;
}

export function bagToServerRow(bag: Bag, userId: string): Record<string, unknown> {
	return toServerRow(bag as unknown as Record<string, unknown>, BAG_COLUMNS, userId);
}

export function brewToServerRow(brew: Brew, userId: string): Record<string, unknown> {
	return toServerRow(brew as unknown as Record<string, unknown>, BREW_COLUMNS, userId);
}

const BAG_NUMERIC_KEYS = new Set(['weightGrams', 'pricePaid']);
const BAG_TIMESTAMP_KEYS = new Set(['createdAt', 'deletedAt']);
const BREW_NUMERIC_KEYS = new Set([
	'doseGrams',
	'brewTimeSeconds',
	'yieldGrams',
	'waterGrams',
	'waterTempC',
	'rating'
]);
const BREW_TIMESTAMP_KEYS = new Set(['brewedAt', 'deletedAt', 'publishedAt']);

function normalizeFromServer(
	row: Record<string, unknown>,
	numericKeys: Set<string>,
	timestampKeys: Set<string>
): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (key === 'userId') continue;
		if (value === null) continue;
		// Postgres returns numeric columns as strings. Coerce them back to numbers.
		if (numericKeys.has(key) && typeof value === 'string') {
			const num = Number(value);
			if (!Number.isNaN(num)) {
				cleaned[key] = num;
				continue;
			}
		}
		// PostgREST returns timestamps with offset (e.g. "2025-01-15T14:32:00+00:00").
		// Zod's z.string().datetime() requires UTC "Z" suffix, so normalize here.
		if (timestampKeys.has(key) && typeof value === 'string') {
			const date = new Date(value);
			if (!Number.isNaN(date.getTime())) {
				cleaned[key] = date.toISOString();
				continue;
			}
		}
		cleaned[key] = value;
	}
	return cleaned;
}

export function parseBagFromServer(row: Record<string, unknown>): Bag | null {
	const cleaned = normalizeFromServer(row, BAG_NUMERIC_KEYS, BAG_TIMESTAMP_KEYS);
	const result = BagSchema.safeParse(cleaned);
	if (!result.success) {
		const issue = result.error.issues[0];
		console.warn(
			`[sync] Bag from server failed at "${issue?.path.join('.')}": ${issue?.message}`,
			cleaned
		);
		return null;
	}
	return result.data;
}

export function parseBrewFromServer(row: Record<string, unknown>): Brew | null {
	const cleaned = normalizeFromServer(row, BREW_NUMERIC_KEYS, BREW_TIMESTAMP_KEYS);
	const result = BrewSchema.safeParse(cleaned);
	if (!result.success) {
		const issue = result.error.issues[0];
		console.warn(
			`[sync] Brew from server failed at "${issue?.path.join('.')}": ${issue?.message}`,
			cleaned
		);
		return null;
	}
	return result.data;
}
