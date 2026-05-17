// Sync layer: keeps IndexedDB (local cache) in sync with Supabase (cloud).
// Local is always read-first. Writes go local; sync hooks push to cloud when authenticated.

import { supabase } from './supabase';
import { auth } from './auth.svelte';
import { db } from './db/database';
import { BrewSchema, BagSchema, type Brew, type Bag } from './db/types';

let syncing = false;
let lastError: string | null = null;
let lastSyncAt: string | null = null;

export function getSyncStatus() {
	return { syncing, lastError, lastSyncAt };
}

function withUserId<T>(row: T, userId: string): T & { userId: string } {
	return { ...row, userId };
}

function stripNullsAndUserId(row: Record<string, unknown>): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		if (key === 'userId') continue;
		if (value === null) continue;
		cleaned[key] = value;
	}
	return cleaned;
}

function parseBagFromServer(row: Record<string, unknown>): Bag | null {
	const result = BagSchema.safeParse(stripNullsAndUserId(row));
	if (!result.success) {
		console.warn('Bag from server failed validation:', result.error.issues[0]?.message);
		return null;
	}
	return result.data;
}

function parseBrewFromServer(row: Record<string, unknown>): Brew | null {
	const result = BrewSchema.safeParse(stripNullsAndUserId(row));
	if (!result.success) {
		console.warn('Brew from server failed validation:', result.error.issues[0]?.message);
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

export function deleteBagOnServer(id: string): void {
	if (!auth.user) return;
	void supabase
		.from('bags')
		.delete()
		.eq('id', id)
		.then(({ error }) => {
			if (error) {
				console.warn('Delete bag failed:', error.message);
				lastError = error.message;
			}
		});
}

export function deleteBrewOnServer(id: string): void {
	if (!auth.user) return;
	void supabase
		.from('brews')
		.delete()
		.eq('id', id)
		.then(({ error }) => {
			if (error) {
				console.warn('Delete brew failed:', error.message);
				lastError = error.message;
			}
		});
}

// ─── Full sync (push everything local, then pull all server data) ───

export async function fullSync(): Promise<void> {
	const user = auth.user;
	if (!user) return;
	if (syncing) return;
	syncing = true;
	lastError = null;

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

		// 3. Update local cache
		await db.transaction('rw', db.bags, db.brews, async () => {
			if (pushOk) {
				// Push succeeded — server has everything we had + anything from other devices.
				// Safe to replace local entirely.
				await db.bags.clear();
				await db.brews.clear();
				if (serverBags.length > 0) await db.bags.bulkAdd(serverBags);
				if (serverBrews.length > 0) await db.brews.bulkAdd(serverBrews);
			} else {
				// Push failed — don't clear; merge server data so local-only items survive.
				if (serverBags.length > 0) await db.bags.bulkPut(serverBags);
				if (serverBrews.length > 0) await db.brews.bulkPut(serverBrews);
			}
		});

		lastSyncAt = new Date().toISOString();
	} catch (err) {
		console.error('Sync failed:', err);
		lastError = err instanceof Error ? err.message : String(err);
	} finally {
		syncing = false;
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
