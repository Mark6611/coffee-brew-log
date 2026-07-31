<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Bag, Brew } from '$lib/db/types';
	import { BagSchema, BrewSchema } from '$lib/db/types';
	import { listBags, listBrews, bulkImport, wipeAllData, deleteAccount } from '$lib/db/repository';
	import { auth, signOut } from '$lib/auth.svelte';
	import { fullSync, getSyncStatus } from '$lib/sync';
	import { isNative } from '$lib/native';
	import { cloudSyncIsAvailable } from '$lib/native';
	import { runCloudSync, LAST_CLOUD_SYNC_KEY } from '$lib/cloudSync';
	import Button from '$lib/components/Button.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import ListGroup from '$lib/components/ListGroup.svelte';
	import ListRow from '$lib/components/ListRow.svelte';

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
	const APP_VERSION = '1.3';

	let brewCount = $state(0);
	let bagCount = $state(0);
	let loading = $state(true);
	let importing = $state(false);
	let message = $state<string | null>(null);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>();
	let syncing = $state(false);
	let wiping = $state(false);
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
		// The native wipe is network-bound now (it quiesces the in-flight CloudKit
		// pass, then pushes tombstones), so it can run for seconds with nothing on
		// screen changing. Without this guard a second tap re-enters against the
		// still-populated tables and races the first pass.
		if (wiping) return;
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
		wiping = true;
		try {
			await wipeAllData();
			message = 'All data wiped.';
			error = null;
		} catch (e) {
			// wipeAllData now awaits the server tombstones and throws if they don't land —
			// don't claim success for a wipe that didn't reach the account.
			error = e instanceof Error ? `Couldn’t wipe your account — ${e.message}` : 'Wipe failed.';
			message = null;
		} finally {
			wiping = false;
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
	<div class="flex items-center justify-between px-[18px] pe-14 pt-[6px] pb-[10px] sm:pe-[18px]">
		<a
			href={resolve('/')}
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
										<span class="text-muted"
											>iCloud is off — sign into iCloud in iOS Settings to sync between your
											devices.</span
										>
									{:else if cloudError}
										<span class="text-danger">{cloudError}</span>
									{:else}
										Synced {timeAgo(cloudLastSyncAt)}
									{/if}
								</div>
								<p class="mt-1 text-[11px] leading-[1.4] text-muted">
									Through your private iCloud only — no account, nothing shared with us.
								</p>
							</div>
							<Button
								size="regular"
								variant="bordered"
								onclick={handleCloudSyncNow}
								disabled={cloudSyncing || cloudAvailable === false}
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
							</Button>
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
									<div
										class="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted uppercase"
									>
										Signed in
									</div>
								</div>
								<Button size="regular" variant="plain" onclick={signOut}>Sign out</Button>
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
								<Button
									size="regular"
									variant="bordered"
									onclick={handleSyncNow}
									disabled={syncing}
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
								</Button>
							</div>

							<div class="border-t border-hairline pt-3">
								<Button
									size="regular"
									variant="destructive"
									onclick={handleDeleteAccount}
									disabled={deletingAccount}
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
										<path
											d="M3 4h10M6 4V2.5h4V4M5 4v9c0 .8.7 1.5 1.5 1.5h3c.8 0 1.5-.7 1.5-1.5V4"
										/>
									</svg>
									{deletingAccount ? 'Deleting account…' : 'Delete account'}
								</Button>
								<p class="mt-1.5 text-[11px] leading-[1.4] text-muted">
									Permanently deletes your account and all synced data.
								</p>
							</div>
						</div>
					{:else}
						<ListGroup>
							<ListRow
								href={resolve('/auth')}
								title="Sign in"
								subtitle="Sync brews across devices."
							/>
						</ListGroup>
					{/if}
				</div>
			{/if}

			<!-- Counts — grouped inset rows: label left, value right -->
			<ListGroup header="ON THIS DEVICE">
				<ListRow title="Brews" value={brewCount} />
				<ListRow title="Bags" value={bagCount} />
			</ListGroup>

			<!-- Backup — stacked bordered actions -->
			<div>
				<Eyebrow class="mb-2">BACKUP</Eyebrow>
				<input
					type="file"
					accept=".json,application/json"
					bind:this={fileInput}
					onchange={handleFileChange}
					class="hidden"
				/>
				<div class="flex flex-col gap-2.5">
					<Button
						size="medium"
						variant="bordered"
						full
						onclick={handleExport}
						disabled={brewCount === 0 && bagCount === 0}
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
					</Button>
					<Button
						size="medium"
						variant="bordered"
						full
						onclick={() => fileInput?.click()}
						disabled={importing}
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
					</Button>
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

			<!-- Danger zone — lone destructive action -->
			<div class="mt-8">
				<Eyebrow class="mb-2 text-danger">DANGER ZONE</Eyebrow>
				<!-- Destructive actions stay on a grouped inset row, the way iOS keeps
				     "Erase All Content and Settings" carded rather than floating. -->
				<div class="overflow-hidden rounded-2xl border border-hairline bg-surface">
					<Button
						size="medium"
						variant="destructive"
						full
						onclick={handleWipe}
						disabled={wiping || (brewCount === 0 && bagCount === 0)}
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
						{#if wiping}
							Erasing…
						{:else}
							{auth.user ? 'Delete all data' : 'Wipe all data'}
						{/if}
					</Button>
				</div>
				<p class="mt-2 px-4 text-[12.5px] leading-[1.5] text-muted">
					{#if auth.user}
						Deletes every brew and bag — from this device <strong class="text-ink-70"
							>and your account</strong
						> — but keeps the account itself. Cannot be undone; download a backup first. To remove your
						account entirely, use “Delete account” above.
					{:else if isNative}
						Deletes every brew and bag — from this device <strong class="text-ink-70"
							>and your iCloud</strong
						>, so they also disappear from your other devices. Cannot be undone — download a backup
						first.
					{:else}
						Deletes every brew and bag from this device. Cannot be undone — download a backup first.
					{/if}
				</p>
			</div>

			<!-- About -->
			<div class="mt-8 border-t border-hairline pt-6">
				<ListGroup header="ABOUT">
					<ListRow href={resolve('/privacy')} title="Privacy Policy" />
					<ListRow title="Version" value={APP_VERSION} />
				</ListGroup>
			</div>
		</div>
	{/if}
</div>
