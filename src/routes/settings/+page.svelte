<script lang="ts">
	import { onMount } from 'svelte';
	import type { Bag, Brew } from '$lib/db/types';
	import { BagSchema, BrewSchema } from '$lib/db/types';
	import { listBags, listBrews, bulkImport, wipeAllData } from '$lib/db/repository';
	import { auth, signOut } from '$lib/auth.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	let brewCount = $state(0);
	let bagCount = $state(0);
	let loading = $state(true);
	let importing = $state(false);
	let message = $state<string | null>(null);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | undefined>();

	async function loadCounts() {
		const [brews, bags] = await Promise.all([listBrews(), listBags()]);
		brewCount = brews.length;
		bagCount = bags.length;
		loading = false;
	}

	onMount(loadCounts);

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
		if (
			!confirm(
				`Delete all ${brewCount} brew${brewCount === 1 ? '' : 's'} and ${bagCount} bag${bagCount === 1 ? '' : 's'}? This cannot be undone.`
			)
		)
			return;
		if (!confirm('Final confirmation — type cancel to abort. Everything will be erased.'))
			return;
		await wipeAllData();
		await loadCounts();
		message = 'All data wiped.';
		error = null;
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

			if (
				!parsed ||
				typeof parsed !== 'object' ||
				!('brews' in parsed) ||
				!('bags' in parsed)
			) {
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
			class="text-muted hover:text-ink flex h-9 items-center gap-1 text-[15px] transition-colors"
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
			class="font-display text-ink mt-1 text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
		>Data</h1>
		<p class="text-muted font-display mt-2 text-[15px] italic">
			Everything lives on this device. Back up regularly.
		</p>
	</div>

	{#if !loading}
		<div class="mt-6 space-y-[18px] px-[22px]">
			<!-- Account -->
			<div>
				<Eyebrow class="mb-2">ACCOUNT</Eyebrow>
				{#if auth.user}
					<div
						class="bg-surface border-hairline flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
					>
						<div class="min-w-0">
							<div class="text-ink truncate text-[14px]">{auth.user.email}</div>
							<div
								class="text-muted mt-0.5 font-mono text-[10.5px] tracking-[0.04em]"
							>Signed in · sync rolling out</div>
						</div>
						<button
							type="button"
							onclick={signOut}
							class="text-muted hover:text-ink shrink-0 text-[12px] transition-colors"
						>Sign out</button>
					</div>
				{:else}
					<a
						href="/auth"
						class="bg-surface border-hairline hover:bg-paper/50 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors"
					>
						<div>
							<div class="text-ink text-[14px]">Sign in</div>
							<div
								class="text-muted mt-0.5 text-[12px]"
							>Sync brews across devices.</div>
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
							class="text-faint shrink-0"
						>
							<path d="M6 3l5 5-5 5" />
						</svg>
					</a>
				{/if}
			</div>

			<!-- Counts -->
			<div class="bg-surface border-hairline grid grid-cols-2 gap-3 rounded-2xl border p-4">
				<div>
					<div
						class="text-muted font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
					>BREWS</div>
					<div
						class="font-display text-ink mt-1 text-2xl font-medium tracking-[-0.01em]"
					>{brewCount}</div>
				</div>
				<div>
					<div
						class="text-muted font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
					>BAGS</div>
					<div
						class="font-display text-ink mt-1 text-2xl font-medium tracking-[-0.01em]"
					>{bagCount}</div>
				</div>
			</div>

			<!-- Export -->
			<div>
				<Eyebrow class="mb-2">EXPORT</Eyebrow>
				<p class="text-muted mb-3 text-[13px] leading-[1.5]">
					Download all brews and bags as JSON. Drop the file onto Import to restore.
				</p>
				<button
					type="button"
					onclick={handleExport}
					disabled={brewCount === 0 && bagCount === 0}
					class="bg-copper text-paper hover:bg-copper-dk inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-[14px] font-medium transition-colors disabled:opacity-50"
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
			</div>

			<!-- Import -->
			<div>
				<Eyebrow class="mb-2">IMPORT</Eyebrow>
				<p class="text-muted mb-3 text-[13px] leading-[1.5]">
					Restore from a previous export. Items with matching IDs are replaced; others are added.
				</p>
				<input
					type="file"
					accept=".json,application/json"
					bind:this={fileInput}
					onchange={handleFileChange}
					class="hidden"
				/>
				<button
					type="button"
					onclick={() => fileInput?.click()}
					disabled={importing}
					class="bg-ink/[0.04] text-ink hover:bg-ink/[0.08] inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-[14px] font-medium transition-colors disabled:opacity-50"
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

			{#if message}
				<div
					class="bg-success/10 text-success rounded-[14px] px-3 py-2.5 text-[13px]"
				>{message}</div>
			{/if}
			{#if error}
				<div
					class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-[13px]"
				>{error}</div>
			{/if}

			<!-- Danger zone -->
			<div class="border-hairline mt-8 border-t pt-6">
				<Eyebrow class="text-danger mb-2">DANGER ZONE</Eyebrow>
				<p class="text-muted mb-3 text-[13px] leading-[1.5]">
					Delete every brew and bag from this device. Cannot be undone. Export first if you'd like a
					safety net.
				</p>
				<button
					type="button"
					onclick={handleWipe}
					disabled={brewCount === 0 && bagCount === 0}
					class="bg-danger/8 text-danger hover:bg-danger/14 inline-flex h-12 items-center gap-2 rounded-2xl px-5 text-[14px] font-medium transition-colors disabled:opacity-50"
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
					Wipe all data
				</button>
			</div>
		</div>
	{/if}
</div>
