// Sync layer: keeps IndexedDB (local cache) in sync with Supabase (cloud).
// Local is always read-first. Writes go local; sync hooks push to cloud when authenticated.

import { supabase } from './supabase';
import { isNative } from './native';
import { auth } from './auth.svelte';
import { db } from './db/database';
import { BrewSchema, BagSchema, type Brew, type Bag } from './db/types';
import { syncStatus } from './syncStatus.svelte';
// Row shaping (push upsert shape + pull normalization/validation) lives in
// syncRows.ts so it stays import-light and unit-tested — see syncRows.test.ts.
import {
	bagToServerRow,
	brewToServerRow,
	parseBagFromServer,
	parseBrewFromServer
} from './syncRows';

// `syncStatus` (a rune store) is the single source of truth for sync state.
// getSyncStatus() exposes it to non-reactive callers; components read the
// store directly.
export function getSyncStatus() {
	return syncStatus;
}

// ─── Push helpers (called by repository on each write) ──────────────

export function pushBag(bag: Bag): void {
	if (isNative) return; // native syncs via iCloud (see $lib/cloudSync), never Supabase
	const user = auth.user;
	if (!user) return;
	void supabase
		.from('bags')
		.upsert(bagToServerRow(bag, user.id))
		.then(({ error }) => {
			if (error) {
				console.warn('Push bag failed:', error.message);
				syncStatus.lastError = error.message;
			}
		});
}

export function pushBrew(brew: Brew): void {
	if (isNative) return; // native syncs via iCloud, never Supabase
	const user = auth.user;
	if (!user) return;
	const row = brewToServerRow(brew, user.id) as never;
	void supabase
		.from('brews')
		.upsert(row)
		.then(({ error }) => {
			if (error) {
				console.warn('Push brew failed:', error.message);
				syncStatus.lastError = error.message;
			}
		});
}

// Hard-delete helpers were removed in favor of soft-delete (deletedAt
// tombstones). See repository.deleteBag / deleteBrew. Rows are kept on the
// server so other devices can converge to the deleted state on next pull.

/**
 * Wipe: tombstone EVERY current row on the server (stamp deletedAt + upsert), the
 * same mechanism as a single delete. A plain hard-delete is silently undone the
 * moment another signed-in device runs fullSync — that blind-pushes its full local
 * copy back and the wiping device re-pulls it. This is awaited and THROWS on
 * failure so the caller never reports a wipe that didn't actually reach the server.
 */
export async function pushWipeTombstones(bags: Bag[], brews: Brew[]): Promise<void> {
	if (isNative) return; // native has no server copy to wipe
	const user = auth.user;
	if (!user) return; // signed out ⇒ no server data of ours to wipe
	const now = new Date().toISOString();
	const bagRows = bags
		.filter((b) => !b.deletedAt)
		.map((b) => bagToServerRow(BagSchema.parse({ ...b, deletedAt: now }), user.id));
	const brewRows = brews
		.filter((b) => !b.deletedAt)
		.map((b) => brewToServerRow(BrewSchema.parse({ ...b, deletedAt: now }), user.id));
	if (bagRows.length) {
		const { error } = await supabase.from('bags').upsert(bagRows as never);
		if (error) throw new Error(error.message);
	}
	if (brewRows.length) {
		const { error } = await supabase.from('brews').upsert(brewRows as never);
		if (error) throw new Error(error.message);
	}
}

// ─── Full sync (push everything local, then pull all server data) ───

// Push in small batches. Brew/bag rows now carry an inline base64 photo (up to
// a few hundred KB each), so a single upsert of the whole library can exceed the
// request-body limit and fail wholesale. Chunking keeps each request small and
// lets most data through even if one batch fails.
const PUSH_CHUNK = 15;
async function upsertChunked(
	table: 'bags' | 'brews',
	rows: Record<string, unknown>[]
): Promise<boolean> {
	for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
		const batch = rows.slice(i, i + PUSH_CHUNK);
		const { error } = await supabase.from(table).upsert(batch as never);
		if (error) {
			console.warn(`Sync: push ${table} batch @${i} failed:`, error.message);
			syncStatus.lastError = error.message;
			return false;
		}
	}
	return true;
}

export async function fullSync(): Promise<void> {
	if (isNative) return; // native syncs via iCloud, never Supabase
	const user = auth.user;
	if (!user) return;
	if (syncStatus.syncing) return;
	syncStatus.syncing = true;
	syncStatus.lastError = null;

	try {
		// 1. Push all local rows up
		const [localBags, localBrews] = await Promise.all([db.bags.toArray(), db.brews.toArray()]);

		let pushOk = true;

		if (localBags.length > 0) {
			const ok = await upsertChunked(
				'bags',
				localBags.map((b) => bagToServerRow(b, user.id))
			);
			pushOk = pushOk && ok;
		}

		if (localBrews.length > 0) {
			const ok = await upsertChunked(
				'brews',
				localBrews.map((b) => brewToServerRow(b, user.id))
			);
			pushOk = pushOk && ok;
		}

		// A failed push means local still holds edits the server has never seen.
		// The pull below bulkPuts whole server rows over local, so continuing
		// would overwrite exactly those un-pushed edits with the stale server
		// copy — turning a transient network failure into silent data loss.
		// Bail and let the next sync retry the push first.
		if (!pushOk) {
			console.warn('Sync: push failed — skipping pull so local edits survive.');
			return;
		}

		// 2. Pull all server rows
		const [bagsRes, brewsRes] = await Promise.all([
			supabase.from('bags').select('*'),
			supabase.from('brews').select('*')
		]);

		if (bagsRes.error) {
			console.warn('Sync: pull bags failed:', bagsRes.error.message);
			syncStatus.lastError = bagsRes.error.message;
			return;
		}
		if (brewsRes.error) {
			console.warn('Sync: pull brews failed:', brewsRes.error.message);
			syncStatus.lastError = brewsRes.error.message;
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
		// Deletes DO propagate: they travel as deletedAt tombstones on the rows
		// themselves (see pushWipeTombstones above and repository.deleteBag), so a
		// merge carries them without needing a clear.
		// Still whole-row LAST-WRITE-BY-ARRIVAL, not last-write-wins: a pulled row
		// overwrites local unconditionally. That is only safe because the push
		// above is now gated — real LWW needs a server updatedAt column and is a
		// deliberate follow-up, not something to bolt on here.
		await db.transaction('rw', db.bags, db.brews, async () => {
			if (serverBags.length > 0) await db.bags.bulkPut(serverBags);
			if (serverBrews.length > 0) await db.brews.bulkPut(serverBrews);
		});

		syncStatus.lastSyncAt = new Date().toISOString();
		console.info(
			`[sync] pushed: ${localBags.length} bags + ${localBrews.length} brews; pulled: ${serverBags.length} bags + ${serverBrews.length} brews; pushOk=${pushOk}`
		);

		// Tell any open pages that local cache has been updated, so they can refetch.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('brewlog:synced'));
		}
	} catch (err) {
		console.error('Sync failed:', err);
		syncStatus.lastError = err instanceof Error ? err.message : String(err);
	} finally {
		syncStatus.syncing = false;
	}
}

// ─── Auth listener: trigger sync on sign-in / app load (web only) ───

if (typeof window !== 'undefined' && !isNative) {
	supabase.auth.onAuthStateChange((event, session) => {
		if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
			void fullSync();
		}
	});
}
