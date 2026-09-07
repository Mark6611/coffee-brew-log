// Persistent-storage state.
//
// IndexedDB is the primary copy of every bag, brew and photo. On native there
// is a second copy in the user's iCloud, but on the web it is the ONLY copy —
// and WebKit evicts a non-persisted origin under storage pressure or after
// roughly a week of not being used.
//
// navigator.storage.persist() RESOLVES false when the browser declines (routine
// for a PWA the user has not installed); it does not reject. So a bare
// `.catch(() => {})` throws away precisely the answer worth having. Recorded
// here so Settings can say the data is evictable, rather than the app finding
// out when it is already gone.
//
// Not persisted to localStorage on purpose: it is a fact about this browser
// right now, and a stale "granted" would be worse than no answer at all.
let persisted = $state<boolean | null>(null); // null = unknown / not asked yet

export const storage = {
	get persisted() {
		return persisted;
	},

	/** Ask once at boot. Safe to call where unsupported — resolves to null. */
	async requestPersistence(): Promise<void> {
		try {
			const granted = await navigator.storage?.persist?.();
			persisted = granted === undefined ? null : granted;
		} catch {
			// Some engines throw instead of resolving false; same meaning.
			persisted = false;
		}
	}
};
