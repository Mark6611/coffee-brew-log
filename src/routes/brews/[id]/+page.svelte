<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Brew, Bag } from '$lib/db/types';
	import { getBrewById, getBagById, listBrews, deleteBrew } from '$lib/db/repository';
	import {
		formatRatio,
		formatBrewTime,
		formatTimeAgo,
		ratio
	} from '$lib/brews/compute';
	import { freshnessTone, freshnessLabel, freshnessStale, bagConsumption } from '$lib/bags/compute';
	import { resolveOrigin } from '$lib/origin/resolve';
	import { resolveNextShot, espressoShotsFor } from '$lib/brews/dialin';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import StarRow from '$lib/components/StarRow.svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';
	import ExtractionScale from '$lib/components/ExtractionScale.svelte';
	import OriginFlag from '$lib/components/OriginFlag.svelte';
	import MarkdownText from '$lib/components/MarkdownText.svelte';
	import PublishedBadge from '$lib/components/PublishedBadge.svelte';
	import OpenPublicPostCard from '$lib/components/OpenPublicPostCard.svelte';
	import { postUrl } from '$lib/blog/config';

	const brewId = $derived(page.params.id as string);

	let brew = $state<Brew | null>(null);
	let bag = $state<Bag | null>(null);
	const resolvedOrigin = $derived(bag ? resolveOrigin(bag.origin) : null);
	let allBrews = $state<Brew[]>([]);
	let loading = $state(true);
	let notFound = $state(false);

	$effect(() => {
		void load(brewId);
	});

	async function load(id: string) {
		loading = true;
		notFound = false;
		const found = await getBrewById(id);
		if (!found) {
			notFound = true;
			brew = null;
			bag = null;
			loading = false;
			return;
		}
		brew = found;
		allBrews = await listBrews();
		if (found.bagId) {
			bag = (await getBagById(found.bagId)) ?? null;
		} else {
			bag = null;
		}
		loading = false;
	}

	const brewNumber = $derived.by(() => {
		const current = brew;
		if (!current || allBrews.length === 0) return null;
		const asc = [...allBrews].sort((a, b) => a.brewedAt.localeCompare(b.brewedAt));
		return asc.findIndex((b) => b.id === current.id) + 1;
	});

	const outValue = $derived(
		!brew ? '' : brew.method === 'espresso' ? `${brew.yieldGrams}g` : `${brew.waterGrams}g`
	);
	const outLabel = $derived(!brew ? '' : brew.method === 'espresso' ? 'YIELD' : 'WATER');
	const verb = $derived(!brew ? '' : brew.method === 'espresso' ? 'espresso' : 'brew');

	// ── NEXT SHOT card (dial-in loop) ──────────────────────────────────────
	// Shown only when this is the LATEST espresso shot of a bag that isn't
	// dialed yet — advising from a stale shot would mislead.
	let nextShotDismissed = $state(false);
	const nextShot = $derived.by(() => {
		const b = brew;
		const theBag = bag;
		if (!b || !theBag) return null;
		if (b.method !== 'espresso') return null;
		if (theBag.dialedRecipe) return null;
		const shots = espressoShotsFor(theBag, allBrews);
		const latest = shots.length > 0 ? shots[shots.length - 1] : null;
		if (latest == null) return null;
		if (latest.id !== b.id) return null;
		return resolveNextShot(b, theBag);
	});
	const pullNextHref = $derived.by(() => {
		const b = brew;
		const n = nextShot;
		if (!b?.bagId || !n) return null;
		const grind =
			n.kind === 'move' && n.target ? n.target : b.grindSetting;
		return `/brews/new?bagId=${b.bagId}&method=espresso&quick=1&grind=${encodeURIComponent(grind)}`;
	});

	// Compound booleans live here, not in the template (Svelte 5.55 paren gotcha).
	const espressoExtraction = $derived(brew?.method === 'espresso' ? brew.extraction : undefined);
	const showVariables = $derived.by(() => {
		const b = brew;
		if (!b) return false;
		if (b.grindSetting) return true;
		if (b.waterTempC != null) return true;
		if (b.balance) return true;
		if (b.method === 'espresso' && b.extraction) return true;
		return false;
	});

	const ratioValue = $derived(brew ? ratio(brew) : null);

	async function handleDelete() {
		if (!brew) return;
		if (!confirm('Delete this brew?')) return;
		await deleteBrew(brew.id);
		await goto('/brews');
	}

	function handleDuplicate() {
		if (!brew) return;
		const draft = {
			method: brew.method,
			bagId: brew.bagId,
			doseGrams: brew.doseGrams,
			yieldGrams: brew.method === 'espresso' ? brew.yieldGrams : null,
			waterGrams: brew.method === 'pour-over' ? brew.waterGrams : null,
			waterTempC: brew.method === 'pour-over' ? brew.waterTempC ?? null : null,
			brewTimeSeconds: brew.method === 'espresso' ? brew.brewTimeSeconds : null,
			brewMinutes:
				brew.method === 'pour-over' ? Math.floor(brew.brewTimeSeconds / 60) : null,
			brewSecondsPart: brew.method === 'pour-over' ? brew.brewTimeSeconds % 60 : null,
			grindSetting: brew.grindSetting,
			notes: brew.notes ?? '',
			rating: null,
			balance: '',
			brewedAtLocal: localDatetimeNow()
		};
		sessionStorage.setItem('brew-form-draft', JSON.stringify(draft));
		goto('/brews/new');
	}

	function localDatetimeNow(): string {
		const now = new Date();
		const tz = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - tz).toISOString().slice(0, 16);
	}

	const bagConsumptionData = $derived(
		bag && brew ? bagConsumption(bag, allBrews) : null
	);
</script>

<svelte:head>
	<title>{brew?.coffeeName ?? bag?.name ?? 'Brew'}</title>
</svelte:head>

{#if loading}
	<p class="text-muted py-8 text-center text-sm">Loading…</p>
{:else if notFound || !brew}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Brew not found.</p>
		<a href="/brews" class="text-copper mt-3 inline-block underline">Back to brews</a>
	</div>
{:else}
	<div class="mx-auto max-w-2xl pb-12">
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
				Brews
			</a>
			<a
				href="/brews/{brew.id}/edit"
				class="text-muted hover:text-ink h-9 px-2 text-[14px] transition-colors"
			>Edit</a>
		</div>

		<div class="space-y-5 px-[22px]">
			<!-- Identity -->
			<div>
				{#if brewNumber != null}
					<Eyebrow>BREW · #{brewNumber}</Eyebrow>
				{/if}
				<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<Badge>{brew.method}</Badge>
					{#if brew.isFavorite}
						<span
							class="bg-success/10 text-success inline-flex h-[22px] items-center gap-1 rounded-full px-2 font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase"
						>
							<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
								<polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								/>
							</svg>
							Favorite
						</span>
					{/if}
					{#if brew.published}
						<PublishedBadge href={postUrl(brew.id)} />
					{/if}
				</div>

				<h1
					class="font-display text-ink mt-3 text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
				>{bag?.name ?? brew.coffeeName ?? 'Untitled brew'}</h1>

				{#if bag}
					<a
						href="/bags/{bag.id}"
						class="text-copper-dk hover:text-copper mt-1.5 inline-flex items-center gap-1 text-[13px] transition-colors"
						style="border-bottom: 1px solid rgba(156,74,31,0.35); padding-bottom: 1px;"
					>
						<svg
							width="11"
							height="11"
							viewBox="0 0 18 18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.4"
							stroke-linejoin="round"
							stroke-linecap="round"
						>
							<path d="M3.2 5L4.7 3h8.6L14.8 5" />
							<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
							<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
						</svg>
						{bag.roaster ?? bag.name}
						{#if resolvedOrigin}<span class="text-muted"> · <OriginFlag code={resolvedOrigin.code} country={resolvedOrigin.country} />{resolvedOrigin.country}</span>{/if}
						{#if bag.process}<span class="text-muted"> · {bag.process}</span>{/if}
					</a>
					{#if bag.roastedAt}
						{@const tone = freshnessTone(bag.roastedAt)}
						{@const label = freshnessLabel(bag.roastedAt)}
						{#if tone && label}
							<div
								class="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
								style="color: {tone}"
							>
								<span
									class="inline-block h-[5px] w-[5px] rounded-full"
									class:freshness-pulse={freshnessStale(bag.roastedAt)}
									style="background: currentColor"
									aria-hidden="true"
								></span>
								{label}
							</div>
						{/if}
					{/if}
				{:else if brew.roaster || brew.coffeeName}
					<div class="text-muted mt-1.5 text-[13px]">{brew.roaster ?? ''}</div>
				{/if}

				<div class="text-muted mt-2 font-mono text-[12px] tracking-[0.04em]">
					{formatTimeAgo(brew.brewedAt)}
				</div>

				{#if !brew.bagId}
					<div
						class="bg-copper-lt text-copper-dk mt-3 flex items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5 text-[12.5px]"
					>
						<div class="flex items-center gap-2">
							<svg
								width="14"
								height="14"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linejoin="round"
								stroke-linecap="round"
							>
								<path d="M3.2 5L4.7 3h8.6L14.8 5" />
								<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
								<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
							</svg>
							This brew isn't linked to a bag.
						</div>
						<a
							href="/brews/{brew.id}/edit"
							class="font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase hover:underline"
						>Link →</a>
					</div>
				{/if}

				{#if brew.published}
					<OpenPublicPostCard
						href={postUrl(brew.id)}
						title={brew.blogTitle ?? bag?.name ?? brew.coffeeName ?? 'Untitled brew'}
						publishedAt={brew.publishedAt}
					/>
				{/if}
			</div>

			<!-- Hero ratio block -->
			<div
				class="bg-surface border-hairline relative overflow-hidden rounded-[22px] border px-[22px] py-[24px]"
			>
				<div
					class="bg-copper-lt pointer-events-none absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full opacity-40"
				></div>
				<div class="relative">
					<Eyebrow>RATIO</Eyebrow>
					<div
						class="text-copper mt-1 font-mono text-[56px] font-medium leading-none tracking-[-0.04em]"
					>{formatRatio(brew)}</div>
					<p class="text-muted mt-3 text-[13px] leading-[1.5]">
						{brew.doseGrams}g of coffee yielded {outValue} of {verb} in {formatBrewTime(brew)}.
					</p>

					<div class="border-hairline mt-4 grid grid-cols-4 gap-1 border-t pt-4">
						<div>
							<div
								class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>DOSE</div>
							<div class="text-ink mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em]">
								{brew.doseGrams}g
							</div>
						</div>
						<div>
							<div
								class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>{outLabel}</div>
							<div class="text-ink mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em]">
								{outValue}
							</div>
						</div>
						<div>
							<div
								class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>TIME</div>
							<div class="text-ink mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em]">
								{formatBrewTime(brew)}
							</div>
						</div>
						<div>
							<div
								class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>RATIO</div>
							<div class="text-copper mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em]">
								{formatRatio(brew)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Next shot (dial-in) card -->
			{#if nextShot != null && !nextShotDismissed}
				{@const isHold = nextShot.kind === 'hold'}
				<div
					class="rounded-[18px] border px-4 py-[16px] {isHold
						? 'border-success/25 bg-success/[0.07]'
						: 'border-copper/25 bg-copper-lt'}"
				>
					<div
						class="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] {isHold
							? 'text-success'
							: 'text-copper-dk'}"
					>NEXT SHOT</div>
					<div
						class="font-display text-ink mt-1.5 text-[18px] font-medium leading-[1.25]"
					>{nextShot.headline}</div>
					{#if nextShot.kind === 'move'}
						<div class="mt-2 flex items-baseline gap-2.5">
							<span class="text-copper font-mono text-[26px] font-medium tracking-[-0.02em]">
								{nextShot.target ?? '—'}
							</span>
							<span
								class="text-copper-dk font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase"
							>
								{nextShot.deltaTicks < 0 ? '−' : '+'}{Math.abs(nextShot.deltaTicks)} ticks · {nextShot.direction}
							</span>
						</div>
					{/if}
					<p class="text-ink-70 mt-2 text-[13px] leading-[1.5]">{nextShot.prose}</p>
					<div class="mt-3.5 flex flex-wrap items-center gap-2">
						{#if pullNextHref}
							<a
								href={pullNextHref}
								class="{isHold
									? 'bg-success text-paper'
									: 'bg-copper text-paper hover:bg-copper-dk'} inline-flex h-10 items-center rounded-xl px-4 text-[13.5px] font-medium transition-colors"
							>
								{#if isHold}
									Repeat this shot
								{:else}
									Pull next shot at {nextShot.kind === 'move' ? (nextShot.target ?? 'adjusted grind') : ''}
								{/if}
							</a>
						{/if}
						<button
							type="button"
							onclick={() => (nextShotDismissed = true)}
							class="text-muted hover:text-ink px-2 text-[13px] transition-colors"
						>Done</button>
					</div>
				</div>
			{/if}

			<!-- Variables card -->
			{#if showVariables}
				<div class="bg-surface border-hairline rounded-[18px] border px-4 py-[14px]">
					<div class="grid grid-cols-2 gap-4">
						{#if brew.grindSetting}
							<div>
								<div
									class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
								>GRIND</div>
								<div class="text-ink mt-1 font-mono text-[19px] font-medium tracking-[-0.01em]">
									{brew.grindSetting}
								</div>
								<div class="text-muted mt-0.5 text-[11.5px]">
									{brew.method === 'espresso' ? 'Lagom Casa' : 'Fellow Ode 2'}
								</div>
							</div>
						{/if}
						{#if brew.waterTempC != null}
							<div>
								<div
									class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
								>{brew.method === 'espresso' ? 'BREW TEMP' : 'WATER TEMP'}</div>
								<div class="text-ink mt-1 font-mono text-[19px] font-medium tracking-[-0.01em]">
									{brew.waterTempC}°C
								</div>
							</div>
						{/if}
					</div>

					{#if espressoExtraction}
						<div class="mt-4">
							<div
								class="text-muted mb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>TASTE</div>
							<ExtractionScale value={espressoExtraction} readonly />
						</div>
					{/if}

					{#if brew.balance}
						<div class="mt-4">
							<div
								class="text-muted mb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
							>BALANCE</div>
							<BalanceScale value={brew.balance} readonly />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Rating card -->
			{#if brew.rating != null}
				<div class="bg-surface border-hairline rounded-[18px] border px-4 py-[16px]">
					<div class="flex items-end justify-between gap-4">
						<div>
							<div
								class="text-copper font-display font-mono text-[36px] font-medium leading-none tracking-[-0.02em]"
							>{brew.rating.toFixed(1)}</div>
							<div
								class="text-muted mt-1 font-mono text-[9.5px] font-medium tracking-[0.14em] uppercase"
							>out of 5</div>
						</div>
						<StarRow value={brew.rating} size={18} />
					</div>
				</div>
			{:else}
				<a
					href="/brews/{brew.id}/edit"
					class="border-hairline hover:border-copper/50 group flex items-center justify-between gap-3 rounded-[18px] border border-dashed px-4 py-[16px] transition-colors"
				>
					<div class="flex items-center gap-3">
						<StarRow value={0} size={16} />
						<div class="text-muted text-[13px]">Rate this brew</div>
					</div>
					<span
						class="text-copper font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
					>Add →</span>
				</a>
			{/if}

			<!-- Notes card -->
			{#if brew.notes}
				<div
					class="bg-surface border-hairline font-display text-ink-70 rounded-[18px] border px-4 py-3.5 text-[15.5px] leading-[1.5] italic"
				>
					<MarkdownText text={brew.notes} />
				</div>
			{:else}
				<a
					href="/brews/{brew.id}/edit"
					class="border-hairline hover:border-copper/50 group flex items-center justify-between gap-3 rounded-[18px] border border-dashed px-4 py-[16px] transition-colors"
				>
					<div class="text-muted font-display text-[14px] italic">
						What did it taste like?
					</div>
					<span
						class="text-copper font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
					>Add →</span>
				</a>
			{/if}

			<!-- Bag preview card -->
			{#if bag && bagConsumptionData}
				<a
					href="/bags/{bag.id}"
					class="bg-surface border-hairline hover:bg-paper/50 block rounded-[18px] border px-4 py-[14px] transition-colors"
				>
					<div class="flex items-start gap-3">
						<div
							class="bg-copper text-paper grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[10px]"
						>
							<svg
								width="22"
								height="22"
								viewBox="0 0 18 18"
								fill="none"
								stroke="currentColor"
								stroke-width="1.4"
								stroke-linejoin="round"
								stroke-linecap="round"
							>
								<path d="M3.2 5L4.7 3h8.6L14.8 5" />
								<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
								<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
							</svg>
						</div>
						<div class="min-w-0 flex-1">
							<div
								class="font-display text-ink truncate text-[17px] font-medium leading-[1.2]"
							>{bag.name}</div>
							<div class="text-muted mt-0.5 font-mono text-[11.5px] tracking-[0.04em]">
								{#if resolvedOrigin}<OriginFlag code={resolvedOrigin.code} country={resolvedOrigin.country} />{resolvedOrigin.country} · {/if}{#if bag.weightGrams != null && bagConsumptionData.remaining != null}
									{Math.max(0, bagConsumptionData.remaining).toFixed(0)}G LEFT · {bagConsumptionData.brewCount}
									BREW{bagConsumptionData.brewCount === 1 ? '' : 'S'}
								{:else}
									{bagConsumptionData.brewCount} BREW{bagConsumptionData.brewCount === 1
										? ''
										: 'S'}
								{/if}
							</div>
							{#if bag.weightGrams != null && bagConsumptionData.percentUsed != null}
								<div class="mt-2 h-1 overflow-hidden rounded-full bg-[#EDE5D4]">
									<div
										class="bg-copper h-full"
										style="width: {Math.max(0, 100 - bagConsumptionData.percentUsed)}%"
									></div>
								</div>
							{/if}
						</div>
					</div>
				</a>
			{/if}

			<!-- Footer actions -->
			<div class="mt-6 grid grid-cols-2 gap-2.5">
				<button
					type="button"
					onclick={handleDuplicate}
					class="bg-ink/[0.04] text-ink hover:bg-ink/[0.08] flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-medium transition-colors"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linejoin="round"
						stroke-linecap="round"
					>
						<rect x="2.5" y="2.5" width="9" height="9" rx="1.5" />
						<path d="M5.5 5.5h9v9h-9V11" />
					</svg>
					Duplicate
				</button>
				<button
					type="button"
					onclick={handleDelete}
					class="bg-danger/8 text-danger hover:bg-danger/14 flex items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-medium transition-colors"
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 4h10M6 4V2.5h4V4M5 4v9c0 .8.7 1.5 1.5 1.5h3c.8 0 1.5-.7 1.5-1.5V4" />
					</svg>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
