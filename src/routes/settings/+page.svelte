<script lang="ts">
	import { onMount } from 'svelte';
	import type { Bag, Brew } from '$lib/db/types';
	import { BagSchema, BrewSchema } from '$lib/db/types';
	import { listBags, listBrews, bulkImport, wipeAllData, deleteAccount } from '$lib/db/repository';
	import { auth, signOut } from '$lib/auth.svelte';
	import { fullSync, getSyncStatus } from '$lib/sync';
	import { isNative } from '$lib/native';
	import { cloudSyncIsAvailable } from '$lib/native';
	import { runCloudSync, LAST_CLOUD_SYNC_KEY } from '$lib/cloudSync';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	// ── iCloud sync state (native only) ────────────────────────────────
	let cloudAvailable = $state<boolean | null>(null); // null = still checking
	let cloudSyncing = $state(false);
	let cloudLastSyncAt = $state<string | null>(null);
	let cloudError = $state<string | null>(null);

	async function handleCloudSyncNow() {
		cloudSyncing = true;
		cloudError = null;
		const result = await runCloudSync();
		if (!result.ok) cloudError = result.reason ?? 'Sync failed.';
		cloudLastSyncAt = localStorage.getItem(LAST_CLOUD_SYNC_KEY);
		await loadCounts();
		cloudSyncing = false;
	}

	// Marketing version — mirror ios/App CFBundleShortVersionString (MARKETING_VERSION).
	const APP_VERSION = '1.0';

	let brewCount = $state(0);
	let bagCount = $state(0);
	let loading = $state(true);
	let importing = $state(false);
	let message = $state<string | null>(null);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>();
	let syncing = $state(false);
	let lastSyncAt = $state<string | null>(null);
	let lastSyncError = $state<string | null>(null);

	function timeAgo(iso: string | null): string {
		if (!iso) return 'never';
		const ago = Date.now() - new Date(iso).getTime();
		const s = Math.max(0, Math.floor(ago / 1000));
		if (s < 5) return 'just now';
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m} min ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h} hr ago`;
		const d = Math.floor(h / 24);
		return `${d}d ago`;
	}

	async function handleSyncNow() {
		syncing = true;
		await fullSync();
		const status = getSyncStatus();
		lastSyncAt = status.lastSyncAt;
		lastSyncError = status.lastError;
		// Refresh local counts after sync
		await loadCounts();
		syncing = false;
	}

	async function loadCounts() {
		const [brews, bags] = await Promise.all([listBrews(), listBags()]);
		brewCount = brews.length;
		bagCount = bags.length;
		loading = false;
	}

	onMount(() => {
		loadCounts();
		const status = getSyncStatus();
		lastSyncAt = status.lastSyncAt;
		lastSyncError = status.lastError;
		if (isNative) {
			cloudLastSyncAt = localStorage.getItem(LAST_CLOUD_SYNC_KEY);
			void cloudSyncIsAvailable().then((a) => (cloudAvailable = a));
		}
		const onSynced = () => {
			const s = getSyncStatus();
			lastSyncAt = s.lastSyncAt;
			lastSyncError = s.lastError;
			if (isNative) cloudLastSyncAt = localStorage.getItem(LAST_CLOUD_SYNC_KEY);
			loadCounts();
		};
		window.addEventListener('brewlog:synced', onSynced);
		return () => window.removeEventListener('brewlog:synced', onSynced);
	});

	async function handleExport() {
		error = null;
		message = null;
		const [brews, bags] = await Promise.all([listBrews(), listBags()]);
		const payload = {
			version: 1,
			exportedAt: new Date().toISOString(),
			counts: { brews: brews.length, bags: bags.length },
			bags,
			brews
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const today = new Date().toISOString().slice(0, 10);
		a.download = `coffee-brew-log-${today}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		message = `Exported ${brews.length} brews + ${bags.length} bags.`;
	}

	async function handleWipe() {
		const total = brewCount + bagCount;
		if (total === 0) return;
		const where = auth.user
			? 'this device and your synced account'
			: isNative
				? 'this device and your iCloud'
				: 'this device';
		if (
			!confirm(
				`Delete all ${brewCount} brew${brewCount === 1 ? '' : 's'} and ${bagCount} bag${bagCount === 1 ? '' : 's'} from ${where}? This permanently erases them and cannot be undone.`
			)
		)
			return;
		try {
			await wipeAllData();
			message = 'All data wiped.';
			error = null;
		} catch (e) {
			// wipeAllData now awaits the server tombstones and throws if they don't land —
			// don't claim success for a wipe that didn't reach the account.
			error = e instanceof Error ? `Couldn’t wipe your account — ${e.message}` : 'Wipe failed.';
			message = null;
		}
		await loadCounts();
	}

	let deletingAccount = $state(false);
	async function handleDeleteAccount() {
		if (!auth.user) return;
		if (
			!confirm(
				`Delete your account (${auth.user.email}) and everything in it? This removes your account and all synced data permanently and cannot be undone.`
			)
		)
			return;
		deletingAccount = true;
		error = null;
		message = null;
		try {
			await deleteAccount();
			await loadCounts();
			message = 'Your account and all data were deleted.';
		} catch (err) {
			error = `Could not delete your account: ${err instanceof Error ? err.message : String(err)}. Please email us and we'll remove it.`;
		} finally {
			deletingAccount = false;
		}
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';

		error = null;
		message = null;
		importing = true;

		try {
			const text = await file.text();
			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch {
				throw new Error('File is not valid JSON.');
			}

			if (!parsed || typeof parsed !== 'object' || !('brews' in parsed) || !('bags' in parsed)) {
				throw new Error('Not a valid Coffee Brew Log export.');
			}

			const data = parsed as { brews?: unknown[]; bags?: unknown[] };
			if (!Array.isArray(data.brews) || !Array.isArray(data.bags)) {
				throw new Error('Export is missing brews or bags arrays.');
			}

			const validBrews: Brew[] = [];
			const validBags: Bag[] = [];
			const errors: string[] = [];

			for (const item of data.bags) {
				const r = BagSchema.safeParse(item);
				if (r.success) validBags.push(r.data);
				else errors.push(`Bag: ${r.error.issues[0]?.message ?? 'invalid'}`);
			}

			for (const item of data.brews) {
				const r = BrewSchema.safeParse(item);
				if (r.success) validBrews.push(r.data);
				else errors.push(`Brew: ${r.error.issues[0]?.message ?? 'invalid'}`);
			}

			if (validBrews.length === 0 && validBags.length === 0) {
				throw new Error(
					`No valid items found.${errors.length ? ' First issue: ' + errors[0] : ''}`
				);
			}

			const skipped = errors.length;
			const msg = `Import ${validBags.length} bag${validBags.length === 1 ? '' : 's'} and ${validBrews.length} brew${validBrews.length === 1 ? '' : 's'}? Existing items with the same id will be replaced.${skipped > 0 ? `\n\n${skipped} item${skipped === 1 ? '' : 's'} skipped (invalid).` : ''}`;

			if (!confirm(msg)) {
				importing = false;
				return;
			}

			await bulkImport(validBrews, validBags);
			await loadCounts();
			message = `Imported ${validBags.length} bags + ${validBrews.length} brews${skipped > 0 ? ` (${skipped} skipped)` : ''}.`;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			importing = false;
		}
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-12">
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/"
			class="flex h-9 items-center gap-1 text-[15px] text-muted transition-colors hover:text-ink"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M10 3L4 8l6 5" />
			</svg>
			Home
		</a>
	</div>

	<div class="px-[22px]">
		<Eyebrow>SETTINGS</Eyebrow>
		<h1
			class="mt-1 font-display text-[30px] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			Data
		</h1>
		<p class="mt-2 font-display text-[15px] text-muted italic">
			{#if isNative}
				Your brews live on this device, and sync through your own iCloud. Back up regularly.
			{:else}
				Your brews live on this device, and sync to your account when you're signed in. Back up
				regularly.
			{/if}
		</p>
	</div>

	{#if !loading}
		<div class="mt-6 space-y-[18px] px-[22px]">
			{#if isNative}
				<!-- iCloud sync (native): no account, no login — the device's own
				     iCloud moves the data between the user's devices. -->
				<div>
					<Eyebrow class="mb-2">ICLOUD SYNC</Eyebrow>
					<div class="rounded-2xl border border-hairline bg-surface px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="mt-0.5 text-[13px] text-ink">
									{#if cloudSyncing}
										<span class="text-copper">Syncing…</span>
									{:else if cloudAvailable === false}
										<span class="text-muted">iCloud is off — sign into iCloud in iOS Settings to
											sync between your devices.</span>
									{:else if cloudError}
										<span class="text-danger">{cloudError}</span>
									{:else}
										Synced {timeAgo(cloudLastSyncAt)}
									{/if}
								</div>
								<p class="mt-1 text-[11px] leading-[1.4] text-faint">
									Through your private iCloud only — no account, nothing shared with us.
								</p>
							</div>
							<button
								type="button"
								onclick={handleCloudSyncNow}
								disabled={cloudSyncing || cloudAvailable === false}
								class="press-sm inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 text-[12px] font-medium text-ink hover:bg-paper disabled:opacity-50"
							>
								<svg
									width="12"
									height="12"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
									class={cloudSyncing ? 'animate-spin' : ''}
								>
									<path d="M14 4v4h-4M2 12V8h4" />
									<path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" />
								</svg>
								Sync now
							</button>
						</div>
					</div>
				</div>
			{:else}
			<!-- Account (web) -->
			<div>
				<Eyebrow class="mb-2">ACCOUNT</Eyebrow>
				{#if auth.user}
					<div class="space-y-3 rounded-2xl border border-hairline bg-surface px-4 py-3">
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0">
								<div class="truncate text-[14px] text-ink">{auth.user.email}</div>
								<div class="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted uppercase">
									Signed in
								</div>
							</div>
							<button
								type="button"
								onclick={signOut}
								class="shrink-0 text-[12px] text-muted transition-colors hover:text-ink"
								>Sign out</button
							>
						</div>

						<div class="flex items-center justify-between gap-3 border-t border-hairline pt-3">
							<div class="min-w-0 flex-1">
								<div
									class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
								>
									SYNC
								</div>
								<div class="mt-0.5 text-[13px] text-ink">
									{#if syncing}
										<span class="text-copper">Syncing…</span>
									{:else if lastSyncError}
										<span class="text-danger">{lastSyncError}</span>
									{:else}
										Synced {timeAgo(lastSyncAt)}
									{/if}
								</div>
							</div>
							<button
								type="button"
								onclick={handleSyncNow}
								disabled={syncing}
								class="press-sm inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 text-[12px] font-medium text-ink hover:bg-paper disabled:opacity-50"
							>
								<svg
									width="12"
									height="12"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
									class={syncing ? 'animate-spin' : ''}
								>
									<path d="M14 4v4h-4M2 12V8h4" />
									<path d="M2 8a6 6 0 0 1 10.5-4M14 8a6 6 0 0 1-10.5 4" />
								</svg>
								Sync now
							</button>
						</div>

						<div class="border-t border-hairline pt-3">
							<button
								type="button"
								onclick={handleDeleteAccount}
								disabled={deletingAccount}
								class="inline-flex items-center gap-1.5 text-[12px] font-medium text-danger transition-opacity hover:text-danger disabled:opacity-50"
							>
								<svg
									width="12"
									height="12"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M3 4h10M6 4V2.5h4V4M5 4v9c0 .8.7 1.5 1.5 1.5h3c.8 0 1.5-.7 1.5-1.5V4" />
								</svg>
								{deletingAccount ? 'Deleting account…' : 'Delete account'}
							</button>
							<p class="mt-1.5 text-[11px] leading-[1.4] text-faint">
								Permanently deletes your account and all synced data.
							</p>
						</div>
					</div>
				{:else}
					<a
						href="/auth"
						class="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 transition-colors hover:bg-paper/50"
					>
						<div>
							<div class="text-[14px] text-ink">Sign in</div>
							<div class="mt-0.5 text-[12px] text-muted">Sync brews across devices.</div>
						</div>
						<svg
							width="14"
							height="14"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="shrink-0 text-faint"
						>
							<path d="M6 3l5 5-5 5" />
						</svg>
					</a>
				{/if}
			</div>
			{/if}

			<!-- Counts — grouped inset rows: label left, value right -->
			<div>
				<Eyebrow class="mb-2">ON THIS DEVICE</Eyebrow>
				<div class="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
					<div class="flex h-12 items-center justify-between px-4">
						<span class="text-[14px] text-ink">Brews</span>
						<span class="font-mono text-[13px] text-muted">{brewCount}</span>
					</div>
					<div class="flex h-12 items-center justify-between px-4">
						<span class="text-[14px] text-ink">Bags</span>
						<span class="font-mono text-[13px] text-muted">{bagCount}</span>
					</div>
				</div>
			</div>

			<!-- Backup — grouped inset action rows (iOS: tinted action rows in one group) -->
			<div>
				<Eyebrow class="mb-2">BACKUP</Eyebrow>
				<input
					type="file"
					accept=".json,application/json"
					bind:this={fileInput}
					onchange={handleFileChange}
					class="hidden"
				/>
				<div
					class="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface"
				>
					<button
						type="button"
						onclick={handleExport}
						disabled={brewCount === 0 && bagCount === 0}
						class="flex h-12 w-full items-center gap-2.5 px-4 text-left text-[14px] font-medium text-copper transition-colors hover:bg-paper/60 active:bg-paper disabled:opacity-50"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M8 2v8" />
							<path d="M4 6l4 4 4-4" />
							<path d="M2.5 11.5v1c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5v-1" />
						</svg>
						Download backup
					</button>
					<button
						type="button"
						onclick={() => fileInput?.click()}
						disabled={importing}
						class="flex h-12 w-full items-center gap-2.5 px-4 text-left text-[14px] font-medium text-ink transition-colors hover:bg-paper/60 active:bg-paper disabled:opacity-50"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M8 14V6" />
							<path d="M4 10l4-4 4 4" />
							<path d="M2.5 3.5v-1C2.5 1.7 3.2 1 4 1h8c.8 0 1.5.7 1.5 1.5v1" />
						</svg>
						{importing ? 'Importing…' : 'Restore from file'}
					</button>
				</div>
				<p class="mt-2 px-4 text-[12.5px] leading-[1.5] text-muted">
					Backups are plain JSON with every brew and bag. Restoring replaces items with matching IDs
					and adds the rest.
				</p>
			</div>

			{#if message}
				<div class="rounded-[14px] bg-success/10 px-3 py-2.5 text-[13px] text-success">
					{message}
				</div>
			{/if}
			{#if error}
				<div class="rounded-[14px] border border-danger/20 bg-danger/8 p-3 text-[13px] text-danger">
					{error}
				</div>
			{/if}

			<!-- Danger zone — lone destructive row in its own inset group -->
			<div class="mt-8">
				<Eyebrow class="mb-2 text-danger">DANGER ZONE</Eyebrow>
				<div class="overflow-hidden rounded-2xl border border-hairline bg-surface">
					<button
						type="button"
						onclick={handleWipe}
						disabled={brewCount === 0 && bagCount === 0}
						class="flex h-12 w-full items-center gap-2.5 px-4 text-left text-[14px] font-medium text-danger transition-colors hover:bg-danger/6 active:bg-danger/8 disabled:opacity-50"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 4h10M6 4V2.5h4V4M5 4v9c0 .8.7 1.5 1.5 1.5h3c.8 0 1.5-.7 1.5-1.5V4" />
						</svg>
						{auth.user ? 'Delete all data' : 'Wipe all data'}
					</button>
				</div>
				<p class="mt-2 px-4 text-[12.5px] leading-[1.5] text-muted">
					{#if auth.user}
						Deletes every brew and bag — from this device <strong class="text-ink-70"
							>and your account</strong
						> — but keeps the account itself. Cannot be undone; download a backup first. To remove your
						account entirely, use “Delete account” above.
					{:else}
						Deletes every brew and bag from this device. Cannot be undone — download a backup first.
					{/if}
				</p>
			</div>

			<!-- About -->
			<div class="mt-8 border-t border-hairline pt-6">
				<Eyebrow class="mb-2">ABOUT</Eyebrow>
				<a
					href="/privacy"
					class="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 transition-colors hover:bg-paper/50"
				>
					<span class="text-[14px] text-ink">Privacy Policy</span>
					<svg
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="shrink-0 text-faint"
					>
						<path d="M6 3l5 5-5 5" />
					</svg>
				</a>
				<p class="mt-3 text-center font-mono text-[11px] tracking-[0.04em] text-faint">
					Coffee Brew Log · v{APP_VERSION}
				</p>
			</div>
		</div>
	{/if}
</div>
