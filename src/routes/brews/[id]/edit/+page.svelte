<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getBrewById, updateBrew, listBrews, listBags } from '$lib/db/repository';
	import { BrewSchema, type Bag } from '$lib/db/types';
	import MethodPicker from '$lib/components/MethodPicker.svelte';
	import BagPicker from '$lib/components/BagPicker.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';

	type Method = 'espresso' | 'pour-over';
	type Balance = '' | 'light' | 'balanced' | 'heavy';

	type Snapshot = {
		method: Method;
		bagId: string | undefined;
		doseGrams: number | null;
		yieldGrams: number | null;
		waterGrams: number | null;
		waterTempC: number | null;
		brewTimeSeconds: number | null;
		brewMinutes: number | null;
		brewSecondsPart: number | null;
		grindSetting: string;
		notes: string;
		rating: number | null;
		balance: Balance;
		brewedAtLocal: string;
	};

	const DRAFT_KEY_PREFIX = 'brew-edit-draft-';
	const brewId = $derived(page.params.id as string);

	let method = $state<Method>('espresso');
	let bagId = $state<string | undefined>(undefined);
	let allBags = $state<Bag[]>([]);
	let doseGrams = $state<number | null>(null);
	let yieldGrams = $state<number | null>(null);
	let waterGrams = $state<number | null>(null);
	let waterTempC = $state<number | null>(null);
	let brewTimeSeconds = $state<number | null>(null);
	let brewMinutes = $state<number | null>(null);
	let brewSecondsPart = $state<number | null>(null);
	let grindSetting = $state('');
	let notes = $state('');
	let rating = $state<number | null>(null);
	let balance = $state<Balance>('');
	let brewedAtLocal = $state('');
	let isFavorite = $state<boolean | undefined>(undefined);
	let originalSnapshot = $state<Snapshot | null>(null);
	let brewNumber = $state<number | null>(null);
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let loading = $state(true);
	let notFound = $state(false);

	const selectedBag = $derived(allBags.find((b) => b.id === bagId) ?? null);

	function snap(): Snapshot {
		return {
			method,
			bagId,
			doseGrams,
			yieldGrams,
			waterGrams,
			waterTempC,
			brewTimeSeconds,
			brewMinutes,
			brewSecondsPart,
			grindSetting,
			notes,
			rating,
			balance,
			brewedAtLocal
		};
	}

	function isoToLocal(iso: string): string {
		const date = new Date(iso);
		const tz = date.getTimezoneOffset() * 60_000;
		return new Date(date.getTime() - tz).toISOString().slice(0, 16);
	}

	const FIELD_LABELS: Record<string, string> = {
		method: 'method',
		bagId: 'bag',
		doseGrams: 'dose',
		yieldGrams: 'yield',
		waterGrams: 'water',
		waterTempC: 'water temp',
		brewTimeSeconds: 'brew time',
		brewMinutes: 'brew time',
		brewSecondsPart: 'brew time',
		grindSetting: 'grind',
		notes: 'notes',
		rating: 'rating',
		balance: 'balance',
		brewedAtLocal: 'brewed at'
	};

	const dirtyFields = $derived.by<string[]>(() => {
		const orig = originalSnapshot;
		if (!orig) return [];
		const current = snap() as unknown as Record<string, unknown>;
		const original = orig as unknown as Record<string, unknown>;
		const fields = new Set<string>();
		for (const key of Object.keys(current)) {
			if (current[key] !== original[key]) {
				fields.add(FIELD_LABELS[key] ?? key);
			}
		}
		return Array.from(fields);
	});

	const dirty = $derived(dirtyFields.length > 0);

	onMount(async () => {
		const found = await getBrewById(brewId);
		if (!found) {
			notFound = true;
			loading = false;
			return;
		}

		method = found.method;
		bagId = found.bagId;
		doseGrams = found.doseGrams;
		if (found.method === 'espresso') {
			yieldGrams = found.yieldGrams;
			brewTimeSeconds = found.brewTimeSeconds;
		} else {
			waterGrams = found.waterGrams;
			waterTempC = found.waterTempC ?? null;
			brewMinutes = Math.floor(found.brewTimeSeconds / 60);
			brewSecondsPart = found.brewTimeSeconds % 60;
		}
		grindSetting = found.grindSetting;
		notes = found.notes ?? '';
		rating = found.rating ?? null;
		balance = (found.balance ?? '') as Balance;
		brewedAtLocal = isoToLocal(found.brewedAt);
		isFavorite = found.isFavorite;

		originalSnapshot = snap();

		// Restore draft if present (e.g., returning from /bags/new)
		const raw = sessionStorage.getItem(DRAFT_KEY_PREFIX + brewId);
		if (raw) {
			try {
				const d = JSON.parse(raw) as Partial<Snapshot>;
				if (d.method !== undefined) method = d.method;
				if (d.bagId !== undefined) bagId = d.bagId;
				if (d.doseGrams !== undefined) doseGrams = d.doseGrams;
				if (d.yieldGrams !== undefined) yieldGrams = d.yieldGrams;
				if (d.waterGrams !== undefined) waterGrams = d.waterGrams;
				if (d.waterTempC !== undefined) waterTempC = d.waterTempC;
				if (d.brewTimeSeconds !== undefined) brewTimeSeconds = d.brewTimeSeconds;
				if (d.brewMinutes !== undefined) brewMinutes = d.brewMinutes;
				if (d.brewSecondsPart !== undefined) brewSecondsPart = d.brewSecondsPart;
				if (d.grindSetting !== undefined) grindSetting = d.grindSetting;
				if (d.notes !== undefined) notes = d.notes;
				if (d.rating !== undefined) rating = d.rating;
				if (d.balance !== undefined) balance = d.balance;
				if (d.brewedAtLocal !== undefined) brewedAtLocal = d.brewedAtLocal;
			} catch {}
			sessionStorage.removeItem(DRAFT_KEY_PREFIX + brewId);
		}

		// URL ?bagId= overrides (after returning from /bags/new)
		const urlBagId = page.url.searchParams.get('bagId');
		if (urlBagId) bagId = urlBagId;

		allBags = await listBags();
		const all = await listBrews();
		const asc = [...all].sort((a, b) => a.brewedAt.localeCompare(b.brewedAt));
		brewNumber = asc.findIndex((b) => b.id === brewId) + 1;

		loading = false;
	});

	function applyRatio(target: number) {
		if (doseGrams && doseGrams > 0) waterGrams = Math.round(doseGrams * target);
	}

	function applyTimeSeconds(total: number) {
		brewMinutes = Math.floor(total / 60);
		brewSecondsPart = total % 60;
	}

	const actualRatio = $derived.by(() => {
		if (!doseGrams || doseGrams <= 0) return null;
		if (method === 'pour-over' && waterGrams) return waterGrams / doseGrams;
		if (method === 'espresso' && yieldGrams) return yieldGrams / doseGrams;
		return null;
	});

	function reset() {
		const orig = originalSnapshot;
		if (!orig) return;
		if (!confirm(`Discard ${dirtyFields.length} change${dirtyFields.length === 1 ? '' : 's'}?`))
			return;
		method = orig.method;
		bagId = orig.bagId;
		doseGrams = orig.doseGrams;
		yieldGrams = orig.yieldGrams;
		waterGrams = orig.waterGrams;
		waterTempC = orig.waterTempC;
		brewTimeSeconds = orig.brewTimeSeconds;
		brewMinutes = orig.brewMinutes;
		brewSecondsPart = orig.brewSecondsPart;
		grindSetting = orig.grindSetting;
		notes = orig.notes;
		rating = orig.rating;
		balance = orig.balance;
		brewedAtLocal = orig.brewedAtLocal;
	}

	function saveDraft() {
		sessionStorage.setItem(DRAFT_KEY_PREFIX + brewId, JSON.stringify(snap()));
	}

	function handleCreateNewBag(name: string) {
		saveDraft();
		const params = new URLSearchParams({ returnTo: `/brews/${brewId}/edit` });
		if (name) params.set('name', name);
		goto(`/bags/new?${params}`);
	}

	function handleCancel(e: MouseEvent) {
		if (dirty) {
			if (
				!confirm(
					`Discard ${dirtyFields.length} unsaved change${dirtyFields.length === 1 ? '' : 's'}?`
				)
			) {
				e.preventDefault();
			}
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!dirty) return;
		error = null;
		submitting = true;

		try {
			if (!selectedBag) throw new Error('Pick or create a bag for this brew.');

			const totalBrewSeconds =
				method === 'espresso'
					? (brewTimeSeconds ?? NaN)
					: (brewMinutes ?? 0) * 60 + (brewSecondsPart ?? 0);

			const base = {
				id: brewId,
				brewedAt: new Date(brewedAtLocal).toISOString(),
				bagId: selectedBag.id,
				coffeeName: selectedBag.name,
				roaster: selectedBag.roaster,
				doseGrams: doseGrams ?? NaN,
				brewTimeSeconds: totalBrewSeconds,
				grindSetting: grindSetting.trim(),
				notes: notes.trim() || undefined,
				rating: rating ?? undefined,
				balance: balance || undefined,
				isFavorite
			};

			const candidate =
				method === 'espresso'
					? { ...base, method: 'espresso' as const, yieldGrams: yieldGrams ?? NaN }
					: {
							...base,
							method: 'pour-over' as const,
							waterGrams: waterGrams ?? NaN,
							waterTempC: waterTempC ?? undefined
						};

			const brew = BrewSchema.parse(candidate);
			await updateBrew(brew);
			await goto(`/brews/${brewId}`);
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Edit brew</title>
</svelte:head>

<!-- Mode chrome: 3px copper bar fixed at top -->
<div class="bg-copper fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden="true"></div>

{#if loading}
	<p class="text-muted py-8 text-center text-sm">Loading…</p>
{:else if notFound}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Brew not found.</p>
		<a href="/brews" class="text-copper mt-3 inline-block underline">Back to brews</a>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
		<!-- Header row -->
		<div class="flex items-center justify-between px-[18px] pt-[10px] pb-[10px]">
			<a
				href="/brews/{brewId}"
				onclick={handleCancel}
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
				Cancel
			</a>

			<div class="text-center">
				<div
					class="text-copper font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
				>EDITING</div>
				{#if brewNumber != null}
					<div
						class="text-muted mt-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]"
					>BREW · #{brewNumber}</div>
				{/if}
			</div>

			<button
				type="submit"
				disabled={!dirty || submitting}
				class={dirty
					? 'bg-copper text-paper hover:bg-copper-dk h-9 rounded-lg px-3.5 text-[13px] font-semibold transition-colors'
					: 'bg-ink/[0.08] text-muted h-9 cursor-not-allowed rounded-lg px-3.5 text-[13px] font-semibold'}
			>{submitting ? 'Saving…' : 'Save changes'}</button>
		</div>

		<!-- Reset bar when dirty -->
		{#if dirty}
			<div
				class="bg-copper-lt text-copper-dk mx-[22px] mb-2.5 flex items-center justify-between gap-3 rounded-[10px] px-3 py-2"
			>
				<div class="flex items-center gap-2 text-[12.5px]">
					<span
						class="bg-copper inline-block h-1.5 w-1.5 rounded-full"
						aria-hidden="true"
					></span>
					<span
						><strong>{dirtyFields.length}</strong> unsaved change{dirtyFields.length === 1
							? ''
							: 's'} ·
						<span class="text-copper">{dirtyFields.join(', ')}</span></span
					>
				</div>
				<button
					type="button"
					onclick={reset}
					class="text-copper hover:text-copper-dk font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase transition-colors"
				>Reset</button>
			</div>
		{/if}

		<div class="space-y-[18px] px-[22px] pt-2">
			<!-- Method -->
			<div>
				<Eyebrow class="mb-2">METHOD</Eyebrow>
				<MethodPicker bind:value={method} />
			</div>

			<!-- Coffee (bag) -->
			<div>
				<Eyebrow class="mb-2">COFFEE</Eyebrow>
				<BagPicker bind:bagId oncreatenew={handleCreateNewBag} />
			</div>

			<!-- Dose + Yield/Water -->
			<div class="grid grid-cols-2 gap-2.5">
				<div>
					<Eyebrow class="mb-2">DOSE</Eyebrow>
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
					>
						<input
							type="number"
							bind:value={doseGrams}
							step="0.1"
							min="0.1"
							required
							inputmode="decimal"
							placeholder="0.0"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
						/>
						<span class="text-muted font-mono text-[13px]">g</span>
					</div>
				</div>
				<div>
					<Eyebrow class="mb-2">{method === 'espresso' ? 'YIELD' : 'WATER'}</Eyebrow>
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
					>
						{#if method === 'espresso'}
							<input
								type="number"
								bind:value={yieldGrams}
								step="0.1"
								min="0.1"
								required
								inputmode="decimal"
								placeholder="0.0"
								class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
							/>
						{:else}
							<input
								type="number"
								bind:value={waterGrams}
								step="1"
								min="1"
								required
								inputmode="decimal"
								placeholder="0"
								class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
							/>
						{/if}
						<span class="text-muted font-mono text-[13px]">g</span>
					</div>
				</div>
			</div>

			<!-- Ratio quick-pick (pour-over only) -->
			{#if method === 'pour-over'}
				<div>
					<Eyebrow class="mb-2">RATIO · QUICK</Eyebrow>
					<div class="flex flex-wrap items-center gap-2">
						{#each [15, 16, 17, 18] as r (r)}
							<Chip onclick={() => applyRatio(r)}>1:{r}</Chip>
						{/each}
						{#if actualRatio !== null}
							<span
								class="bg-copper-lt text-copper inline-flex h-9 items-center rounded-full px-2.5 font-mono text-[12px] tracking-[-0.01em]"
							>= 1:{actualRatio.toFixed(1)} actual</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Grind -->
			<div>
				<Eyebrow class="mb-2">
					GRIND · {method === 'espresso' ? 'LAGOM CASA' : 'FELLOW ODE 2'}
				</Eyebrow>
				<input
					type="text"
					bind:value={grindSetting}
					required
					placeholder={method === 'espresso' ? 'e.g. 1.3' : 'e.g. 5.5'}
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none focus:ring-2"
				/>
			</div>

			<!-- Water temp (pour-over only) -->
			{#if method === 'pour-over'}
				<div>
					<Eyebrow class="mb-2">WATER TEMP (OPTIONAL)</Eyebrow>
					<div
						class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
					>
						<input
							type="number"
							bind:value={waterTempC}
							step="1"
							min="1"
							max="100"
							inputmode="numeric"
							placeholder="0"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
						/>
						<span class="text-muted font-mono text-[12px]">°C</span>
					</div>
				</div>
			{/if}

			<!-- Brew time -->
			<div>
				<Eyebrow class="mb-2">BREW TIME</Eyebrow>
				{#if method === 'espresso'}
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
					>
						<input
							type="number"
							bind:value={brewTimeSeconds}
							step="1"
							min="1"
							required
							inputmode="numeric"
							placeholder="0"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
						/>
						<span class="text-muted font-mono text-[13px]">sec</span>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-2.5">
						<div>
							<div
								class="text-muted mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
							>MIN</div>
							<input
								type="number"
								bind:value={brewMinutes}
								step="1"
								min="0"
								inputmode="numeric"
								placeholder="0"
								class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-14 w-full rounded-[14px] border px-4 font-mono text-2xl font-medium tracking-[-0.02em] transition outline-none focus:ring-2"
							/>
						</div>
						<div>
							<div
								class="text-muted mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
							>SEC</div>
							<input
								type="number"
								bind:value={brewSecondsPart}
								step="1"
								min="0"
								max="59"
								inputmode="numeric"
								placeholder="0"
								class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-14 w-full rounded-[14px] border px-4 font-mono text-2xl font-medium tracking-[-0.02em] transition outline-none focus:ring-2"
							/>
						</div>
					</div>
					<div class="mt-2 flex flex-wrap gap-2">
						{#each [150, 165, 180, 195, 210, 240] as s (s)}
							<Chip onclick={() => applyTimeSeconds(s)}>
								{Math.floor(s / 60)}:{(s % 60).toString().padStart(2, '0')}
							</Chip>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Balance -->
			<div>
				<Eyebrow class="mb-2">BALANCE (OPTIONAL)</Eyebrow>
				<BalanceScale
					value={balance || undefined}
					oninput={(v) => (balance = v)}
				/>
				{#if balance}
					<button
						type="button"
						onclick={() => (balance = '')}
						class="text-muted hover:text-ink mt-1 text-[11px] transition-colors"
					>Clear</button>
				{/if}
			</div>

			<!-- Rating -->
			<div>
				<Eyebrow class="mb-2">RATING (1–5, OPTIONAL)</Eyebrow>
				<div
					class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
				>
					<input
						type="number"
						bind:value={rating}
						step="0.1"
						min="1"
						max="5"
						inputmode="decimal"
						placeholder="0.0"
						class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
					/>
					<span class="text-muted font-mono text-[12px]">/ 5</span>
				</div>
			</div>

			<!-- Brewed at -->
			<div>
				<Eyebrow class="mb-2">BREWED AT</Eyebrow>
				<input
					type="datetime-local"
					bind:value={brewedAtLocal}
					required
					class="bg-paper border-hairline text-ink focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
				/>
			</div>

			<!-- Notes -->
			<div>
				<Eyebrow class="mb-2">NOTES</Eyebrow>
				<textarea
					bind:value={notes}
					rows="3"
					placeholder="Stone fruit, jasmine on cool-down…"
					class="bg-paper border-hairline text-ink-70 placeholder:text-faint focus:border-copper focus:ring-copper/25 font-display w-full resize-none rounded-[14px] border px-3.5 py-3.5 text-[15px] leading-[1.45] italic transition outline-none focus:ring-2"
				></textarea>
			</div>

			{#if error}
				<div
					class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-sm"
				>{error}</div>
			{/if}
		</div>
	</form>
{/if}
