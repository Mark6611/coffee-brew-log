<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Brew, Bag } from '$lib/db/types';
	import { getBrewById, getBagById, listBrews, deleteBrew } from '$lib/db/repository';
	import { formatRatio, formatBrewTime, formatTimeAgo, ratio } from '$lib/brews/compute';
	import { freshnessTone, freshnessLabel, freshnessStale, bagConsumption } from '$lib/bags/compute';
	import { resolveOrigin } from '$lib/origin/resolve';
	import { resolveNextShot, espressoShotsFor } from '$lib/brews/dialin';
	import { stageBrewAgain } from '$lib/brews/repeat';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import StarRow from '$lib/components/StarRow.svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';
	import ExtractionScale from '$lib/components/ExtractionScale.svelte';
	import OriginFlag from '$lib/components/OriginFlag.svelte';
	import MarkdownText from '$lib/components/MarkdownText.svelte';
	import PublishedBadge from '$lib/components/PublishedBadge.svelte';
	import OpenPublicPostCard from '$lib/components/OpenPublicPostCard.svelte';
	import { postUrl, BLOG_ENABLED } from '$lib/blog/config';

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
		const grind = n.kind === 'move' && n.target ? n.target : b.grindSetting;
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
		goto(stageBrewAgain(brew));
	}

	const bagConsumptionData = $derived(bag && brew ? bagConsumption(bag, allBrews) : null);
</script>

<svelte:head>
	<title>{brew?.coffeeName ?? bag?.name ?? 'Brew'}</title>
</svelte:head>

{#if loading}
	<p class="py-8 text-center text-sm text-muted">Loading…</p>
{:else if notFound || !brew}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Brew not found.</p>
		<a href="/brews" class="mt-3 inline-block text-copper underline">Back to brews</a>
	</div>
{:else}
	<div class="mx-auto max-w-2xl pb-12">
		<!-- Header row -->
		<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
			<a
				href="/brews"
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
				Brews
			</a>
			<a
				href="/brews/{brew.id}/edit"
				class="h-9 px-2 text-[14px] text-muted transition-colors hover:text-ink">Edit</a
			>
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
							class="inline-flex h-[22px] items-center gap-1 rounded-full bg-success/10 px-2 font-mono text-[10.5px] font-medium tracking-[0.12em] text-success uppercase"
						>
							<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
								<polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								/>
							</svg>
							Favorite
						</span>
					{/if}
					{#if BLOG_ENABLED && brew.published}
						<PublishedBadge href={postUrl(brew.id)} />
					{/if}
				</div>

				<h1
					class="mt-3 font-display text-[30px] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
				>
					{bag?.name ?? brew.coffeeName ?? 'Untitled brew'}
				</h1>

				{#if bag}
					<a
						href="/bags/{bag.id}"
						class="mt-1.5 inline-flex items-center gap-1 text-[13px] text-copper-dk transition-colors hover:text-copper"
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
						{#if resolvedOrigin}<span class="text-muted">
								· <OriginFlag
									code={resolvedOrigin.code}
									country={resolvedOrigin.country}
								/>{resolvedOrigin.country}</span
							>{/if}
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
					<div class="mt-1.5 text-[13px] text-muted">{brew.roaster ?? ''}</div>
				{/if}

				<div class="mt-2 font-mono text-[12px] tracking-[0.04em] text-muted">
					{formatTimeAgo(brew.brewedAt)}
				</div>

				{#if !brew.bagId}
					<div
						class="mt-3 flex items-center justify-between gap-3 rounded-[14px] bg-copper-lt px-3.5 py-2.5 text-[12.5px] text-copper-dk"
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
							>Link →</a
						>
					</div>
				{/if}

				{#if BLOG_ENABLED && brew.published}
					<OpenPublicPostCard
						href={postUrl(brew.id)}
						title={brew.blogTitle ?? bag?.name ?? brew.coffeeName ?? 'Untitled brew'}
						publishedAt={brew.publishedAt}
					/>
				{/if}
			</div>

			<!-- Photo -->
			{#if brew.photo}
				<div class="overflow-hidden rounded-[22px] border border-hairline bg-surface">
					<img src={brew.photo} alt="This brew" class="max-h-[340px] w-full object-cover" />
				</div>
			{/if}

			<!-- Hero ratio block -->
			<div
				class="relative overflow-hidden rounded-[22px] border border-hairline bg-surface px-[22px] py-[24px]"
			>
				<div
					class="pointer-events-none absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full bg-copper-lt opacity-40"
				></div>
				<div class="relative">
					<Eyebrow>RATIO</Eyebrow>
					<div
						class="mt-1 font-mono text-[56px] leading-none font-medium tracking-[-0.04em] text-copper"
					>
						{formatRatio(brew)}
					</div>
					<p class="mt-3 text-[13px] leading-[1.5] text-muted">
						{brew.doseGrams}g of coffee yielded {outValue} of {verb} in {formatBrewTime(brew)}.
					</p>

					<div class="mt-4 grid grid-cols-4 gap-1 border-t border-hairline pt-4">
						<div>
							<div
								class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								DOSE
							</div>
							<div class="mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em] text-ink">
								{brew.doseGrams}g
							</div>
						</div>
						<div>
							<div
								class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								{outLabel}
							</div>
							<div class="mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em] text-ink">
								{outValue}
							</div>
						</div>
						<div>
							<div
								class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								TIME
							</div>
							<div class="mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em] text-ink">
								{formatBrewTime(brew)}
							</div>
						</div>
						<div>
							<div
								class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								RATIO
							</div>
							<div class="mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em] text-copper">
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
						class="font-mono text-[9.5px] font-medium tracking-[0.14em] uppercase {isHold
							? 'text-success'
							: 'text-copper-dk'}"
					>
						NEXT SHOT
					</div>
					<div class="mt-1.5 font-display text-[18px] leading-[1.25] font-medium text-ink">
						{nextShot.headline}
					</div>
					{#if nextShot.kind === 'move'}
						<div class="mt-2 flex items-baseline gap-2.5">
							<span class="font-mono text-[26px] font-medium tracking-[-0.02em] text-copper">
								{nextShot.target ?? '—'}
							</span>
							<span
								class="font-mono text-[10.5px] font-medium tracking-[0.12em] text-copper-dk uppercase"
							>
								{nextShot.deltaTicks < 0 ? '−' : '+'}{Math.abs(nextShot.deltaTicks)} ticks · {nextShot.direction}
							</span>
						</div>
					{/if}
					<p class="mt-2 text-[13px] leading-[1.5] text-ink-70">{nextShot.prose}</p>
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
									Pull next shot at {nextShot.kind === 'move'
										? (nextShot.target ?? 'adjusted grind')
										: ''}
								{/if}
							</a>
						{/if}
						<button
							type="button"
							onclick={() => (nextShotDismissed = true)}
							class="px-2 text-[13px] text-muted transition-colors hover:text-ink">Done</button
						>
					</div>
				</div>
			{/if}

			<!-- Variables card -->
			{#if showVariables}
				<div class="rounded-[18px] border border-hairline bg-surface px-4 py-[14px]">
					<div class="grid grid-cols-2 gap-4">
						{#if brew.grindSetting}
							<div>
								<div
									class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
								>
									GRIND
								</div>
								<div class="mt-1 font-mono text-[19px] font-medium tracking-[-0.01em] text-ink">
									{brew.grindSetting}
								</div>
								<div class="mt-0.5 text-[11.5px] text-muted">
									{brew.method === 'espresso' ? 'Lagom Casa' : 'Fellow Ode 2'}
								</div>
							</div>
						{/if}
						{#if brew.waterTempC != null}
							<div>
								<div
									class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
								>
									{brew.method === 'espresso' ? 'BREW TEMP' : 'WATER TEMP'}
								</div>
								<div class="mt-1 font-mono text-[19px] font-medium tracking-[-0.01em] text-ink">
									{brew.waterTempC}°C
								</div>
							</div>
						{/if}
					</div>

					{#if espressoExtraction}
						<div class="mt-4">
							<div
								class="mb-1.5 font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								TASTE
							</div>
							<ExtractionScale value={espressoExtraction} readonly />
						</div>
					{/if}

					{#if brew.balance}
						<div class="mt-4">
							<div
								class="mb-1.5 font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								BALANCE
							</div>
							<BalanceScale value={brew.balance} readonly />
						</div>
					{/if}
				</div>
			{/if}

			<!-- Rating card -->
			{#if brew.rating != null}
				<div class="rounded-[18px] border border-hairline bg-surface px-4 py-[16px]">
					<div class="flex items-end justify-between gap-4">
						<div>
							<div
								class="font-display font-mono text-[36px] leading-none font-medium tracking-[-0.02em] text-copper"
							>
								{brew.rating.toFixed(1)}
							</div>
							<div
								class="mt-1 font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								out of 5
							</div>
						</div>
						<StarRow value={brew.rating} size={18} />
					</div>
				</div>
			{:else}
				<a
					href="/brews/{brew.id}/edit"
					class="group flex items-center justify-between gap-3 rounded-[18px] border border-dashed border-hairline px-4 py-[16px] transition-colors hover:border-copper/50"
				>
					<div class="flex items-center gap-3">
						<StarRow value={0} size={16} />
						<div class="text-[13px] text-muted">Rate this brew</div>
					</div>
					<span class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-copper uppercase"
						>Add →</span
					>
				</a>
			{/if}

			<!-- Notes card -->
			{#if brew.notes}
				<div
					class="rounded-[18px] border border-hairline bg-surface px-4 py-3.5 font-display text-[15.5px] leading-[1.5] text-ink-70 italic"
				>
					<MarkdownText text={brew.notes} />
				</div>
			{:else}
				<a
					href="/brews/{brew.id}/edit"
					class="group flex items-center justify-between gap-3 rounded-[18px] border border-dashed border-hairline px-4 py-[16px] transition-colors hover:border-copper/50"
				>
					<div class="font-display text-[14px] text-muted italic">What did it taste like?</div>
					<span class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-copper uppercase"
						>Add →</span
					>
				</a>
			{/if}

			<!-- Bag preview card -->
			{#if bag && bagConsumptionData}
				<a
					href="/bags/{bag.id}"
					class="block rounded-[18px] border border-hairline bg-surface px-4 py-[14px] transition-colors hover:bg-paper/50"
				>
					<div class="flex items-start gap-3">
						<div
							class="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-[10px] bg-copper text-paper"
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
							<div class="truncate font-display text-[17px] leading-[1.2] font-medium text-ink">
								{bag.name}
							</div>
							<div class="mt-0.5 font-mono text-[11.5px] tracking-[0.04em] text-muted">
								{#if resolvedOrigin}<OriginFlag
										code={resolvedOrigin.code}
										country={resolvedOrigin.country}
									/>{resolvedOrigin.country} ·
								{/if}{#if bag.weightGrams != null && bagConsumptionData.remaining != null}
									{Math.max(0, bagConsumptionData.remaining).toFixed(0)}G LEFT · {bagConsumptionData.brewCount}
									BREW{bagConsumptionData.brewCount === 1 ? '' : 'S'}
								{:else}
									{bagConsumptionData.brewCount} BREW{bagConsumptionData.brewCount === 1 ? '' : 'S'}
								{/if}
							</div>
							{#if bag.weightGrams != null && bagConsumptionData.percentUsed != null}
								<div class="mt-2 h-1 overflow-hidden rounded-full bg-[#EDE5D4]">
									<div
										class="h-full bg-copper"
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
					class="press flex items-center justify-center gap-2 rounded-full bg-ink/[0.04] py-3 text-[14px] font-medium text-ink hover:bg-ink/[0.08]"
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
						<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
						<path d="M13.5 2.5V5H11" />
					</svg>
					Brew again
				</button>
				<button
					type="button"
					onclick={handleDelete}
					class="press flex items-center justify-center gap-2 rounded-full bg-danger/8 py-3 text-[14px] font-medium text-danger hover:bg-danger/14"
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
