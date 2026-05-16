import { db } from './database';
import { BrewSchema, type Brew } from './types';

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
