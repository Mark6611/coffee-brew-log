// iCloud sync — bidirectional merge of Bags/Brews against CloudKit's private
// database (the device's signed-in iCloud account: no login, no server we run).
// Native only; every entry point no-ops on the web, where Supabase sync remains.
// Ported from sibling Buffy's proven implementation.
//
// Model: last-write-wins by `updatedAt`, decided here (pure, testable) — the
// native side just moves opaque {id, updatedAt, json} records. Deletes travel
// as tombstones (deletedAt inside the record), so they win/lose by the same
// rule as any edit. CloudKit-level record deletes are never issued.

import {
	isNative,
	cloudSyncIsAvailable,
	cloudSyncPull,
	cloudSyncPush,
	type CloudRecord
} from '$lib/native';
import { BagSchema, BrewSchema, type Bag, type Brew } from '$lib/db/types';

// The repository is loaded lazily inside the sync pass: its static import
// chain reaches auth.svelte.ts (runes), which plain vitest can't parse — and
// keeping this module import-light keeps mergeRecords purely testable.
const repo = () => import('$lib/db/repository');

type Syncable = { id: string; updatedAt?: string };

/** localStorage key for the last successful sync (ISO) — written here, read by Settings. */
export const LAST_CLOUD_SYNC_KEY = 'brewlog:lastCloudSync';

export interface MergePlan<T> {
	/** remote records that are newer (or local-missing) — write these in locally */
	toWriteLocally: T[];
	/** local records that are newer (or remote-missing) — push these up */
	toPushRemotely: CloudRecord[];
}

/** Pure: decide, per id, which side wins. Equal timestamps mean already in sync.
 *  A remote record whose json doesn't parse is skipped outright — one corrupt
 *  record must not poison the rest of its type (and we never push blind over it,
 *  since we can't know what it held). */
export function mergeRecords<T extends Syncable>(local: T[], remote: CloudRecord[]): MergePlan<T> {
	const localById = new Map(local.map((l) => [l.id, l]));
	const remoteById = new Map(remote.map((r) => [r.id, r]));
	const toWriteLocally: T[] = [];
	const toPushRemotely: CloudRecord[] = [];

	for (const r of remote) {
		const loc = localById.get(r.id);
		const localTime = loc?.updatedAt ? Date.parse(loc.updatedAt) : -Infinity;
		const remoteTime = Date.parse(r.updatedAt) || -Infinity;
		if (!loc || remoteTime > localTime) {
			try {
				toWriteLocally.push(JSON.parse(r.json) as T);
			} catch {
				// corrupt remote json — skip this record, sync everything else
			}
		} else if (localTime > remoteTime) {
			toPushRemotely.push({ id: loc.id, updatedAt: loc.updatedAt!, json: JSON.stringify(loc) });
		}
	}
	for (const loc of local) {
		if (!remoteById.has(loc.id)) {
			// Records predating the updatedAt stamp get stamped INSIDE the json too,
			// not just on the envelope — otherwise every other device pulls a record
			// whose inner timestamp never matches the envelope and re-syncs it forever.
			const stamped = loc.updatedAt ? loc : { ...loc, updatedAt: new Date().toISOString() };
			toPushRemotely.push({ id: stamped.id, updatedAt: stamped.updatedAt!, json: JSON.stringify(stamped) });
		}
	}
	return { toWriteLocally, toPushRemotely };
}

export interface SyncResult {
	ok: boolean;
	reason?: string;
	pulled: number;
	pushed: number;
}

// One pass at a time: every entry point (launch, foreground, post-write nudge,
// the Settings button) awaits the same in-flight pass instead of starting a
// second one that would race the first's pulls against its pushes.
let inFlight: Promise<SyncResult> | null = null;

/** Run one full sync pass across both record types. Best-effort per type —
 *  one type failing doesn't block the other. A failed PULL aborts that type's
 *  whole pass (no push): an error is indistinguishable from an empty cloud, and
 *  pushing the full local set against "empty" would overwrite newer remote data. */
export function runCloudSync(): Promise<SyncResult> {
	if (!isNative) return Promise.resolve({ ok: false, reason: 'web', pulled: 0, pushed: 0 });
	if (inFlight) return inFlight;
	inFlight = doSync().finally(() => {
		inFlight = null;
	});
	return inFlight;
}

// Post-write nudge from the repository: debounced so a burst of edits (a save
// + a favorite + a photo) becomes one pass, started after the burst settles.
// If a pass is already mid-flight when the timer fires, chain a follow-up —
// the running pass snapshotted its reads before this write and would miss it.
let queued: ReturnType<typeof setTimeout> | null = null;
export function queueCloudSync(delayMs = 4000): void {
	if (!isNative) return;
	if (queued) clearTimeout(queued);
	queued = setTimeout(() => {
		queued = null;
		if (inFlight) {
			void inFlight.then(() => void runCloudSync());
		} else {
			void runCloudSync();
		}
	}, delayMs);
}

/** Stop any pending nudge and wait out an in-flight pass. Called before a wipe
 *  so a racing pass can't re-push live rows over the wipe's tombstones. */
export async function quiesceCloudSync(): Promise<void> {
	if (queued) {
		clearTimeout(queued);
		queued = null;
	}
	if (inFlight) await inFlight.catch(() => {});
}

async function doSync(): Promise<SyncResult> {
	if (!(await cloudSyncIsAvailable())) {
		return {
			ok: false,
			reason: 'iCloud unavailable — check that iCloud is signed in on this device',
			pulled: 0,
			pushed: 0
		};
	}
	let pulled = 0;
	let pushed = 0;
	let anyFailure = false;

	async function syncOne<T extends Syncable>(
		type: string,
		list: () => Promise<T[]>,
		applySynced: (r: T) => Promise<void>
	) {
		let local: T[];
		let remote: CloudRecord[];
		try {
			[local, remote] = await Promise.all([list(), cloudSyncPull(type)]);
		} catch {
			anyFailure = true;
			return; // pull failed — do NOT treat as empty and do NOT push
		}
		try {
			const { toWriteLocally, toPushRemotely } = mergeRecords(local, remote);
			for (const rec of toWriteLocally) await applySynced(rec);
			pulled += toWriteLocally.length;
			if (toPushRemotely.length) {
				await cloudSyncPush(type, toPushRemotely);
				pushed += toPushRemotely.length;
			}
		} catch {
			anyFailure = true;
		}
	}

	const r = await repo();
	await syncOne<Bag>('Bag', r.listBagsForSync, r.applySyncedBag);
	await syncOne<Brew>('Brew', r.listBrewsForSync, r.applySyncedBrew);

	const ok = !anyFailure;
	if (ok && typeof localStorage !== 'undefined') {
		localStorage.setItem(LAST_CLOUD_SYNC_KEY, new Date().toISOString());
	}
	if (pulled > 0 && typeof window !== 'undefined') {
		// Open pages refetch through the same event the Supabase path uses.
		window.dispatchEvent(new CustomEvent('brewlog:synced'));
	}
	return { ok, reason: ok ? undefined : 'one or more record types failed to sync', pulled, pushed };
}

/** Wipe support: tombstone every live row IN THE CLOUD (awaited, throws on
 *  failure) before local data is cleared — without this, the next sync pass
 *  would just pull everything back. Mirrors sync.pushWipeTombstones. */
export async function pushWipeTombstonesToCloud(bags: Bag[], brews: Brew[]): Promise<void> {
	if (!isNative) return;
	if (!(await cloudSyncIsAvailable())) {
		// Unavailable ≠ nonexistent: if this device has EVER synced, a cloud copy
		// exists and clearing local without tombstones just resurrects it later.
		// Only a device that never synced can safely treat the cloud as empty.
		if (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_CLOUD_SYNC_KEY)) {
			throw new Error(
				'iCloud is unreachable, so your synced copy could not be erased. Sign into iCloud and try again.'
			);
		}
		return;
	}
	const now = new Date().toISOString();
	const toRecords = (rows: (Bag | Brew)[], schema: typeof BagSchema | typeof BrewSchema) =>
		rows
			.filter((r) => !r.deletedAt)
			.flatMap((r) => {
				const parsed = schema.safeParse({ ...r, deletedAt: now, updatedAt: now });
				return parsed.success
					? [{ id: parsed.data.id, updatedAt: now, json: JSON.stringify(parsed.data) }]
					: [];
			});
	const bagRecords = toRecords(bags, BagSchema);
	const brewRecords = toRecords(brews, BrewSchema);
	if (bagRecords.length) await cloudSyncPush('Bag', bagRecords);
	if (brewRecords.length) await cloudSyncPush('Brew', brewRecords);
}
