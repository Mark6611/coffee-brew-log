import { db } from './database';
import { BrewSchema, BagSchema, type Brew, type Bag, type BagSnapshot } from './types';
import * as sync from '../sync';
import { isNative } from '../native';

// Every local mutation gets a fresh updatedAt — the iCloud last-write-wins
// clock. Stamped here (the single write choke point) so no caller can forget;
// stripped again before any Supabase upsert (sync.withUserId).
function stamp<T extends object>(row: T): T & { updatedAt: string } {
	return { ...row, updatedAt: new Date().toISOString() };
}

// Nudge the iCloud sync after a burst of writes (native only; no-op on web).
// Dynamic import: cloudSync statically imports this module, so a static import
// here would be a cycle.
function notifyCloud(): void {
	if (!isNative) return;
	void import('../cloudSync').then((m) => m.queueCloudSync()).catch(() => {});
}

// ─── Publish transition ───────────────────────────────────────────────
// All blog-publish side-effects live here, not in the page component.
// See project_html_brew_handoff.md, Phase A step 3.

function snapshotBag(bag: Bag): BagSnapshot {
	return {
		name: bag.name,
		roaster: bag.roaster,
		origin: bag.origin,
		process: bag.process,
		roastedAt: bag.roastedAt,
		weightGrams: bag.weightGrams
	};
}

// Returns a brew with publish-related fields normalized:
// - publishedAt and bagSnapshot are preserved from the existing row if the
//   caller didn't supply them (so partial form updates don't erase them).
// - On the false→true transition, publishedAt is stamped to now and the
//   linked bag (if any) is snapshotted.
// - Unpublishing (true→false) does NOT clear publishedAt / bagSnapshot —
//   they're preserved so a later republish keeps the original timestamp.
async function applyPublishTransition(next: Brew, existing: Brew | undefined): Promise<Brew> {
	const result: Brew = { ...next };

	if (result.publishedAt === undefined && existing?.publishedAt) {
		result.publishedAt = existing.publishedAt;
	}
	if (result.bagSnapshot === undefined && existing?.bagSnapshot) {
		result.bagSnapshot = existing.bagSnapshot;
	}

	const wasPublished = existing?.published === true;
	const isPublishing = result.published === true;

	if (isPublishing && !wasPublished) {
		if (result.publishedAt === undefined) {
			result.publishedAt = new Date().toISOString();
		}
		if (result.bagSnapshot === undefined && result.bagId) {
			const bag = await db.bags.get(result.bagId);
			if (bag) {
				result.bagSnapshot = snapshotBag(bag);
			}
		}
	}

	return result;
}

export async function addBrew(brew: Brew): Promise<string> {
	const enriched = await applyPublishTransition(brew, undefined);
	const parsed = stamp(BrewSchema.parse(enriched));
	await db.brews.add(parsed);
	sync.pushBrew(parsed);
	notifyCloud();
	return parsed.id;
}

export async function getBrewById(id: string): Promise<Brew | undefined> {
	const row = await db.brews.get(id);
	if (!row) return undefined;
	const r = BrewSchema.safeParse(row);
	if (!r.success) {
		console.warn('[repository] unparseable brew row:', r.error.issues[0]?.message);
		return undefined;
	}
	// Treat tombstoned rows as not found — same surface area as a hard delete
	// from the caller's perspective.
	if (r.data.deletedAt) return undefined;
	return r.data;
}

export async function listBrews(): Promise<Brew[]> {
	const rows = await db.brews.orderBy('brewedAt').reverse().toArray();
	// safeParse + skip: one malformed row (e.g. a future-schema row pulled from
	// the server) must not throw and blank the whole list — matches the sync layer.
	return rows.flatMap((row) => {
		const r = BrewSchema.safeParse(row);
		if (!r.success) {
			console.warn('[repository] skipping unparseable brew row:', r.error.issues[0]?.message);
			return [];
		}
		return r.data.deletedAt ? [] : [r.data];
	});
}

export async function updateBrew(brew: Brew): Promise<void> {
	const existing = (await db.brews.get(brew.id)) as Brew | undefined;
	const enriched = await applyPublishTransition(brew, existing);
	const parsed = stamp(BrewSchema.parse(enriched));
	await db.brews.put(parsed);
	sync.pushBrew(parsed);
	notifyCloud();
}

export async function deleteBrew(id: string): Promise<void> {
	const row = await db.brews.get(id);
	if (!row) return;
	// Soft delete: stamp deletedAt and push the updated row up. Other devices
	// will see deletedAt on their next pull and filter the brew out via
	// listBrews / getBrewById.
	const tombstoned = stamp(BrewSchema.parse({ ...row, deletedAt: new Date().toISOString() }));
	await db.brews.put(tombstoned);
	sync.pushBrew(tombstoned);
	notifyCloud();
}

export async function toggleFavorite(id: string): Promise<void> {
	const row = await db.brews.get(id);
	if (!row) return;
	const updated = stamp(BrewSchema.parse({ ...row, isFavorite: !row.isFavorite }));
	await db.brews.put(updated);
	sync.pushBrew(updated);
	notifyCloud();
}

export async function searchBrews(query: string): Promise<Brew[]> {
	const q = query.trim().toLowerCase();
	const all = await listBrews();
	if (!q) return all;
	return all.filter((b) => {
		const hay = [b.coffeeName, b.roaster, b.notes].filter(Boolean).join(' ').toLowerCase();
		return hay.includes(q);
	});
}

// ─── Bags ─────────────────────────────────────────────────────────────

export async function listBags(): Promise<Bag[]> {
	const rows = await db.bags.orderBy('createdAt').reverse().toArray();
	return rows.flatMap((row) => {
		const r = BagSchema.safeParse(row);
		if (!r.success) {
			console.warn('[repository] skipping unparseable bag row:', r.error.issues[0]?.message);
			return [];
		}
		return r.data.deletedAt ? [] : [r.data];
	});
}

export async function getBagById(id: string): Promise<Bag | undefined> {
	const row = await db.bags.get(id);
	if (!row) return undefined;
	const r = BagSchema.safeParse(row);
	if (!r.success) {
		console.warn('[repository] unparseable bag row:', r.error.issues[0]?.message);
		return undefined;
	}
	if (r.data.deletedAt) return undefined;
	return r.data;
}

export async function addBag(bag: Bag): Promise<string> {
	const parsed = stamp(BagSchema.parse(bag));
	await db.bags.add(parsed);
	sync.pushBag(parsed);
	notifyCloud();
	return parsed.id;
}

export async function updateBag(bag: Bag): Promise<void> {
	const parsed = stamp(BagSchema.parse(bag));
	await db.bags.put(parsed);
	sync.pushBag(parsed);
	notifyCloud();
}

export async function wipeAllData(): Promise<void> {
	// Read current rows first, then TOMBSTONE them on the server (awaited, throws on
	// failure) BEFORE clearing local. A hard delete used to be fire-and-forget: the UI
	// reported success even when the server delete failed offline, and any other
	// signed-in device would re-push its copy on the next fullSync, silently undoing
	// the "permanent" wipe. Tombstones ride the normal soft-delete path so every device
	// converges to deleted.
	const [localBags, localBrews] = await Promise.all([db.bags.toArray(), db.brews.toArray()]);
	if (isNative) {
		// Same resurrection hazard as the server path, but against iCloud: clearing
		// local without cloud tombstones means the next sync pulls everything back.
		// Awaited + throws, so a failed wipe is reported as failed.
		const { pushWipeTombstonesToCloud } = await import('../cloudSync');
		await pushWipeTombstonesToCloud(localBags, localBrews);
	}
	await sync.pushWipeTombstones(localBags, localBrews);
	// Clear local only after the server tombstones are in — a mid-op failure must not
	// have already wiped the device while leaving the account intact.
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.brews.clear();
		await db.bags.clear();
	});
}

/**
 * Clear ONLY the local IndexedDB cache — used on sign-out so a signed-in user's
 * data doesn't linger on a shared device (matches the privacy policy). Unlike
 * wipeAllData this does NOT touch the server: the account keeps its synced data
 * and re-pulls it on the next sign-in.
 */
export async function clearLocalCache(): Promise<void> {
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.brews.clear();
		await db.bags.clear();
	});
}

/**
 * Delete the signed-in user's account and ALL of their data — required by App
 * Review 5.1.1(v) for any app that offers account creation. Calls the
 * `delete_account` Postgres RPC (SECURITY DEFINER: removes the user's rows and
 * their auth.users record in one transaction, scoped to auth.uid()), then wipes
 * the local cache and ends the session. Throws if the RPC fails.
 */
export async function deleteAccount(): Promise<void> {
	const { supabase } = await import('$lib/supabase');
	const { error } = await supabase.rpc('delete_account');
	if (error) throw new Error(error.message);
	await clearLocalCache();
	await supabase.auth.signOut();
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event('brewlog:synced'));
	}
}

export async function bulkImport(brews: Brew[], bags: Bag[]): Promise<void> {
	const parsedBrews = brews.map((b) => stamp(BrewSchema.parse(b)));
	const parsedBags = bags.map((b) => stamp(BagSchema.parse(b)));
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.bags.bulkPut(parsedBags);
		await db.brews.bulkPut(parsedBrews);
	});
	// Push the lot to the server in one go via a full sync.
	void sync.fullSync();
	notifyCloud();
}

export async function archiveBag(id: string, archived: boolean): Promise<void> {
	const row = await db.bags.get(id);
	if (!row) return;
	const updated = stamp(BagSchema.parse({ ...row, archived }));
	await db.bags.put(updated);
	sync.pushBag(updated);
	notifyCloud();
}

export async function deleteBag(id: string): Promise<void> {
	const now = new Date().toISOString();
	const row = await db.bags.get(id);
	if (!row) return;
	// Soft delete the bag itself, and unlink (bagId = null) any brews that
	// reference it — we don't want a brew pointing at a tombstoned bag.
	const tombstoned = stamp(BagSchema.parse({ ...row, deletedAt: now }));
	const unlinkedBrews: Brew[] = [];
	await db.transaction('rw', db.bags, db.brews, async () => {
		const linked = await db.brews.where('bagId').equals(id).toArray();
		for (const brew of linked) {
			const { bagId, ...rest } = brew;
			void bagId;
			const updated = stamp(BrewSchema.parse(rest));
			await db.brews.put(updated);
			unlinkedBrews.push(updated);
		}
		await db.bags.put(tombstoned);
	});
	// Push the soft-deleted bag + the unlinked brews up so other devices see
	// the same shape on their next pull.
	sync.pushBag(tombstoned);
	for (const brew of unlinkedBrews) sync.pushBrew(brew);
	notifyCloud();
}

// ─── iCloud sync surface (native) ─────────────────────────────────────
// The cloud merge needs the RAW table contents — tombstones included, since
// deletes travel as tombstones and must win/lose by updatedAt like any edit.

export async function listBrewsForSync(): Promise<Brew[]> {
	const rows = await db.brews.toArray();
	return rows.flatMap((row) => {
		const r = BrewSchema.safeParse(row);
		return r.success ? [r.data] : [];
	});
}

export async function listBagsForSync(): Promise<Bag[]> {
	const rows = await db.bags.toArray();
	return rows.flatMap((row) => {
		const r = BagSchema.safeParse(row);
		return r.success ? [r.data] : [];
	});
}

/** Write a record that arrived FROM the cloud: no re-stamp (its updatedAt is
 * its identity in the merge), no Supabase push, no cloud re-notify. */
export async function applySyncedBrew(brew: Brew): Promise<void> {
	const r = BrewSchema.safeParse(brew);
	if (!r.success) return; // one corrupt cloud record must not poison the pass
	await db.brews.put(r.data);
}

export async function applySyncedBag(bag: Bag): Promise<void> {
	const r = BagSchema.safeParse(bag);
	if (!r.success) return;
	await db.bags.put(r.data);
}
