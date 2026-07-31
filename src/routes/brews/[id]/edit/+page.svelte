<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getBrewById, updateBrew, listBrews, listBags } from '$lib/db/repository';
	import { BrewSchema, type Bag, type BagSnapshot, type Extraction } from '$lib/db/types';
	import MethodPicker from '$lib/components/MethodPicker.svelte';
	import BagPicker from '$lib/components/BagPicker.svelte';
	import Button from '$lib/components/Button.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';
	import StarRow from '$lib/components/StarRow.svelte';
	import PhotoInput from '$lib/components/PhotoInput.svelte';
	import PublishToBlogSection from '$lib/components/PublishToBlogSection.svelte';
	import { BLOG_ENABLED } from '$lib/blog/config';

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
		photo: string | null | undefined;
		rating: number | null;
		balance: Balance;
		brewedAtLocal: string;
		// Blog publishing — user-editable; publishedAt + bagSnapshot are derived
		// at the repository boundary and intentionally not in the snapshot.
		published: boolean;
		blogTitle: string;
		blogBody: string;
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
	// Espresso dial-in taste verdict — carried through edits, no UI here.
	let extractionStash: Extraction | undefined = undefined;
	let brewTimeSeconds = $state<number | null>(null);
	let brewMinutes = $state<number | null>(null);
	let brewSecondsPart = $state<number | null>(null);
	let grindSetting = $state('');
	let notes = $state('');
	let photo = $state<string | null | undefined>(undefined);
	let rating = $state<number | null>(null);
	let balance = $state<Balance>('');
	let brewedAtLocal = $state('');
	let isFavorite = $state<boolean | undefined>(undefined);
	// Blog publishing state. publishedAt + bagSnapshot are loaded from the
	// stored brew but only the repository mutates them — never the form.
	let published = $state(false);
	let blogTitle = $state('');
	let blogBody = $state('');
	let publishedAt = $state<string | undefined>(undefined);
	let bagSnapshot = $state<BagSnapshot | undefined>(undefined);
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
			photo,
			rating,
			balance,
			brewedAtLocal,
			published,
			blogTitle,
			blogBody
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
		photo: 'photo',
		rating: 'rating',
		balance: 'balance',
		brewedAtLocal: 'brewed at',
		// All three publish fields collapse to a single "blog" dirty label.
		published: 'blog',
		blogTitle: 'blog',
		blogBody: 'blog'
	};

	const dirtyKeys = $derived.by<string[]>(() => {
		const orig = originalSnapshot;
		if (!orig) return [];
		const current = snap() as unknown as Record<string, unknown>;
		const original = orig as unknown as Record<string, unknown>;
		return Object.keys(current).filter((k) => current[k] !== original[k]);
	});

	// Distinct labels, in first-seen order — two keys can share one label. Deduped
	// with indexOf rather than a Set: this is a throwaway inside a $derived, so
	// there's no reactive state to model, and the field list is a dozen entries.
	const dirtyFields = $derived.by<string[]>(() =>
		dirtyKeys
			.map((key) => FIELD_LABELS[key] ?? key)
			.filter((label, i, all) => all.indexOf(label) === i)
	);

	const dirty = $derived(dirtyFields.length > 0);

	function isDirty(...keys: string[]): boolean {
		return keys.some((k) => dirtyKeys.includes(k));
	}

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
			// Dial-in fields: no edit UI here (yet) — pass through untouched so
			// an edit-save never strips them (whole-row put + upsert).
			waterTempC = found.waterTempC ?? null;
			extractionStash = found.extraction;
		} else {
			waterGrams = found.waterGrams;
			waterTempC = found.waterTempC ?? null;
			brewMinutes = Math.floor(found.brewTimeSeconds / 60);
			brewSecondsPart = found.brewTimeSeconds % 60;
		}
		grindSetting = found.grindSetting;
		notes = found.notes ?? '';
		photo = found.photo ?? undefined;
		rating = found.rating ?? null;
		balance = (found.balance ?? '') as Balance;
		brewedAtLocal = isoToLocal(found.brewedAt);
		isFavorite = found.isFavorite;
		published = found.published ?? false;
		blogTitle = found.blogTitle ?? '';
		blogBody = found.blogBody ?? '';
		publishedAt = found.publishedAt;
		bagSnapshot = found.bagSnapshot;

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
				if (d.photo !== undefined) photo = d.photo;
				if (d.rating !== undefined) rating = d.rating;
				if (d.balance !== undefined) balance = d.balance;
				if (d.brewedAtLocal !== undefined) brewedAtLocal = d.brewedAtLocal;
				if (d.published !== undefined) published = d.published;
				if (d.blogTitle !== undefined) blogTitle = d.blogTitle;
				if (d.blogBody !== undefined) blogBody = d.blogBody;
			} catch {
				// A corrupt draft is not worth surfacing — the form keeps the values
				// loaded from the brew itself, and the draft is dropped just below.
			}
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
		photo = orig.photo;
		rating = orig.rating;
		balance = orig.balance;
		brewedAtLocal = orig.brewedAtLocal;
		published = orig.published;
		blogTitle = orig.blogTitle;
		blogBody = orig.blogBody;
	}

	function saveDraft() {
		sessionStorage.setItem(DRAFT_KEY_PREFIX + brewId, JSON.stringify(snap()));
	}

	function handleCreateNewBag(name: string) {
		saveDraft();
		const returnTo = encodeURIComponent(`/brews/${brewId}/edit`);
		const nameParam = name ? `&name=${encodeURIComponent(name)}` : '';
		goto(resolve(`/bags/new?returnTo=${returnTo}${nameParam}`));
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

			// Switching an espresso brew to pour-over leaves MIN/SEC null; guard the empty
			// time here so it doesn't surface as a raw ZodError dump.
			if (method === 'pour-over' && (!Number.isFinite(totalBrewSeconds) || totalBrewSeconds <= 0)) {
				throw new Error('Enter the brew time (minutes and/or seconds).');
			}

			const trimmedTitle = blogTitle.trim();
			const trimmedBody = blogBody.trim();
			// Repository.applyPublishTransition does the publishedAt / bagSnapshot
			// derivation; we just forward what the form holds and the persisted
			// values for fields the form can't edit.
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
				photo,
				rating: rating ?? undefined,
				balance: balance || undefined,
				isFavorite,
				published,
				publishedAt,
				blogTitle: trimmedTitle || undefined,
				blogBody: trimmedBody || undefined,
				bagSnapshot
			};

			const candidate =
				method === 'espresso'
					? {
							...base,
							method: 'espresso' as const,
							yieldGrams: yieldGrams ?? NaN,
							extraction: extractionStash,
							waterTempC: waterTempC ?? undefined
						}
					: {
							...base,
							method: 'pour-over' as const,
							waterGrams: waterGrams ?? NaN,
							waterTempC: waterTempC ?? undefined
						};

			const brew = BrewSchema.parse(candidate);
			await updateBrew(brew);
			await goto(resolve('/brews/[id]', { id: brewId }));
		} catch (err) {
			// A ZodError's .message is a JSON dump of all issues — show the first issue's
			// human message instead. (ZodError is an Error, so check .issues first.)
			if (err && typeof err === 'object' && 'issues' in err) {
				const issues = (err as { issues?: Array<{ message?: string }> }).issues;
				error =
					Array.isArray(issues) && issues[0]?.message
						? issues[0].message
						: 'Please check the form and try again.';
			} else {
				error = err instanceof Error ? err.message : String(err);
			}
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Edit brew</title>
</svelte:head>

<!-- Mode chrome: 3px copper bar fixed at top -->
<div class="fixed inset-x-0 top-0 z-[100] h-[3px] bg-copper" aria-hidden="true"></div>

{#if loading}
	<p class="py-8 text-center text-sm text-muted">Loading…</p>
{:else if notFound}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Brew not found.</p>
		<a href={resolve('/brews')} class="mt-3 inline-block text-copper underline">Back to brews</a>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
		<!-- Header row -->
		<div class="flex items-center justify-between px-[18px] pe-14 pt-[10px] pb-[10px] sm:pe-[18px]">
			<a
				href={resolve('/brews/[id]', { id: brewId })}
				onclick={handleCancel}
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
				Cancel
			</a>

			<div class="text-center">
				<div class="font-mono text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
					EDITING
				</div>
				{#if brewNumber != null}
					<div
						class="mt-0.5 font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase"
					>
						BREW · #{brewNumber}
					</div>
				{/if}
			</div>

			<Button size="regular" variant="prominent" type="submit" disabled={!dirty || submitting}
				>{submitting ? 'Saving…' : 'Save changes'}</Button
			>
		</div>

		<!-- Reset bar when dirty -->
		{#if dirty}
			<div
				class="mx-[22px] mb-2.5 flex items-center justify-between gap-3 rounded-[10px] bg-copper-lt px-3 py-2 text-copper-dk"
			>
				<div class="flex items-center gap-2 text-[12.5px]">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-copper" aria-hidden="true"></span>
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
					class="font-mono text-[10.5px] font-medium tracking-[0.1em] text-copper uppercase transition-colors hover:text-copper-dk"
					>Reset</button
				>
			</div>
		{/if}

		<div class="space-y-[18px] px-[22px] pt-2">
			<!-- Method -->
			<div class="relative">
				{#if isDirty('method')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('method')}>METHOD</Eyebrow>
				<MethodPicker bind:value={method} />
			</div>

			<!-- Coffee (bag) -->
			<div class="relative">
				{#if isDirty('bagId')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('bagId')}>COFFEE</Eyebrow>
				<BagPicker bind:bagId oncreatenew={handleCreateNewBag} />
			</div>

			<!-- Dose + Yield/Water -->
			<div class="relative grid grid-cols-2 gap-2.5">
				{#if isDirty('doseGrams', 'yieldGrams', 'waterGrams')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<div>
					<Eyebrow class="mb-2" dirty={isDirty('doseGrams')}>DOSE</Eyebrow>
					<div
						class="field-wrapper flex h-14 items-center gap-1.5 rounded-[14px] border border-hairline bg-surface px-4 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<input
							type="number"
							bind:value={doseGrams}
							step="0.1"
							min="0.1"
							required
							inputmode="decimal"
							placeholder="0.0"
							class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
						/>
						<span class="font-mono text-[13px] text-muted">g</span>
					</div>
				</div>
				<div>
					<Eyebrow class="mb-2" dirty={isDirty('yieldGrams', 'waterGrams')}
						>{method === 'espresso' ? 'YIELD' : 'WATER'}</Eyebrow
					>
					<div
						class="field-wrapper flex h-14 items-center gap-1.5 rounded-[14px] border border-hairline bg-surface px-4 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
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
								class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
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
								class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
							/>
						{/if}
						<span class="font-mono text-[13px] text-muted">g</span>
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
								class="inline-flex h-9 items-center rounded-full bg-copper-lt px-2.5 font-mono text-[12px] tracking-[-0.01em] text-copper"
								>= 1:{actualRatio.toFixed(1)} actual</span
							>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Grind -->
			<div class="relative">
				{#if isDirty('grindSetting')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('grindSetting')}>
					GRIND · {method === 'espresso' ? 'LAGOM CASA' : 'FELLOW ODE 2'}
				</Eyebrow>
				<input
					type="text"
					bind:value={grindSetting}
					required
					placeholder={method === 'espresso' ? 'e.g. 1.3' : 'e.g. 5.5'}
					class="h-12 w-full rounded-[14px] border border-hairline bg-paper px-3.5 font-mono text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				/>
			</div>

			<!-- Water temp (pour-over only) -->
			{#if method === 'pour-over'}
				<div class="relative">
					{#if isDirty('waterTempC')}
						<div
							class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
							aria-hidden="true"
						></div>
					{/if}
					<Eyebrow class="mb-2" dirty={isDirty('waterTempC')}>WATER TEMP (OPTIONAL)</Eyebrow>
					<div
						class="field-wrapper flex h-12 items-center gap-1.5 rounded-[14px] border border-hairline bg-paper px-3.5 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<input
							type="number"
							bind:value={waterTempC}
							step="1"
							min="1"
							max="100"
							inputmode="numeric"
							placeholder="0"
							class="min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em] text-ink placeholder:text-muted"
						/>
						<span class="font-mono text-[12px] text-muted">°C</span>
					</div>
				</div>
			{/if}

			<!-- Brew time -->
			<div class="relative">
				{#if isDirty('brewTimeSeconds', 'brewMinutes', 'brewSecondsPart')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('brewTimeSeconds', 'brewMinutes', 'brewSecondsPart')}
					>BREW TIME</Eyebrow
				>
				{#if method === 'espresso'}
					<div
						class="field-wrapper flex h-14 items-center gap-1.5 rounded-[14px] border border-hairline bg-surface px-4 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<input
							type="number"
							bind:value={brewTimeSeconds}
							step="1"
							min="1"
							required
							inputmode="numeric"
							placeholder="0"
							class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
						/>
						<span class="font-mono text-[13px] text-muted">sec</span>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-2.5">
						<div>
							<div
								class="mb-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								MIN
							</div>
							<input
								type="number"
								bind:value={brewMinutes}
								step="1"
								min="0"
								inputmode="numeric"
								placeholder="0"
								class="h-14 w-full rounded-[14px] border border-hairline bg-surface px-4 font-mono text-2xl font-medium tracking-[-0.02em] text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
							/>
						</div>
						<div>
							<div
								class="mb-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								SEC
							</div>
							<input
								type="number"
								bind:value={brewSecondsPart}
								step="1"
								min="0"
								max="59"
								inputmode="numeric"
								placeholder="0"
								class="h-14 w-full rounded-[14px] border border-hairline bg-surface px-4 font-mono text-2xl font-medium tracking-[-0.02em] text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
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
			<div class="relative">
				{#if isDirty('balance')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('balance')}>BALANCE (OPTIONAL)</Eyebrow>
				<BalanceScale value={balance || undefined} oninput={(v) => (balance = v)} />
				{#if balance}
					<button
						type="button"
						onclick={() => (balance = '')}
						class="mt-1 text-[11px] text-muted transition-colors hover:text-ink">Clear</button
					>
				{/if}
			</div>

			<!-- Rating -->
			<div class="relative">
				{#if isDirty('rating')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('rating')}>RATING (OPTIONAL)</Eyebrow>
				<div class="flex items-center gap-4">
					<StarRow value={rating ?? 0} size={28} oninput={(v) => (rating = v)} />
					<span class="font-mono text-[15px] font-medium text-ink">
						{rating != null ? `${rating.toFixed(1)} / 5` : '—'}
					</span>
					{#if rating != null}
						<button
							type="button"
							onclick={() => (rating = null)}
							class="ml-auto text-[11px] text-muted transition-colors hover:text-ink">Clear</button
						>
					{/if}
				</div>
			</div>

			<!-- Brewed at -->
			<div class="relative">
				{#if isDirty('brewedAtLocal')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('brewedAtLocal')}>BREWED AT</Eyebrow>
				<input
					type="datetime-local"
					bind:value={brewedAtLocal}
					required
					class="h-12 w-full rounded-[14px] border border-hairline bg-paper px-3.5 text-ink transition outline-none focus:border-copper focus:ring-2 focus:ring-copper/25"
				/>
			</div>

			<!-- Notes -->
			<div class="relative">
				{#if isDirty('notes')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('notes')}>NOTES</Eyebrow>
				<textarea
					bind:value={notes}
					rows="3"
					placeholder="Stone fruit, jasmine on cool-down…"
					class="w-full resize-none rounded-[14px] border border-hairline bg-paper px-3.5 py-3.5 font-display text-[15px] leading-[1.45] text-ink-70 italic transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				></textarea>
			</div>

			<!-- Photo -->
			<div class="relative">
				{#if isDirty('photo')}
					<div
						class="absolute top-1 bottom-1 -left-2 w-1 rounded-full bg-copper"
						aria-hidden="true"
					></div>
				{/if}
				<Eyebrow class="mb-2" dirty={isDirty('photo')}>PHOTO</Eyebrow>
				<PhotoInput bind:photo label="photo" />
			</div>

			<!-- Publish to blog (Variant B — tinted card). Hidden until the public
			     blog is live — see BLOG_ENABLED in $lib/blog/config. -->
			{#if BLOG_ENABLED}
				<PublishToBlogSection
					bind:published
					bind:blogTitle
					bind:blogBody
					{publishedAt}
					dirty={isDirty('published', 'blogTitle', 'blogBody')}
				/>
			{/if}

			{#if error}
				<div class="rounded-[14px] border border-danger/20 bg-danger/8 p-3 text-sm text-danger">
					{error}
				</div>
			{/if}
		</div>
	</form>
{/if}
