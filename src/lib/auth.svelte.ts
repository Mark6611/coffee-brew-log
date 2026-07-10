import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Module-level reactive state for the current user.
// Components can read `auth.user` and it will react to sign-in / sign-out.
let userState = $state<User | null>(null);
let ready = $state(false);

export const auth = {
	get user() {
		return userState;
	},
	get ready() {
		return ready;
	}
};

if (typeof window !== 'undefined') {
	supabase.auth.getSession().then(({ data }) => {
		userState = data.session?.user ?? null;
		ready = true;
	});

	supabase.auth.onAuthStateChange((_event, session) => {
		userState = session?.user ?? null;
	});
}

export async function signOut() {
	await supabase.auth.signOut();
	// Wipe the local copy so a signed-in user's data doesn't linger on a shared
	// device (matches the privacy policy). The server keeps it; it re-pulls on
	// next sign-in. Dynamic import breaks the repository→sync→auth import cycle.
	try {
		const { clearLocalCache } = await import('./db/repository');
		await clearLocalCache();
		// Reset the sync indicator so it doesn't show a stale "synced 2m ago".
		const { syncStatus } = await import('./syncStatus.svelte');
		syncStatus.syncing = false;
		syncStatus.lastError = null;
		syncStatus.lastSyncAt = null;
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new Event('brewlog:synced'));
		}
	} catch (e) {
		console.warn('Local cache clear on sign-out failed:', e);
	}
}
