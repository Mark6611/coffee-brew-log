import { db } from './database';
import { BrewSchema, BagSchema, type Brew, type Bag } from './types';

export async function addBrew(brew: Brew): Promise<string> {
	const parsed = BrewSchema.parse(brew);
	await db.brews.add(parsed);
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
}

export async function deleteBrew(id: string): Promise<void> {
	await db.brews.delete(id);
}

export async function toggleFavorite(id: string): Promise<void> {
	const row = await db.brews.get(id);
	if (!row) return;
	const updated = BrewSchema.parse({ ...row, isFavorite: !row.isFavorite });
	await db.brews.put(updated);
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
	return parsed.id;
}

export async function updateBag(bag: Bag): Promise<void> {
	const parsed = BagSchema.parse(bag);
	await db.bags.put(parsed);
}

export async function bulkImport(brews: Brew[], bags: Bag[]): Promise<void> {
	const parsedBrews = brews.map((b) => BrewSchema.parse(b));
	const parsedBags = bags.map((b) => BagSchema.parse(b));
	await db.transaction('rw', db.brews, db.bags, async () => {
		await db.bags.bulkPut(parsedBags);
		await db.brews.bulkPut(parsedBrews);
	});
}

export async function archiveBag(id: string, archived: boolean): Promise<void> {
	const row = await db.bags.get(id);
	if (!row) return;
	const updated = BagSchema.parse({ ...row, archived });
	await db.bags.put(updated);
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
}
