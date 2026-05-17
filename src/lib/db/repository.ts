import { db } from './database';
import { BrewSchema, BagSchema, type Brew, type Bag } from './types';
import * as sync from '../sync';

export async function addBrew(brew: Brew): Promise<string> {
	const parsed = BrewSchema.parse(brew);
	await db.brews.add(parsed);
	sync.pushBrew(parsed);
	return parsed.id;
}

export async function getBrewById(id: string): Promise<Brew | undefined> {
	const row = await db.brews.get(id);
	if (!row) return undefined;
	return BrewSchema.parse(row);
}

export async function listBrews(): Promise<Brew[]> {
	const rows = await db.brews.orderBy('brewedAt').reverse().toArray();
	return rows.map((row) => BrewSchema.parse(row));
}

export async function updateBrew(brew: Brew): Promise<void> {
	const parsed = BrewSchema.parse(brew);
	await db.brews.put(parsed);
	sync.pushBrew(parsed);
}

export async function deleteBrew(id: string): Promise<void> {
	await db.brews.delete(id);
	sync.deleteBrewOnServer(id);
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
	return rows.map((row) => BagSchema.parse(row));
}

export async function getBagById(id: string): Promise<Bag | undefined> {
	const row = await db.bags.get(id);
	if (!row) return undefined;
	return BagSchema.parse(row);
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
	await db.transaction('rw', db.bags, db.brews, async () => {
		const linked = await db.brews.where('bagId').equals(id).toArray();
		for (const brew of linked) {
			const { bagId, ...rest } = brew;
			void bagId;
			await db.brews.put(rest);
		}
		await db.bags.delete(id);
	});
	// Server-side: ON DELETE SET NULL on brews.bagId handles the unlinking automatically.
	sync.deleteBagOnServer(id);
}
