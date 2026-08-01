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

// Shape a local row for the Supabase upsert: attach the owning user, and strip
// `updatedAt` — that field is the LOCAL iCloud-merge clock and has no column in
// the Supabase tables (pushing it would 400 the whole upsert).
export function withUserId<T extends { updatedAt?: string }>(row: T, userId: string) {
	const { updatedAt: _localOnly, ...rest } = row;
	return { ...rest, userId };
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
