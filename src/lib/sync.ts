// Sync layer: keeps IndexedDB (local cache) in sync with Supabase (cloud).
// Local is always read-first. Writes go local; sync hooks push to cloud when authenticated.

import { supabase } from './supabase';
import { auth } from './auth.svelte';
import { db } from './db/database';
import { BrewSchema, BagSchema, type Brew, type Bag } from './db/types';
import { syncStatus } from './syncStatus.svelte';

let syncing = false;
let lastError: string | null = null;
let lastSyncAt: string | null = null;

export function getSyncStatus() {
	return { syncing, lastError, lastSyncAt };
}

function withUserId<T>(row: T, userId: string): T & { userId: string } {
	return { ...row, userId };
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

function parseBagFromServer(row: Record<string, unknown>): Bag | null {
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

function parseBrewFromServer(row: Record<string, unknown>): Brew | null {
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

// ─── Push helpers (called by repository on each write) ──────────────

export function pushBag(bag: Bag): void {
	const user = auth.user;
	if (!user) return;
	void supabase
		.from('bags')
		.upsert(withUserId(bag, user.id))
		.then(({ error }) => {
			if (error) {
				console.warn('Push bag failed:', error.message);
				lastError = error.message;
			}
		});
}

export function pushBrew(brew: Brew): void {
	const user = auth.user;
	if (!user) return;
	const row = withUserId(brew, user.id) as never;
	void supabase
		.from('brews')
		.upsert(row)
		.then(({ error }) => {
			if (error) {
				console.warn('Push brew failed:', error.message);
				lastError = error.message;
			}
		});
}

// Hard-delete helpers were removed in favor of soft-delete (deletedAt
// tombstones). See repository.deleteBag / deleteBrew. Rows are kept on the
// server so other devices can converge to the deleted state on next pull.

// ─── Full sync (push everything local, then pull all server data) ───

export async function fullSync(): Promise<void> {
	const user = auth.user;
	if (!user) return;
	if (syncing) return;
	syncing = true;
	lastError = null;
	syncStatus.syncing = true;
	syncStatus.lastError = null;

	try {
		// 1. Push all local rows up
		const [localBags, localBrews] = await Promise.all([
			db.bags.toArray(),
			db.brews.toArray()
		]);

		let pushOk = true;

		if (localBags.length > 0) {
			const payload = localBags.map((b) => withUserId(b, user.id));
			const { error } = await supabase.from('bags').upsert(payload);
			if (error) {
				console.warn('Sync: push bags failed:', error.message);
				lastError = error.message;
				pushOk = false;
			}
		}

		if (localBrews.length > 0) {
			const payload = localBrews.map((b) => withUserId(b, user.id)) as never;
			const { error } = await supabase.from('brews').upsert(payload);
			if (error) {
				console.warn('Sync: push brews failed:', error.message);
				lastError = error.message;
				pushOk = false;
			}
		}

		// 2. Pull all server rows
		const [bagsRes, brewsRes] = await Promise.all([
			supabase.from('bags').select('*'),
			supabase.from('brews').select('*')
		]);

		if (bagsRes.error) {
			console.warn('Sync: pull bags failed:', bagsRes.error.message);
			lastError = bagsRes.error.message;
			return;
		}
		if (brewsRes.error) {
			console.warn('Sync: pull brews failed:', brewsRes.error.message);
			lastError = brewsRes.error.message;
			return;
		}

		const serverBags = (bagsRes.data ?? [])
			.map((r) => parseBagFromServer(r as Record<string, unknown>))
			.filter((b): b is Bag => b !== null);
		const serverBrews = (brewsRes.data ?? [])
			.map((r) => parseBrewFromServer(r as Record<string, unknown>))
			.filter((b): b is Brew => b !== null);

		// 3. Update local cache by MERGING server data in.
		// Never clear local — that risks data loss if the server is empty/RLS-blocked.
		// Trade-off: deletes on other devices don't propagate until we add tombstones in a future pass.
		await db.transaction('rw', db.bags, db.brews, async () => {
			if (serverBags.length > 0) await db.bags.bulkPut(serverBags);
			if (serverBrews.length > 0) await db.brews.bulkPut(serverBrews);
		});

		lastSyncAt = new Date().toISOString();
		console.info(
			`[sync] pushed: ${localBags.length} bags + ${localBrews.length} brews; pulled: ${serverBags.length} bags + ${serverBrews.length} brews; pushOk=${pushOk}`
		);

		// Tell any open pages that local cache has been updated, so they can refetch.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('brewlog:synced'));
		}
	} catch (err) {
		console.error('Sync failed:', err);
		lastError = err instanceof Error ? err.message : String(err);
	} finally {
		syncing = false;
		// Mirror the final outcome into the reactive store for UI surfaces.
		syncStatus.syncing = false;
		syncStatus.lastError = lastError;
		syncStatus.lastSyncAt = lastSyncAt;
	}
}

// ─── Auth listener: trigger sync on sign-in / app load ──────────────

if (typeof window !== 'undefined') {
	supabase.auth.onAuthStateChange((event, session) => {
		if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
			void fullSync();
		}
	});
}
