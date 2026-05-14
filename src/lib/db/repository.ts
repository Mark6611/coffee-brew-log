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
