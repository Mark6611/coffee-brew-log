import { db } from './database';
import { BrewSchema, BagSchema, type Brew, type Bag, type BagSnapshot } from './types';
import * as sync from '../sync';

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
	const parsed = BrewSchema.parse(enriched);
	await db.brews.add(parsed);
	sync.pushBrew(parsed);
	return parsed.id;
}

export async function getBrewById(id: string): Promise<Brew | undefined> {
	const row = await db.brews.get(id);
	if (!row) return undefined;
	const parsed = BrewSchema.parse(row);
	// Treat tombstoned rows as not found — same surface area as a hard delete
	// from the caller's perspective.
	if (parsed.deletedAt) return undefined;
	return parsed;
}

export async function listBrews(): Promise<Brew[]> {
	const rows = await db.brews.orderBy('brewedAt').reverse().toArray();
	return rows.map((row) => BrewSchema.parse(row)).filter((b) => !b.deletedAt);
}

export async function updateBrew(brew: Brew): Promise<void> {
	const existing = (await db.brews.get(brew.id)) as Brew | undefined;
	const enriched = await applyPublishTransition(brew, existing);
	const parsed = BrewSchema.parse(enriched);
	await db.brews.put(parsed);
	sync.pushBrew(parsed);
}

export async function deleteBrew(id: string): Promise<void> {
	const row = await db.brews.get(id);
	if (!row) return;
	// Soft delete: stamp deletedAt and push the updated row up. Other devices
	// will see deletedAt on their next pull and filter the brew out via
	// listBrews / getBrewById.
	const tombstoned = BrewSchema.parse({ ...row, deletedAt: new Date().toISOString() });
	await db.brews.put(tombstoned);
	sync.pushBrew(tombstoned);
}

export async function toggleFavorite(id: string): Promise<void> {
	const row = await db.brews.get(id);
	if (!row) return;
	const updated = BrewSchema.parse({ ...row, isFavorite: !row.isFavorite });
	await db.brews.put(updated);
	sync.pushBrew(updated);
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
	return rows.map((row) => BagSchema.parse(row)).filter((b) => !b.deletedAt);
}

export async function getBagById(id: string): Promise<Bag | undefined> {
	const row = await db.bags.get(id);
	if (!row) return undefined;
	const parsed = BagSchema.parse(row);
	if (parsed.deletedAt) return undefined;
	return parsed;
}

export async function addBag(bag: Bag): Promise<string> {
	const parsed = BagSchema.parse(bag);
	await db.bags.add(parsed);
	sync.pushBag(parsed);
	return parsed.id;
}

export async function updateBag(bag: Bag): Promise<void> {
	const parsed = BagSchema.parse(bag);
	await db.bags.put(parsed);
	sync.pushBag(parsed);
}

export async function wipeAllData(): Promise<void> {
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.brews.clear();
		await db.bags.clear();
	});
	// Best-effort: wipe server-side too. RLS scopes deletes to the current user.
	void (async () => {
		const { error: e1 } = await (await import('$lib/supabase')).supabase
			.from('brews')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		const { error: e2 } = await (await import('$lib/supabase')).supabase
			.from('bags')
			.delete()
			.neq('id', '00000000-0000-0000-0000-000000000000');
		if (e1) console.warn('Wipe brews on server failed:', e1.message);
		if (e2) console.warn('Wipe bags on server failed:', e2.message);
	})();
}

export async function bulkImport(brews: Brew[], bags: Bag[]): Promise<void> {
	const parsedBrews = brews.map((b) => BrewSchema.parse(b));
	const parsedBags = bags.map((b) => BagSchema.parse(b));
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.bags.bulkPut(parsedBags);
		await db.brews.bulkPut(parsedBrews);
	});
	// Push the lot to the server in one go via a full sync.
	void sync.fullSync();
}

export async function archiveBag(id: string, archived: boolean): Promise<void> {
	const row = await db.bags.get(id);
	if (!row) return;
	const updated = BagSchema.parse({ ...row, archived });
	await db.bags.put(updated);
	sync.pushBag(updated);
}

export async function deleteBag(id: string): Promise<void> {
	const now = new Date().toISOString();
	const row = await db.bags.get(id);
	if (!row) return;
	// Soft delete the bag itself, and unlink (bagId = null) any brews that
	// reference it — we don't want a brew pointing at a tombstoned bag.
	const tombstoned = BagSchema.parse({ ...row, deletedAt: now });
	const unlinkedBrews: Brew[] = [];
	await db.transaction('rw', db.bags, db.brews, async () => {
		const linked = await db.brews.where('bagId').equals(id).toArray();
		for (const brew of linked) {
			const { bagId, ...rest } = brew;
			void bagId;
			const updated = BrewSchema.parse(rest);
			await db.brews.put(updated);
			unlinkedBrews.push(updated);
		}
		await db.bags.put(tombstoned);
	});
	// Push the soft-deleted bag + the unlinked brews up so other devices see
	// the same shape on their next pull.
	sync.pushBag(tombstoned);
	for (const brew of unlinkedBrews) sync.pushBrew(brew);
}
