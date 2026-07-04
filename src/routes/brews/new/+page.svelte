<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { addBrew, listBrews, listBags } from '$lib/db/repository';
	import { BrewSchema, type Bag, type Brew, type Extraction } from '$lib/db/types';
	import { resolveGrindSuggestion } from '$lib/brews/grind';
	import { espressoShotsFor, resolveNextShot } from '$lib/brews/dialin';
	import MethodPicker from '$lib/components/MethodPicker.svelte';
	import BagPicker from '$lib/components/BagPicker.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import StarRow from '$lib/components/StarRow.svelte';
	import ExtractionScale from '$lib/components/ExtractionScale.svelte';
	import ScaleAssist from '$lib/components/ScaleAssist.svelte';
	import { scale } from '$lib/scale/scale.svelte';

	type Method = 'espresso' | 'pour-over';
	type Balance = '' | 'light' | 'balanced' | 'heavy';

	const DRAFT_KEY = 'brew-form-draft';
	const ESPRESSO_DEFAULT_DOSE = 18;

	let method = $state<Method>('espresso');
	let bagId = $state<string | undefined>(undefined);
	let allBags = $state<Bag[]>([]);
	let allBrews = $state<Brew[]>([]);
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
	let extraction = $state<Extraction | ''>('');
	let brewedAtLocal = $state(localDatetimeNow());
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let brewCount = $state(0);
	let moreOpen = $state(false);
	// Quick-log mode: entered via ?quick=1 from the dial-in CTAs. Hides the
	// method/bag/brewed-at chrome and stages the grind handed over in the URL.
	let quickMode = $state(false);
	let urlGrind: string | null = null;

	const selectedBag = $derived(allBags.find((b) => b.id === bagId) ?? null);

	onMount(async () => {
		// URL params first: a quick-log entry (dial-in CTA) must never inherit a
		// stale draft — the draft belongs to whatever form run left it behind.
		const params = page.url.searchParams;
		quickMode = params.get('quick') === '1';
		urlGrind = params.get('grind');
		const urlBagId = params.get('bagId');
		if (params.get('method') === 'espresso') method = 'espresso';

		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (raw) {
			if (!quickMode) {
				try {
					const d = JSON.parse(raw);
					method = d.method ?? method;
					bagId = d.bagId ?? bagId;
					doseGrams = d.doseGrams ?? doseGrams;
					yieldGrams = d.yieldGrams ?? yieldGrams;
					waterGrams = d.waterGrams ?? waterGrams;
					waterTempC = d.waterTempC ?? waterTempC;
					brewTimeSeconds = d.brewTimeSeconds ?? brewTimeSeconds;
					brewMinutes = d.brewMinutes ?? brewMinutes;
					brewSecondsPart = d.brewSecondsPart ?? brewSecondsPart;
					grindSetting = d.grindSetting ?? grindSetting;
					notes = d.notes ?? notes;
					rating = d.rating ?? rating;
					balance = d.balance ?? balance;
					extraction = d.extraction ?? extraction;
					if (d.brewedAtLocal) brewedAtLocal = d.brewedAtLocal;
				} catch {}
			}
			sessionStorage.removeItem(DRAFT_KEY);
		}

		// URL bagId overrides the draft (returning from /bags/new, or a CTA)
		if (urlBagId) bagId = urlBagId;

		[allBags, allBrews] = await Promise.all([listBags(), listBrews()]);
		brewCount = allBrews.length;
	});

	// ── Dial-in context (espresso + selected bag) ─────────────────────────
	const bagShots = $derived(
		selectedBag && method === 'espresso' ? espressoShotsFor(selectedBag, allBrews) : []
	);
	const lastShot = $derived(bagShots.length > 0 ? bagShots[bagShots.length - 1] : null);
	const shotNumber = $derived(bagShots.length + 1);

	// Staged grind for espresso — the dial-in precedence layer that outranks
	// the plain grind engine while a dial-in is active:
	//   dialedRecipe > next-shot move (from the LAST shot) > existing engine.
	// Only 'dialed' auto-fills the field. A computed 'move'/'hold' is NEVER
	// auto-applied (handoff constraint) — it surfaces as a tap-to-use chip;
	// tapping (or arriving via a CTA's ?grind=) is the user applying it.
	type Stage = {
		kind: 'dialed' | 'move' | 'hold';
		value: string;
		provenance: string;
		deltaTicks: number | null;
	};
	const espressoStage = $derived.by<Stage | null>(() => {
		if (method !== 'espresso' || !selectedBag) return null;
		if (selectedBag.dialedRecipe) {
			return {
				kind: 'dialed',
				value: selectedBag.dialedRecipe.grind,
				provenance: 'DIALED RECIPE',
				deltaTicks: null
			};
		}
		if (!lastShot) return null;
		const next = resolveNextShot(lastShot, selectedBag);
		if (next?.kind === 'move' && next.target) {
			return {
				kind: 'move',
				value: next.target,
				provenance: `NEXT-SHOT MOVE · ${Math.abs(next.deltaTicks)} TICKS ${next.direction.toUpperCase()}`,
				deltaTicks: next.deltaTicks
			};
		}
		if (next?.kind === 'hold') {
			return {
				kind: 'hold',
				value: lastShot.grindSetting,
				provenance: 'ON TARGET — REPEAT',
				deltaTicks: 0
			};
		}
		return null;
	});

	// Read-time grind suggestion for the selected bag + method (advisory; see grind.ts).
	const grindSuggestion = $derived(
		selectedBag ? resolveGrindSuggestion(selectedBag, method, allBrews, allBags) : null
	);
	let grindApplied = $state(false);

	// Keep the grind field in step with the bag/method context.
	// Initial value priority (espresso): URL-staged grind (quick CTA, once) >
	// dial-in stage > engine prefill. Within one context the effect
	// short-circuits, so typing is never disturbed.
	let grindCtx = '';
	$effect(() => {
		const s = grindSuggestion;
		const stage = espressoStage;
		const key = `${bagId ?? ''}|${method}`;
		if (key === grindCtx) return;
		if (bagId && !selectedBag) return; // wait for data to load before claiming
		const firstInit = grindCtx === '';
		grindCtx = key;
		grindApplied = false;
		if (method === 'espresso') {
			if (quickMode && lastShot) {
				// Carry over what the strip advertises: last shot's dose + temp.
				doseGrams = lastShot.doseGrams;
				waterTempC = lastShot.waterTempC ?? null;
			} else if (doseGrams == null) {
				doseGrams = ESPRESSO_DEFAULT_DOSE;
			}
		} else if (doseGrams === ESPRESSO_DEFAULT_DOSE) {
			// Don't leak the espresso default into the pour-over form.
			doseGrams = null;
		}
		// Auto-fill sources only: an explicit URL handoff (user tapped a CTA),
		// the bag's settled recipe, or — when no dial-in stage exists — the
		// engine's same-bag prefill. Computed moves are chip-only.
		let autoFill: string | null = urlGrind;
		if (autoFill == null && stage?.kind === 'dialed') autoFill = stage.value;
		if (autoFill == null && stage == null && s?.kind === 'prefill') autoFill = s.value;
		urlGrind = null; // one-shot
		if (firstInit) {
			if (autoFill != null && grindSetting.trim() === '') grindSetting = autoFill;
		} else {
			grindSetting = autoFill ?? '';
		}
	});

	// Staged-grind chrome shows while the field still holds the staged value.
	const grindStaged = $derived.by(() => {
		const stage = espressoStage;
		if (stage == null) return null;
		if (grindSetting !== stage.value) return null;
		return stage;
	});

	function applyGrind() {
		if (grindSuggestion) {
			grindSetting = grindSuggestion.value;
			grindApplied = true;
		}
	}

	function applyStage() {
		const stage = espressoStage;
		if (stage) {
			grindSetting = stage.value;
			grindApplied = true;
		}
	}

	// Carried-over strip content (quick mode): what repeats from the last shot.
	const carriedTempC = $derived(
		lastShot?.method === 'espresso' ? (lastShot.waterTempC ?? null) : null
	);

	function saveDraft() {
		const draft = {
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
			extraction,
			brewedAtLocal
		};
		sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}

	function handleCreateNewBag(name: string) {
		saveDraft();
		goto(`/bags/new?name=${encodeURIComponent(name)}&returnTo=/brews/new`);
	}

	function localDatetimeNow(): string {
		const now = new Date();
		const tz = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - tz).toISOString().slice(0, 16);
	}

	function applyRatio(target: number) {
		if (doseGrams && doseGrams > 0) {
			waterGrams = Math.round(doseGrams * target);
		}
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

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;

		try {
			if (!selectedBag) {
				throw new Error('Pick or create a bag for this brew.');
			}
			// The espresso DOSE input lives inside the collapsed group, where
			// native form validation can't reach it when closed.
			if (method === 'espresso' && (doseGrams == null || doseGrams <= 0)) {
				moreOpen = true;
				throw new Error('Dose is missing — set it under "Rating, balance, notes, temp".');
			}

			const totalBrewSeconds =
				method === 'espresso'
					? (brewTimeSeconds ?? NaN)
					: (brewMinutes ?? 0) * 60 + (brewSecondsPart ?? 0);

			const base = {
				id: crypto.randomUUID(),
				brewedAt: new Date(quickMode ? Date.now() : brewedAtLocal).toISOString(),
				bagId: selectedBag.id,
				coffeeName: selectedBag.name,
				roaster: selectedBag.roaster,
				doseGrams: doseGrams ?? NaN,
				brewTimeSeconds: totalBrewSeconds,
				grindSetting: grindSetting.trim(),
				notes: notes.trim() || undefined,
				rating: rating ?? undefined,
				balance: balance || undefined
			};

			const candidate =
				method === 'espresso'
					? {
							...base,
							method: 'espresso' as const,
							yieldGrams: yieldGrams ?? NaN,
							extraction: extraction || undefined,
							waterTempC: waterTempC ?? undefined
						}
					: {
							...base,
							method: 'pour-over' as const,
							waterGrams: waterGrams ?? NaN,
							waterTempC: waterTempC ?? undefined
						};

			const brew = BrewSchema.parse(candidate);
			await addBrew(brew);
			// Espresso lands on the shot detail (home of the NEXT SHOT card).
			await goto(method === 'espresso' ? `/brews/${brew.id}` : '/brews');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			submitting = false;
		}
	}

	const headerEyebrow = $derived.by(() => {
		if (method === 'espresso' && selectedBag) {
			return `SHOT ${shotNumber} · ${selectedBag.name.toUpperCase()}`;
		}
		return `BREW #${brewCount + 1}`;
	});
	const isEspresso = $derived(method === 'espresso');
	const showQuickChrome = $derived.by(() => quickMode && lastShot != null);
	// The assist-ready notches on YIELD/SHOT TIME light up when the scale streams.
	const scaleReceiving = $derived(scale.status === 'connected' && scale.weightG != null);
</script>

<svelte:head>
	<title>New brew</title>
</svelte:head>

<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
	<!-- Header row -->
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/brews"
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
		<Eyebrow>{headerEyebrow}</Eyebrow>
		<span class="h-9 w-[60px]" aria-hidden="true"></span>
	</div>

	{#if !quickMode}
		<h1
			class="font-display text-ink mx-[22px] mt-1.5 mb-[18px] text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
		>New brew</h1>
	{/if}

	<div class="space-y-[18px] px-[22px] {quickMode ? 'pt-2' : ''}">
		{#if !quickMode}
			<!-- Method -->
			<div>
				<Eyebrow class="mb-2">METHOD</Eyebrow>
				<MethodPicker bind:value={method} />
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

			<!-- Coffee (bag) -->
			<div>
				<Eyebrow class="mb-2">COFFEE</Eyebrow>
				<BagPicker bind:bagId oncreatenew={handleCreateNewBag} />
			</div>
		{/if}

		{#if showQuickChrome && lastShot}
			<!-- Carried-over strip -->
			<div
				class="border-hairline bg-surface text-muted flex flex-wrap items-center gap-x-2 rounded-[12px] border px-3 py-2 font-mono text-[11px] tracking-[0.04em]"
			>
				<span class="text-ink font-medium uppercase">Same as shot {shotNumber - 1}</span>
				<span aria-hidden="true">·</span>
				<span>{doseGrams ?? ESPRESSO_DEFAULT_DOSE}g dose</span>
				{#if carriedTempC != null}
					<span aria-hidden="true">·</span>
					<span>{carriedTempC}°C</span>
				{/if}
				{#if selectedBag?.roastLevel}
					<span aria-hidden="true">·</span>
					<span>{selectedBag.roastLevel}</span>
				{/if}
			</div>
		{/if}

		{#if isEspresso}
			<!-- Grind (staged) -->
			<div>
				<div class="mb-2 flex items-baseline justify-between">
					<Eyebrow>GRIND · LAGOM CASA</Eyebrow>
					{#if grindStaged}
						<span
							class="text-copper font-mono text-[9.5px] font-medium tracking-[0.12em] uppercase"
						>Staged from suggestion</span>
					{/if}
				</div>
				<div class="relative">
					<input
						type="text"
						bind:value={grindSetting}
						required
						placeholder="e.g. 0.5.5"
						class="text-ink placeholder:text-faint h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none {grindStaged
							? 'border-copper ring-copper/[0.18] bg-paper ring-[3px]'
							: 'bg-paper border-hairline focus:border-copper focus:ring-copper/25 focus:ring-2'}"
					/>
				</div>
				{#if grindStaged}
					{@const d = grindStaged.deltaTicks}
					<p class="text-copper-dk mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase">
						<span
							class="bg-copper inline-block h-[5px] w-[5px] rounded-full"
							aria-hidden="true"
						></span>
						{#if d != null && d !== 0}
							{d < 0 ? '−' : '+'}{Math.abs(d)} ticks {d < 0 ? 'finer' : 'coarser'} · {grindStaged.provenance.split(' · ')[0]}
						{:else}
							{grindStaged.provenance}
						{/if}
					</p>
				{:else if espressoStage != null && grindSetting.trim() === ''}
					<!-- Computed dial-in move/hold: chip-only, never auto-applied -->
					<button
						type="button"
						onclick={applyStage}
						class="bg-copper-lt mt-2 flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left transition hover:brightness-[0.98]"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.3"
							class="text-copper-dk shrink-0"
							aria-hidden="true"
						>
							<circle cx="9" cy="9" r="6.5" />
							<circle cx="9" cy="9" r="2.5" />
						</svg>
						<span class="min-w-0 flex-1">
							<span class="text-copper-dk block text-[13px]"
								>Suggested <span class="font-mono font-medium">{espressoStage.value}</span></span
							>
							<span
								class="text-copper-dk/70 mt-0.5 block font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
								>{espressoStage.provenance}</span
							>
						</span>
						<span
							class="text-copper shrink-0 font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
							>Tap to use</span
						>
					</button>
				{:else if espressoStage != null}
					<button
						type="button"
						onclick={applyStage}
						class="text-faint hover:text-copper-dk mt-1.5 text-[12px] transition-colors"
						>Suggested <span class="font-mono">{espressoStage.value}</span> · use instead</button
					>
				{:else if grindSuggestion}
					{@const sug = grindSuggestion}
					{@const prov =
						sug.kind === 'history'
							? `FROM YOUR HISTORY · ${sug.brews} BREW${sug.brews === 1 ? '' : 'S'}`
							: 'STARTING POINT'}
					{#if sug.kind === 'prefill'}
						{#if grindSetting === sug.value}
							<p class="text-muted mt-1.5 text-[12px]">Prefilled from your last brew of this bag.</p>
						{/if}
					{:else if grindSetting.trim() === ''}
						<button
							type="button"
							onclick={applyGrind}
							class="bg-copper-lt mt-2 flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left transition hover:brightness-[0.98]"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.3"
								class="text-copper-dk shrink-0"
								aria-hidden="true"
							>
								<circle cx="9" cy="9" r="6.5" />
								<circle cx="9" cy="9" r="2.5" />
							</svg>
							<span class="min-w-0 flex-1">
								<span class="text-copper-dk block text-[13px]"
									>Suggested <span class="font-mono font-medium">{sug.value}</span></span
								>
								<span
									class="text-copper-dk/70 mt-0.5 block font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
									>{prov}</span
								>
							</span>
							<span
								class="text-copper shrink-0 font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
								>Tap to use</span
							>
						</button>
					{:else if grindApplied && grindSetting === sug.value}
						<p class="text-copper-dk mt-1.5 text-[12px]">Applied the suggestion.</p>
					{:else}
						<button
							type="button"
							onclick={applyGrind}
							class="text-faint hover:text-copper-dk mt-1.5 text-[12px] transition-colors"
							>Suggested <span class="font-mono">{sug.value}</span> · use instead</button
						>
					{/if}
				{/if}
			</div>

			<!-- Live scale assist — fills the yield/time fields below -->
			<ScaleAssist {doseGrams} bind:yieldGrams bind:brewTimeSeconds />

			<!-- Yield + Shot time (the two manual fields; assist-ready notches) -->
			<div class="grid grid-cols-2 gap-2.5">
				<div>
					<Eyebrow class="mb-2">YIELD</Eyebrow>
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 relative flex h-14 items-center gap-1.5 overflow-hidden rounded-[14px] border px-4 transition focus-within:ring-2"
					>
						<span
							class="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r transition-colors {scaleReceiving ? 'bg-copper freshness-pulse' : 'bg-hairline'}"
							aria-hidden="true"
						></span>
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
						<span class="text-muted font-mono text-[13px]">g</span>
					</div>
				</div>
				<div>
					<Eyebrow class="mb-2">SHOT TIME</Eyebrow>
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 relative flex h-14 items-center gap-1.5 overflow-hidden rounded-[14px] border px-4 transition focus-within:ring-2"
					>
						<span
							class="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r transition-colors {scaleReceiving ? 'bg-copper freshness-pulse' : 'bg-hairline'}"
							aria-hidden="true"
						></span>
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
				</div>
			</div>

			<!-- Taste (extraction axis) -->
			<div>
				<Eyebrow class="mb-2">TASTE</Eyebrow>
				<ExtractionScale
					value={extraction || undefined}
					oninput={(v) => (extraction = extraction === v ? '' : v)}
				/>
			</div>

			<!-- Collapsed group: dose, temp, rating, balance, notes -->
			<div class="border-hairline rounded-[14px] border border-dashed">
				<button
					type="button"
					onclick={() => (moreOpen = !moreOpen)}
					class="text-muted hover:text-ink flex w-full items-center justify-between px-3.5 py-3 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase transition-colors"
					aria-expanded={moreOpen}
				>
					Rating, balance, notes, temp
					<svg
						width="12"
						height="12"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="transition-transform {moreOpen ? 'rotate-180' : ''}"
					>
						<path d="M3 4.5l3 3 3-3" />
					</svg>
				</button>
				{#if moreOpen}
					<div class="space-y-[16px] px-3.5 pb-4">
						<div class="grid grid-cols-2 gap-2.5">
							<div>
								<Eyebrow class="mb-2">DOSE</Eyebrow>
								<div
									class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
								>
									<input
										type="number"
										bind:value={doseGrams}
										step="0.1"
										min="0.1"
										required
										inputmode="decimal"
										class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
									/>
									<span class="text-muted font-mono text-[12px]">g</span>
								</div>
							</div>
							<div>
								<Eyebrow class="mb-2">TEMP (OPTIONAL)</Eyebrow>
								<div
									class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
								>
									<input
										type="number"
										bind:value={waterTempC}
										step="0.5"
										min="1"
										max="100"
										inputmode="decimal"
										placeholder="0"
										class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
									/>
									<span class="text-muted font-mono text-[12px]">°C</span>
								</div>
							</div>
						</div>

						<div>
							<Eyebrow class="mb-2">RATING (OPTIONAL)</Eyebrow>
							<div class="flex items-center gap-4">
								<StarRow value={rating ?? 0} size={28} oninput={(v) => (rating = v)} />
								<span class="text-ink font-mono text-[15px] font-medium">
									{rating != null ? `${rating.toFixed(1)} / 5` : '—'}
								</span>
								{#if rating != null}
									<button
										type="button"
										onclick={() => (rating = null)}
										class="text-muted hover:text-ink ml-auto text-[11px] transition-colors"
									>Clear</button>
								{/if}
							</div>
						</div>

						<div>
							<Eyebrow class="mb-2">BALANCE (BODY · OPTIONAL)</Eyebrow>
							<div class="flex flex-wrap gap-2">
								<Chip active={balance === ''} onclick={() => (balance = '')}>—</Chip>
								<Chip active={balance === 'light'} onclick={() => (balance = 'light')}>Light</Chip>
								<Chip active={balance === 'balanced'} onclick={() => (balance = 'balanced')}
									>Balanced</Chip>
								<Chip active={balance === 'heavy'} onclick={() => (balance = 'heavy')}>Heavy</Chip>
							</div>
						</div>

						<div>
							<Eyebrow class="mb-2">NOTES</Eyebrow>
							<textarea
								bind:value={notes}
								rows="3"
								placeholder="Syrupy, chocolate finish…"
								class="bg-paper border-hairline text-ink-70 placeholder:text-faint focus:border-copper focus:ring-copper/25 font-display w-full resize-none rounded-[14px] border px-3.5 py-3.5 text-[15px] leading-[1.45] italic transition outline-none focus:ring-2"
							></textarea>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- ── Pour-over: unchanged layout ── -->
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
					<Eyebrow class="mb-2">WATER</Eyebrow>
					<div
						class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
					>
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
						<span class="text-muted font-mono text-[13px]">g</span>
					</div>
				</div>
			</div>

			<!-- Ratio quick-pick -->
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

			<!-- Grind -->
			<div>
				<Eyebrow class="mb-2">GRIND · FELLOW ODE 2</Eyebrow>
				<input
					type="text"
					bind:value={grindSetting}
					required
					placeholder="e.g. 4.2"
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none focus:ring-2"
				/>

				{#if grindSuggestion}
					{@const sug = grindSuggestion}
					{@const prov =
						sug.kind === 'history'
							? `FROM YOUR HISTORY · ${sug.brews} BREW${sug.brews === 1 ? '' : 'S'}`
							: 'STARTING POINT'}
					{#if sug.kind === 'prefill'}
						{#if grindSetting === sug.value}
							<p class="text-muted mt-1.5 text-[12px]">Prefilled from your last brew of this bag.</p>
						{/if}
					{:else if grindSetting.trim() === ''}
						<button
							type="button"
							onclick={applyGrind}
							class="bg-copper-lt mt-2 flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left transition hover:brightness-[0.98]"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.3"
								class="text-copper-dk shrink-0"
								aria-hidden="true"
							>
								<circle cx="9" cy="9" r="6.5" />
								<circle cx="9" cy="9" r="2.5" />
							</svg>
							<span class="min-w-0 flex-1">
								<span class="text-copper-dk block text-[13px]"
									>Suggested <span class="font-mono font-medium">{sug.value}</span></span
								>
								<span
									class="text-copper-dk/70 mt-0.5 block font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
									>{prov}</span
								>
							</span>
							<span
								class="text-copper shrink-0 font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
								>Tap to use</span
							>
						</button>
					{:else if grindApplied && grindSetting === sug.value}
						<p class="text-copper-dk mt-1.5 text-[12px]">Applied the suggestion.</p>
					{:else}
						<button
							type="button"
							onclick={applyGrind}
							class="text-faint hover:text-copper-dk mt-1.5 text-[12px] transition-colors"
							>Suggested <span class="font-mono">{sug.value}</span> · use instead</button
						>
					{/if}
				{/if}
			</div>

			<!-- Water temp -->
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

			<!-- Brew time -->
			<div>
				<Eyebrow class="mb-2">BREW TIME</Eyebrow>
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
			</div>

			<!-- Rating -->
			<div>
				<Eyebrow class="mb-2">RATING (OPTIONAL)</Eyebrow>
				<div class="flex items-center gap-4">
					<StarRow value={rating ?? 0} size={28} oninput={(v) => (rating = v)} />
					<span class="text-ink font-mono text-[15px] font-medium">
						{rating != null ? `${rating.toFixed(1)} / 5` : '—'}
					</span>
					{#if rating != null}
						<button
							type="button"
							onclick={() => (rating = null)}
							class="text-muted hover:text-ink ml-auto text-[11px] transition-colors"
						>Clear</button>
					{/if}
				</div>
			</div>

			<!-- Balance -->
			<div>
				<Eyebrow class="mb-2">BALANCE (OPTIONAL)</Eyebrow>
				<div class="flex flex-wrap gap-2">
					<Chip active={balance === ''} onclick={() => (balance = '')}>—</Chip>
					<Chip active={balance === 'light'} onclick={() => (balance = 'light')}>Light</Chip>
					<Chip active={balance === 'balanced'} onclick={() => (balance = 'balanced')}>Balanced</Chip>
					<Chip active={balance === 'heavy'} onclick={() => (balance = 'heavy')}>Heavy</Chip>
				</div>
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
		{/if}

		{#if error}
			<div
				class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-sm"
			>{error}</div>
		{/if}

		<!-- Save button at bottom -->
		<button
			type="submit"
			disabled={submitting}
			class="bg-copper text-paper hover:bg-copper-dk flex h-14 w-full items-center justify-center rounded-2xl text-base font-medium transition-colors disabled:opacity-50"
		>{submitting ? 'Saving…' : quickMode ? 'Save shot' : 'Save brew'}</button>
	</div>
</form>
