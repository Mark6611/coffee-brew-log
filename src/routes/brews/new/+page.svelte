<script lang="ts">
	import { FOCUS_RING } from '$lib/components/focus';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { addBrew, listBrews, listBags } from '$lib/db/repository';
	import { BrewSchema, type Bag, type Brew, type Extraction } from '$lib/db/types';
	import { resolveGrindSuggestion } from '$lib/brews/grind';
	import { espressoShotsFor } from '$lib/brews/dialin';
	import { brewCompass } from '$lib/brews/compass';
	import { formatTimeAgo } from '$lib/brews/compute';
	import MethodPicker from '$lib/components/MethodPicker.svelte';
	import BagPicker from '$lib/components/BagPicker.svelte';
	import { brewAgainDraft } from '$lib/brews/repeat';
	import Button from '$lib/components/Button.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import StarRow from '$lib/components/StarRow.svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';
	import ExtractionScale from '$lib/components/ExtractionScale.svelte';
	import ScaleAssist from '$lib/components/ScaleAssist.svelte';
	import PhotoInput from '$lib/components/PhotoInput.svelte';
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
	let photo = $state<string | null | undefined>(undefined);
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

	// "Repeat last brew" (WHOOP-style): a one-tap copy of your most recent brew
	// (any bag) so you edit the deltas instead of starting blank. Only offered on
	// a pristine form so it never clobbers input you've already begun.
	const mostRecentBrew = $derived(
		allBrews.length ? [...allBrews].sort((a, b) => b.brewedAt.localeCompare(a.brewedAt))[0] : null
	);
	// Dose is deliberately excluded: espresso auto-defaults it to 18g on mount,
	// so a fresh espresso form is still "pristine". The other fields only become
	// non-empty once the user actually starts entering the brew.
	const pristine = $derived(
		yieldGrams == null && waterGrams == null && grindSetting === '' && !bagId && notes === ''
	);
	const repeatLabel = $derived.by(() => {
		const b = mostRecentBrew;
		if (!b) return '';
		const bag = allBags.find((x) => x.id === b.bagId);
		return (
			bag?.name ??
			b.coffeeName ??
			(b.method === 'espresso' ? 'your last espresso' : 'your last pour-over')
		);
	});
	function repeatLast() {
		const last = mostRecentBrew;
		if (!last) return;
		const d = brewAgainDraft(last);
		method = d.method;
		bagId = d.bagId ?? undefined;
		doseGrams = d.doseGrams ?? null;
		yieldGrams = d.yieldGrams ?? null;
		waterGrams = d.waterGrams ?? null;
		waterTempC = d.waterTempC ?? null;
		brewTimeSeconds = d.brewTimeSeconds ?? null;
		brewMinutes = d.brewMinutes ?? null;
		brewSecondsPart = d.brewSecondsPart ?? null;
		grindSetting = d.grindSetting ?? '';
		notes = d.notes ?? '';
		rating = null;
		balance = '';
		extraction = '';
	}

	onMount(async () => {
		// URL params first: a quick-log entry (dial-in CTA) must never inherit a
		// stale draft — the draft belongs to whatever form run left it behind.
		const params = page.url.searchParams;
		quickMode = params.get('quick') === '1';
		urlGrind = params.get('grind');
		// Compass yield moves hand a target yield over too ("pull to 39g").
		const urlYield = Number(params.get('yield'));
		if (Number.isFinite(urlYield) && urlYield > 0) yieldGrams = urlYield;
		const urlBagId = params.get('bagId');
		if (params.get('method') === 'espresso') method = 'espresso';

		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (raw) {
			if (!quickMode) {
				try {
					const d = JSON.parse(raw);
					// Only restore a FRESH draft (the /bags/new round-trip takes seconds). A
					// draft abandoned for longer is discarded so a New Brew opened days later
					// isn't silently prefilled — and, critically, backdated to the old brewedAt.
					const FRESH_MS = 30 * 60 * 1000;
					if (!d.savedAt || Date.now() - d.savedAt > FRESH_MS) throw new Error('stale draft');
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
				} catch {
					// Stale or corrupt draft — thrown deliberately above for staleness.
					// Either way the form just keeps its defaults; the draft is dropped below.
				}
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

	// The Brew Compass verdict for the LAST shot of this bag — the standing
	// recommendation the next session starts from. Computed at read time.
	const lastCompass = $derived.by(() => {
		if (method !== 'espresso' || !selectedBag || !lastShot) return null;
		if (selectedBag.dialedRecipe) return null; // dialed bags follow the recipe
		return brewCompass({
			doseG: lastShot.doseGrams,
			yieldG: lastShot.yieldGrams,
			timeS: lastShot.brewTimeSeconds,
			grind: lastShot.grindSetting,
			roast: selectedBag.roastLevel,
			extraction: lastShot.extraction,
			balance: lastShot.balance
		});
	});

	// Staged grind for espresso — the dial-in precedence layer that outranks
	// the plain grind engine while a dial-in is active:
	//   dialedRecipe > compass move (from the LAST shot) > existing engine.
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
		const c = lastCompass;
		if (c?.action.kind === 'grind' && c.action.target) {
			return {
				kind: 'move',
				value: c.action.target,
				provenance: `COMPASS · ${Math.abs(c.action.deltaTicks)} TICKS ${c.action.direction.toUpperCase()}`,
				deltaTicks: c.action.deltaTicks
			};
		}
		if (c && c.action.kind !== 'grind') {
			// hold / yield / diagnose keep the same grind next shot. A grind move
			// whose target is null (unparseable grind notation) stages NOTHING —
			// "KEEP GRIND" beside a "Grind finer" headline is a contradiction.
			return {
				kind: 'hold',
				value: lastShot.grindSetting,
				provenance: c.action.kind === 'hold' ? 'ON TARGET — REPEAT' : 'KEEP GRIND',
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

	// ── LAST SHOT card actions ─────────────────────────────────────────────
	// "Start from the compass": apply the standing recommendation — exactly one
	// variable moves; dose and temp carry because they aren't decisions.
	function applyCompassStart() {
		const c = lastCompass;
		const s = lastShot;
		if (!c || !s) return;
		doseGrams = s.doseGrams;
		if (s.waterTempC != null) waterTempC = s.waterTempC;
		if (c.action.kind === 'grind' && c.action.target) {
			grindSetting = c.action.target;
		} else {
			grindSetting = s.grindSetting;
			if (c.action.kind === 'yield') yieldGrams = c.action.targetG;
		}
		grindApplied = true;
	}

	// "Repeat last": same grind, same dose, same temp — the skeptic's button.
	function repeatLastShot() {
		const s = lastShot;
		if (!s) return;
		doseGrams = s.doseGrams;
		if (s.waterTempC != null) waterTempC = s.waterTempC;
		grindSetting = s.grindSetting;
		grindApplied = true;
	}

	// Beans age between sessions — a quiet heads-up, never a command.
	const daysSinceLastShot = $derived.by(() => {
		if (!lastShot) return null;
		const d = Math.floor((Date.now() - new Date(lastShot.brewedAt).getTime()) / 86_400_000);
		return d;
	});
	const lastShotTaste = $derived.by(() => {
		const s = lastShot;
		if (!s) return null;
		const parts: string[] = [];
		if (s.extraction) parts.push(s.extraction);
		if (s.balance && s.balance !== 'balanced') parts.push(s.balance === 'light' ? 'thin' : 'heavy');
		return parts.length ? parts.join(' · ') : null;
	});

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
			brewedAtLocal,
			savedAt: Date.now()
		};
		sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}

	function handleCreateNewBag(name: string) {
		saveDraft();
		goto(
			resolve(
				`/bags/new?name=${encodeURIComponent(name)}&returnTo=${encodeURIComponent('/brews/new')}`
			)
		);
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

	// A ZodError IS an Error, but its .message is a multi-line JSON dump of the issues.
	// Surface the first issue's human message instead of that blob.
	function firstIssueMessage(err: unknown): string {
		if (err && typeof err === 'object' && 'issues' in err) {
			const issues = (err as { issues?: Array<{ message?: string }> }).issues;
			if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
		}
		return err instanceof Error ? err.message : String(err);
	}

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

			// Pour-over MIN/SEC can't both be blank — an empty time otherwise reaches
			// BrewSchema and surfaces as a raw ZodError JSON blob. (Not `required` on the
			// inputs: a valid 0:45 brew legitimately leaves MIN empty.)
			if (method === 'pour-over' && (!Number.isFinite(totalBrewSeconds) || totalBrewSeconds <= 0)) {
				throw new Error('Enter the brew time (minutes and/or seconds).');
			}

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
				photo: photo ?? undefined,
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
			await goto(
				method === 'espresso' ? resolve('/brews/[id]', { id: brew.id }) : resolve('/brews')
			);
		} catch (err) {
			error = firstIssueMessage(err);
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
	<div class="flex items-center justify-between gap-2 px-5 pt-2 pb-2">
		<a
			href={resolve('/brews')}
			class="flex h-9 items-center gap-1 text-[calc(var(--dt-base)*15/17)] text-copper-dk transition-colors hover:text-copper dark:text-copper dark:hover:text-ink"
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
		<Eyebrow class="min-w-0 truncate">{headerEyebrow}</Eyebrow>
		<span class="h-9 w-[60px]" aria-hidden="true"></span>
	</div>

	{#if !quickMode}
		<h1
			class="mx-5 mt-2 mb-5 font-display text-[calc(var(--dt-base)*30/17)] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			New brew
		</h1>
	{/if}

	<div class="space-y-5 px-5 {quickMode ? 'pt-2' : ''}">
		{#if !quickMode && pristine && mostRecentBrew}
			<!-- Repeat last brew — copy the most recent log, then edit the deltas. -->
			<button
				type="button"
				onclick={repeatLast}
				class="press flex w-full items-center gap-3 rounded-card border border-hairline bg-surface px-4 py-3 text-left hover:border-copper/50"
			>
				<span
					class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-copper-lt text-copper"
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
						<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
						<path d="M13.5 2.5V5H11" />
					</svg>
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[calc(var(--dt-base)*14/17)] font-medium text-ink"
						>Repeat last brew</span
					>
					<span class="block truncate text-[calc(var(--dt-base)*12.5/17)] text-muted"
						>Start from {repeatLabel}, then edit what changed</span
					>
				</span>
				<svg
					width="16"
					height="16"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="shrink-0 text-muted"
				>
					<path d="M6 3l5 5-5 5" />
				</svg>
			</button>
		{/if}

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
					class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-ink transition outline-none focus:border-copper focus:ring-2 focus:ring-copper/25"
				/>
			</div>

			<!-- Coffee (bag) -->
			<div>
				<Eyebrow class="mb-2">COFFEE</Eyebrow>
				<BagPicker bind:bagId oncreatenew={handleCreateNewBag} />
			</div>

			<!-- LAST SHOT card — logged history + the compass's standing start point -->
			{#if isEspresso && selectedBag && lastShot && lastCompass}
				{@const a = lastCompass.action}
				<div class="rounded-card border border-copper/25 bg-copper-lt px-4 py-4">
					<div class="flex items-center justify-between">
						<div
							class="font-mono text-eyebrow font-medium tracking-[0.14em] text-copper-dk uppercase"
						>
							Last shot · {formatTimeAgo(lastShot.brewedAt)}
						</div>
						{#if !lastCompass.fromTaste}
							<div class="font-mono text-eyebrow tracking-[0.12em] text-muted uppercase">
								from the numbers
							</div>
						{/if}
					</div>
					<div class="mt-2 font-mono text-[calc(var(--dt-base)*13/17)] tracking-[-0.01em] text-ink">
						<span class="font-medium">{lastShot.grindSetting}</span>
						<span class="text-muted"> grind · </span>{lastShot.doseGrams}g
						<span class="text-muted">→</span>
						{lastShot.yieldGrams}g
						<span class="text-muted"> · </span>{lastShot.brewTimeSeconds}s
						{#if lastShotTaste}<span class="text-copper-dk"> · {lastShotTaste}</span>{/if}
					</div>
					<div
						class="mt-2 font-display text-[calc(var(--dt-base)*16/17)] leading-[1.25] font-medium text-ink"
					>
						{lastCompass.headline}{#if a.kind === 'grind' && a.target}
							<span class="text-copper">&nbsp;→ {a.target}</span>
						{:else if a.kind === 'yield'}
							<span class="text-copper">&nbsp;→ {a.targetG}g</span>
						{/if}
					</div>
					{#if daysSinceLastShot != null && daysSinceLastShot > 7}
						<p class="mt-1 text-[calc(var(--dt-base)*12/17)] leading-[1.4] text-muted italic">
							Beans have aged {daysSinceLastShot} days since — they may run a touch faster.
						</p>
					{/if}
					<div class="mt-3 flex flex-wrap items-center gap-2">
						<Button size="regular" variant="prominent" onclick={applyCompassStart}>
							{#if a.kind === 'grind' && a.target}Start at {a.target}{:else if a.kind === 'yield'}Pull
								to {a.targetG}g{:else}Same again{/if}
						</Button>
						{#if a.kind === 'grind' && a.target}
							<button
								type="button"
								onclick={repeatLastShot}
								class="px-2 text-[calc(var(--dt-base)*13/17)] text-muted transition-colors hover:text-ink"
								>Repeat {lastShot.grindSetting}</button
							>
						{/if}
					</div>
				</div>
			{/if}
		{/if}

		{#if showQuickChrome && lastShot}
			<!-- Carried-over strip -->
			<div
				class="flex flex-wrap items-center gap-x-2 rounded-control border border-hairline bg-surface px-3 py-2 font-mono text-[calc(var(--dt-base)*11/17)] tracking-[0.04em] text-muted"
			>
				<span class="font-medium text-ink uppercase">Same as shot {shotNumber - 1}</span>
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
						<span class="font-mono text-eyebrow font-medium tracking-[0.12em] text-copper uppercase"
							>Staged from suggestion</span
						>
					{/if}
				</div>
				<div class="relative">
					<input
						type="text"
						bind:value={grindSetting}
						required
						placeholder="e.g. 0.5.5"
						autocorrect="off"
						autocapitalize="none"
						spellcheck="false"
						class="min-h-12 w-full rounded-input border px-4 py-2 font-mono text-ink transition outline-none placeholder:text-muted {grindStaged
							? 'border-copper bg-paper ring-2 ring-copper/25'
							: 'border-hairline bg-paper focus:border-copper focus:ring-2 focus:ring-copper/25'}"
					/>
				</div>
				{#if grindStaged}
					{@const d = grindStaged.deltaTicks}
					<p
						class="mt-2 flex items-center gap-2 font-mono text-eyebrow font-medium tracking-[0.1em] text-copper-dk uppercase"
					>
						<span class="inline-block h-[5px] w-[5px] rounded-full bg-copper" aria-hidden="true"
						></span>
						{#if d != null && d !== 0}
							{d < 0 ? '−' : '+'}{Math.abs(d)} ticks {d < 0 ? 'finer' : 'coarser'} · {grindStaged.provenance.split(
								' · '
							)[0]}
						{:else}
							{grindStaged.provenance}
						{/if}
					</p>
				{:else if espressoStage != null && grindSetting.trim() === '' && (quickMode || lastCompass == null)}
					<!-- Computed dial-in move/hold: chip-only, never auto-applied.
					     Hidden when the LAST SHOT card is on screen — it says the same thing. -->
					<button
						type="button"
						onclick={applyStage}
						class="press mt-2 flex w-full items-center gap-3 rounded-control bg-copper-lt px-3 py-3 text-left hover:brightness-[0.98]"
					>
						<svg
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.3"
							class="shrink-0 text-copper-dk"
							aria-hidden="true"
						>
							<circle cx="9" cy="9" r="6.5" />
							<circle cx="9" cy="9" r="2.5" />
						</svg>
						<span class="min-w-0 flex-1">
							<span class="block text-[calc(var(--dt-base)*13/17)] text-copper-dk"
								>Suggested <span class="font-mono font-medium">{espressoStage.value}</span></span
							>
							<span
								class="mt-0.5 block font-mono text-eyebrow font-medium tracking-[0.1em] text-copper-dk/70 uppercase"
								>{espressoStage.provenance}</span
							>
						</span>
						<span
							class="shrink-0 font-mono text-eyebrow font-medium tracking-[0.1em] text-copper uppercase"
							>Tap to use</span
						>
					</button>
				{:else if espressoStage != null}
					<button
						type="button"
						onclick={applyStage}
						class="mt-2 text-[calc(var(--dt-base)*12/17)] text-muted transition-colors hover:text-copper-dk"
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
							<p class="mt-2 text-[calc(var(--dt-base)*12/17)] text-muted">
								Prefilled from your last brew of this bag.
							</p>
						{/if}
					{:else if grindSetting.trim() === ''}
						<button
							type="button"
							onclick={applyGrind}
							class="press mt-2 flex w-full items-center gap-3 rounded-control bg-copper-lt px-3 py-3 text-left hover:brightness-[0.98]"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.3"
								class="shrink-0 text-copper-dk"
								aria-hidden="true"
							>
								<circle cx="9" cy="9" r="6.5" />
								<circle cx="9" cy="9" r="2.5" />
							</svg>
							<span class="min-w-0 flex-1">
								<span class="block text-[calc(var(--dt-base)*13/17)] text-copper-dk"
									>Suggested <span class="font-mono font-medium">{sug.value}</span></span
								>
								<span
									class="mt-0.5 block font-mono text-eyebrow font-medium tracking-[0.1em] text-copper-dk/70 uppercase"
									>{prov}</span
								>
							</span>
							<span
								class="shrink-0 font-mono text-eyebrow font-medium tracking-[0.1em] text-copper uppercase"
								>Tap to use</span
							>
						</button>
					{:else if grindApplied && grindSetting === sug.value}
						<p class="mt-2 text-[calc(var(--dt-base)*12/17)] text-copper-dk">
							Applied the suggestion.
						</p>
					{:else}
						<button
							type="button"
							onclick={applyGrind}
							class="mt-2 text-[calc(var(--dt-base)*12/17)] text-muted transition-colors hover:text-copper-dk"
							>Suggested <span class="font-mono">{sug.value}</span> · use instead</button
						>
					{/if}
				{/if}
			</div>

			<!-- Live scale assist — fills the yield/time fields below -->
			<ScaleAssist {doseGrams} bind:yieldGrams bind:brewTimeSeconds />

			<!-- Yield + Shot time (the two manual fields; assist-ready notches) -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<Eyebrow class="mb-2">YIELD</Eyebrow>
					<div
						class="field-wrapper relative flex min-h-14 items-center gap-2 overflow-hidden rounded-input border border-hairline bg-surface px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<span
							class="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r transition-colors {scaleReceiving
								? 'freshness-pulse bg-copper'
								: 'bg-hairline'}"
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
							class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
						/>
						<span class="font-mono text-[calc(var(--dt-base)*13/17)] text-muted">g</span>
					</div>
				</div>
				<div>
					<Eyebrow class="mb-2">SHOT TIME</Eyebrow>
					<div
						class="field-wrapper relative flex min-h-14 items-center gap-2 overflow-hidden rounded-input border border-hairline bg-surface px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<span
							class="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r transition-colors {scaleReceiving
								? 'freshness-pulse bg-copper'
								: 'bg-hairline'}"
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
							class="min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em] text-ink placeholder:text-muted"
						/>
						<span class="font-mono text-[calc(var(--dt-base)*13/17)] text-muted">sec</span>
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
			<div class="rounded-input border border-dashed border-hairline">
				<button
					type="button"
					onclick={() => (moreOpen = !moreOpen)}
					class="flex w-full items-center justify-between px-4 py-3 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
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
					<div class="space-y-4 px-4 pb-4">
						<div class="grid grid-cols-2 gap-3">
							<div>
								<Eyebrow class="mb-2">DOSE</Eyebrow>
								<div
									class="field-wrapper flex min-h-12 items-center gap-2 rounded-input border border-hairline bg-paper px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
								>
									<input
										type="number"
										bind:value={doseGrams}
										step="0.1"
										min="0.1"
										required
										inputmode="decimal"
										class="min-w-0 flex-1 font-mono text-[max(16px,calc(var(--dt-base)*16/17))] tracking-[-0.01em] text-ink placeholder:text-muted"
									/>
									<span class="font-mono text-[calc(var(--dt-base)*12/17)] text-muted">g</span>
								</div>
							</div>
							<div>
								<Eyebrow class="mb-2">TEMP (OPTIONAL)</Eyebrow>
								<div
									class="field-wrapper flex min-h-12 items-center gap-2 rounded-input border border-hairline bg-paper px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
								>
									<input
										type="number"
										bind:value={waterTempC}
										step="0.5"
										min="1"
										max="100"
										inputmode="decimal"
										placeholder="0"
										class="min-w-0 flex-1 font-mono text-[max(16px,calc(var(--dt-base)*16/17))] tracking-[-0.01em] text-ink placeholder:text-muted"
									/>
									<span class="font-mono text-[calc(var(--dt-base)*12/17)] text-muted">°C</span>
								</div>
							</div>
						</div>

						<div>
							<Eyebrow class="mb-2">RATING (OPTIONAL)</Eyebrow>
							<div class="flex items-center gap-4">
								<StarRow value={rating ?? 0} size={28} oninput={(v) => (rating = v)} />
								<span class="font-mono text-[calc(var(--dt-base)*15/17)] font-medium text-ink">
									{rating != null ? `${rating.toFixed(1)} / 5` : '—'}
								</span>
								{#if rating != null}
									<button
										type="button"
										onclick={() => (rating = null)}
										class="hit-44-sq {FOCUS_RING} ml-auto text-[calc(var(--dt-base)*11/17)] text-muted transition-colors hover:text-ink"
										>Clear</button
									>
								{/if}
							</div>
						</div>

						<div>
							<Eyebrow class="mb-2">BALANCE (BODY · OPTIONAL)</Eyebrow>
							<BalanceScale value={balance || undefined} oninput={(v) => (balance = v)} />
							{#if balance}
								<button
									type="button"
									onclick={() => (balance = '')}
									class="hit-44-sq {FOCUS_RING} mt-1 text-[calc(var(--dt-base)*11/17)] text-muted transition-colors hover:text-ink"
									>Clear</button
								>
							{/if}
						</div>

						<div>
							<Eyebrow class="mb-2">NOTES</Eyebrow>
							<textarea
								bind:value={notes}
								rows="3"
								placeholder="Syrupy, chocolate finish…"
								class="w-full resize-none rounded-input border border-hairline bg-paper px-4 py-4 font-display text-[max(16px,calc(var(--dt-base)*16/17))] leading-[1.45] text-ink-70 italic transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
							></textarea>
						</div>

						<div>
							<Eyebrow class="mb-2">PHOTO</Eyebrow>
							<PhotoInput bind:photo label="photo" />
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- ── Pour-over: unchanged layout ── -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<Eyebrow class="mb-2">DOSE</Eyebrow>
					<div
						class="field-wrapper flex min-h-14 items-center gap-2 rounded-input border border-hairline bg-surface px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
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
						<span class="font-mono text-[calc(var(--dt-base)*13/17)] text-muted">g</span>
					</div>
				</div>
				<div>
					<Eyebrow class="mb-2">WATER</Eyebrow>
					<div
						class="field-wrapper flex min-h-14 items-center gap-2 rounded-input border border-hairline bg-surface px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
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
						<span class="font-mono text-[calc(var(--dt-base)*13/17)] text-muted">g</span>
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
							class="inline-flex h-9 items-center rounded-full bg-copper-lt px-3 font-mono text-[calc(var(--dt-base)*12/17)] tracking-[-0.01em] text-copper"
							>= 1:{actualRatio.toFixed(1)} actual</span
						>
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
					autocorrect="off"
					autocapitalize="none"
					spellcheck="false"
					class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 font-mono text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				/>

				{#if grindSuggestion}
					{@const sug = grindSuggestion}
					{@const prov =
						sug.kind === 'history'
							? `FROM YOUR HISTORY · ${sug.brews} BREW${sug.brews === 1 ? '' : 'S'}`
							: 'STARTING POINT'}
					{#if sug.kind === 'prefill'}
						{#if grindSetting === sug.value}
							<p class="mt-2 text-[calc(var(--dt-base)*12/17)] text-muted">
								Prefilled from your last brew of this bag.
							</p>
						{/if}
					{:else if grindSetting.trim() === ''}
						<button
							type="button"
							onclick={applyGrind}
							class="press mt-2 flex w-full items-center gap-3 rounded-control bg-copper-lt px-3 py-3 text-left hover:brightness-[0.98]"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.3"
								class="shrink-0 text-copper-dk"
								aria-hidden="true"
							>
								<circle cx="9" cy="9" r="6.5" />
								<circle cx="9" cy="9" r="2.5" />
							</svg>
							<span class="min-w-0 flex-1">
								<span class="block text-[calc(var(--dt-base)*13/17)] text-copper-dk"
									>Suggested <span class="font-mono font-medium">{sug.value}</span></span
								>
								<span
									class="mt-0.5 block font-mono text-eyebrow font-medium tracking-[0.1em] text-copper-dk/70 uppercase"
									>{prov}</span
								>
							</span>
							<span
								class="shrink-0 font-mono text-eyebrow font-medium tracking-[0.1em] text-copper uppercase"
								>Tap to use</span
							>
						</button>
					{:else if grindApplied && grindSetting === sug.value}
						<p class="mt-2 text-[calc(var(--dt-base)*12/17)] text-copper-dk">
							Applied the suggestion.
						</p>
					{:else}
						<button
							type="button"
							onclick={applyGrind}
							class="mt-2 text-[calc(var(--dt-base)*12/17)] text-muted transition-colors hover:text-copper-dk"
							>Suggested <span class="font-mono">{sug.value}</span> · use instead</button
						>
					{/if}
				{/if}
			</div>

			<!-- Water temp -->
			<div>
				<Eyebrow class="mb-2">WATER TEMP (OPTIONAL)</Eyebrow>
				<div
					class="field-wrapper flex min-h-12 items-center gap-2 rounded-input border border-hairline bg-paper px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
				>
					<input
						type="number"
						bind:value={waterTempC}
						step="1"
						min="1"
						max="100"
						inputmode="numeric"
						placeholder="0"
						class="min-w-0 flex-1 font-mono text-[max(16px,calc(var(--dt-base)*16/17))] tracking-[-0.01em] text-ink placeholder:text-muted"
					/>
					<span class="font-mono text-[calc(var(--dt-base)*12/17)] text-muted">°C</span>
				</div>
			</div>

			<!-- Brew time -->
			<div>
				<Eyebrow class="mb-2">BREW TIME</Eyebrow>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<div
							class="mb-2 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase"
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
							class="min-h-14 w-full rounded-input border border-hairline bg-surface px-4 py-2 font-mono text-2xl font-medium tracking-[-0.02em] text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
						/>
					</div>
					<div>
						<div
							class="mb-2 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase"
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
							class="min-h-14 w-full rounded-input border border-hairline bg-surface px-4 py-2 font-mono text-2xl font-medium tracking-[-0.02em] text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
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
					<span class="font-mono text-[calc(var(--dt-base)*15/17)] font-medium text-ink">
						{rating != null ? `${rating.toFixed(1)} / 5` : '—'}
					</span>
					{#if rating != null}
						<button
							type="button"
							onclick={() => (rating = null)}
							class="hit-44-sq {FOCUS_RING} ml-auto text-[calc(var(--dt-base)*11/17)] text-muted transition-colors hover:text-ink"
							>Clear</button
						>
					{/if}
				</div>
			</div>

			<!-- Balance -->
			<div>
				<Eyebrow class="mb-2">BALANCE (OPTIONAL)</Eyebrow>
				<BalanceScale value={balance || undefined} oninput={(v) => (balance = v)} />
				{#if balance}
					<button
						type="button"
						onclick={() => (balance = '')}
						class="hit-44-sq {FOCUS_RING} mt-1 text-[calc(var(--dt-base)*11/17)] text-muted transition-colors hover:text-ink"
						>Clear</button
					>
				{/if}
			</div>

			<!-- Notes -->
			<div>
				<Eyebrow class="mb-2">NOTES</Eyebrow>
				<textarea
					bind:value={notes}
					rows="3"
					placeholder="Stone fruit, jasmine on cool-down…"
					class="w-full resize-none rounded-input border border-hairline bg-paper px-4 py-4 font-display text-[max(16px,calc(var(--dt-base)*16/17))] leading-[1.45] text-ink-70 italic transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				></textarea>
			</div>

			<!-- Photo -->
			<div>
				<Eyebrow class="mb-2">PHOTO</Eyebrow>
				<PhotoInput bind:photo label="photo" />
			</div>
		{/if}

		{#if error}
			<div class="rounded-input border border-danger/20 bg-danger/8 p-3 text-sm text-danger">
				{error}
			</div>
		{/if}

		<!-- Save button at bottom -->
		<Button size="large" variant="prominent" full type="submit" disabled={submitting}
			>{submitting ? 'Saving…' : quickMode ? 'Save shot' : 'Save brew'}</Button
		>
	</div>
</form>
