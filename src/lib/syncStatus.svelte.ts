// Reactive mirror of the most recent sync attempt, for UI surfaces (banners,
// settings indicator). sync.ts writes to this; components read it reactively.
// Kept separate from sync.ts because sync.ts is a plain .ts module and can't
// hold $state runes.

export const syncStatus = $state<{
	syncing: boolean;
	lastError: string | null;
	lastSyncAt: string | null;
}>({
	syncing: false,
	lastError: null,
	lastSyncAt: null
});
