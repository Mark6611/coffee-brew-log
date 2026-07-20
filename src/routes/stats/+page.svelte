<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Brew, Bag } from '$lib/db/types';
	import { listBrews, listBags } from '$lib/db/repository';
	import {
		filterByRange,
		brewsByWeek,
		avgRatio,
		avgRating,
		methodSplit,
		ratioBuckets,
		topRatedBrews,
		mostBrewedBag,
		freshnessAtBrew,
		brewsByHour,
		peakHour,
		pullQuote,
		formatHour,
		type Range
	} from '$lib/stats/compute';
	import { formatRatio } from '$lib/brews/compute';
	import { costSummary } from '$lib/stats/cost';
	import Button from '$lib/components/Button.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import StarRow from '$lib/components/StarRow.svelte';

	// No currency is stored — figures are in whatever the owner paid. Group
	// thousands; keep cents only for small (per-cup) numbers.
	function money(n: number, dp = 0): string {
		return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
	}

	let allBrews = $state<Brew[]>([]);
	let allBags = $state<Bag[]>([]);
	let loading = $state(true);

	const range = $derived((page.url.searchParams.get('range') as Range | null) ?? '12w');
	const filtered = $derived(filterByRange(allBrews, range));

	onMount(async () => {
		[allBrews, allBags] = await Promise.all([listBrews(), listBags()]);
		loading = false;
	});

	const totalAll = $derived(allBrews.length);
	const weekly = $derived(brewsByWeek(filtered, 12));
	const thisWeek = $derived(weekly[weekly.length - 1] ?? 0);
	const prevWeek = $derived(weekly[weekly.length - 2] ?? 0);
	const weekDelta = $derived(thisWeek - prevWeek);

	const avgR = $derived(avgRatio(filtered));
	const avgRat = $derived(avgRating(filtered));
	const ms = $derived(methodSplit(filtered));
	const ratios = $derived(ratioBuckets(filtered));
	const top3 = $derived(topRatedBrews(filtered, 3));
	const topBag = $derived(mostBrewedBag(filtered, allBags));
	const freshness = $derived(freshnessAtBrew(filtered, allBags));
	const byHour = $derived(brewsByHour(filtered));
	const peak = $derived(peakHour(byHour));
	const quote = $derived(pullQuote(allBrews, allBags, range));
	// Per-cup economics respect the range; bean spend is lifetime (a purchase
	// isn't dated to a brew). Section hides entirely when no prices are logged.
	const cost = $derived(costSummary(allBags, filtered));

	const maxWeek = $derived(Math.max(...weekly, 1));
	const maxHour = $derived(Math.max(...byHour, 1));
	const maxRatioBucket = $derived(Math.max(...ratios.counts, 1));

	const medianBucketIdx = $derived.by(() => {
		if (ratios.median == null) return -1;
		let best = 0;
		let bestDist = Math.abs(ratios.ratios[0] - ratios.median);
		for (let i = 1; i < ratios.ratios.length; i++) {
			const d = Math.abs(ratios.ratios[i] - ratios.median);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		return best;
	});

	const rangeOptions: { value: Range; label: string }[] = [
		{ value: '12w', label: '12 WEEKS' },
		{ value: '6m', label: '6 MO' },
		{ value: 'all', label: 'ALL' }
	];
</script>

<svelte:head>
	<title>Stats</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-12">
	<!-- Header row -->
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

		<div class="flex gap-1.5">
			{#each rangeOptions as opt (opt.value)}
				<a
					href={resolve(`/stats?range=${opt.value}`)}
					class="press-sm inline-flex h-9 items-center rounded-full px-3 font-mono text-[10px] font-medium tracking-[0.1em] {range ===
					opt.value
						? 'bg-ink text-paper'
						: 'border border-hairline text-muted hover:text-ink'}">{opt.label}</a
				>
			{/each}
		</div>
	</div>

	{#if loading}
		<p class="py-8 text-center text-sm text-muted">Loading…</p>
	{:else if totalAll === 0}
		<div class="px-[22px] pt-12 pb-20 text-center">
			<h2 class="font-display text-[26px] leading-[1.15] font-medium tracking-[-0.01em] text-ink">
				Nothing to count yet.
			</h2>
			<p class="mt-2 max-w-[280px] font-display text-[15px] text-muted italic">
				Log a brew or two and stats appear here.
			</p>
			<Button size="medium" variant="prominent" href="/brews/new" class="mt-6">Log a brew</Button>
		</div>
	{:else}
		<div class="space-y-7 px-[22px]">
			<!-- Headline -->
			<div>
				<Eyebrow>STATS</Eyebrow>
				<h1
					class="mt-1 font-display text-[34px] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
				>
					{totalAll}
					{totalAll === 1 ? 'brew' : 'brews'},<br />
					<span class="text-muted italic">and counting.</span>
				</h1>
			</div>

			<!-- Last 12 weeks sparkbar -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<Eyebrow>LAST 12 WEEKS</Eyebrow>
					{#if weekDelta !== 0 && prevWeek > 0}
						<span
							class="font-mono text-[11px] font-medium tracking-[0.04em]"
							style="color: {weekDelta > 0 ? 'var(--color-success)' : 'var(--color-danger)'}"
						>
							{weekDelta > 0 ? '↑' : '↓'}
							{Math.abs(weekDelta)} vs last week
						</span>
					{/if}
				</div>
				<div class="flex h-20 items-end gap-1">
					{#each weekly as count, i (i)}
						<div
							class="flex-1 rounded-sm transition-colors"
							style="height: {Math.max(8, (count / maxWeek) * 100)}%; background: {i ===
							weekly.length - 1
								? 'var(--color-copper)'
								: 'var(--color-rule)'}"
							title="{count} brew{count === 1 ? '' : 's'}"
						></div>
					{/each}
				</div>
			</div>

			<!-- Quick stats -->
			<div class="grid grid-cols-3 gap-2.5">
				<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
					<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
						THIS WEEK
					</div>
					<div class="mt-1 font-display text-2xl font-medium tracking-[-0.01em] text-copper">
						{thisWeek}
					</div>
				</div>
				<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
					<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
						AVG RATIO
					</div>
					<div class="mt-1 font-display font-mono text-2xl font-medium tracking-[-0.01em] text-ink">
						{avgR != null ? `1:${avgR.toFixed(1)}` : '—'}
					</div>
				</div>
				<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
					<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
						AVG RATING
					</div>
					<div class="mt-1 font-display text-2xl font-medium tracking-[-0.01em] text-ink">
						{avgRat != null ? avgRat.toFixed(1) : '—'}
					</div>
				</div>
			</div>

			<!-- Method split -->
			{#if ms.espresso + ms.pourOver > 0}
				<div>
					<Eyebrow class="mb-2">METHOD SPLIT</Eyebrow>
					<div class="flex items-end justify-between gap-4">
						<div>
							<div
								class="font-display font-mono text-[28px] leading-none font-medium tracking-[-0.02em] text-copper"
							>
								{Math.round(ms.pourOverPct)}%
							</div>
							<div
								class="mt-0.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								POUR-OVER · {ms.pourOver}
							</div>
						</div>
						<div class="text-right">
							<div
								class="font-display font-mono text-[28px] leading-none font-medium tracking-[-0.02em] text-copper-dk"
							>
								{Math.round(ms.espressoPct)}%
							</div>
							<div
								class="mt-0.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								ESPRESSO · {ms.espresso}
							</div>
						</div>
					</div>
					<div class="mt-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
						{#if ms.pourOverPct > 0}
							<div class="h-full bg-copper" style="width: {ms.pourOverPct}%"></div>
						{/if}
						{#if ms.espressoPct > 0}
							<div class="h-full bg-copper-dk" style="width: {ms.espressoPct}%"></div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Cost — only when prices have been logged -->
			{#if cost.costPerCup != null || cost.totalBeanSpend > 0}
				<div>
					<Eyebrow class="mb-2">COST</Eyebrow>
					<div class="flex items-end justify-between gap-4">
						<div>
							<div
								class="font-display font-mono text-[28px] leading-none font-medium tracking-[-0.02em] text-copper"
							>
								{cost.costPerCup != null ? money(cost.costPerCup, 1) : '—'}
							</div>
							<div
								class="mt-0.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								PER CUP{#if cost.cupsWithCost > 0}
									· {cost.cupsWithCost} counted{/if}
							</div>
						</div>
						<div class="text-right">
							<div
								class="font-display font-mono text-[28px] leading-none font-medium tracking-[-0.02em] text-copper-dk"
							>
								{money(cost.totalBrewedValue)}
							</div>
							<div
								class="mt-0.5 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
							>
								BREWED THIS RANGE
							</div>
						</div>
					</div>
					{#if cost.totalBeanSpend > 0}
						<p class="mt-2.5 font-mono text-[10.5px] tracking-[0.04em] text-faint">
							{money(cost.totalBeanSpend)} spent on beans all-time
						</p>
					{/if}
				</div>
			{/if}

			<!-- Ratio distribution (pour-over only) -->
			{#if ms.pourOver > 0}
				<div>
					<div class="mb-2 flex items-center justify-between">
						<Eyebrow>RATIO DISTRIBUTION</Eyebrow>
						{#if ratios.median != null}
							<span class="font-mono text-[11px] tracking-[0.04em] text-muted">
								MEDIAN <span class="text-copper">1:{ratios.median.toFixed(1)}</span>
							</span>
						{/if}
					</div>
					<div class="relative flex h-24 items-end gap-1">
						{#each ratios.counts as count, i (i)}
							<div
								class="flex-1 rounded-sm transition-colors"
								style="height: {Math.max(
									count === 0 ? 0 : 6,
									(count / maxRatioBucket) * 100
								)}%; background: {i === medianBucketIdx
									? 'var(--color-copper)'
									: 'var(--color-rule)'}"
								title="1:{ratios.ratios[i]} · {count} brew{count === 1 ? '' : 's'}"
							></div>
						{/each}
					</div>
					<div
						class="mt-1 flex justify-between font-mono text-[9.5px] tracking-[0.04em] text-muted"
					>
						<span>1:14</span>
						<span>1:16</span>
						<span>1:18</span>
					</div>
				</div>
			{/if}

			<!-- Best brews -->
			{#if top3.length > 0}
				<div>
					<Eyebrow class="mb-2">BEST BREWS</Eyebrow>
					<div class="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
						{#each top3 as brew, i (brew.id)}
							{@const linkedBag = allBags.find((b) => b.id === brew.bagId)}
							<a
								href={resolve('/brews/[id]', { id: brew.id })}
								class="flex items-center justify-between gap-3 bg-surface px-3.5 py-3 transition-colors hover:bg-paper/50"
							>
								<div class="flex items-center gap-3">
									<span
										class="w-5 font-display text-[20px] leading-none font-medium {i === 0
											? 'text-copper'
											: 'text-muted'}">{i + 1}</span
									>
									<div class="min-w-0">
										<div class="truncate text-[14px] font-medium text-ink">
											{linkedBag?.name ?? brew.coffeeName ?? 'Untitled'}
										</div>
										<div class="mt-0.5 truncate font-mono text-[11px] tracking-[0.04em] text-muted">
											{brew.method} · <span class="text-copper">{formatRatio(brew)}</span>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="font-mono text-[13px] font-medium text-ink">
										{brew.rating?.toFixed(1)}
									</span>
									<StarRow value={brew.rating ?? 0} size={12} />
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Bag patterns -->
			{#if topBag.bag || freshness.total > 0}
				<div>
					<Eyebrow class="mb-2">BAG PATTERNS</Eyebrow>
					<div class="space-y-2.5">
						{#if topBag.bag}
							<a
								href={resolve('/bags/[id]', { id: topBag.bag.id })}
								class="flex items-center gap-3 rounded-[14px] bg-copper-lt px-3 py-2.5 transition-colors hover:bg-copper-lt/80"
							>
								<div
									class="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-copper text-paper"
								>
									<svg
										width="16"
										height="16"
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
									<div class="truncate font-display text-[15px] leading-[1.2] font-medium text-ink">
										MOST BREWED · {topBag.bag.name}
									</div>
									<div class="mt-0.5 font-mono text-[11px] tracking-[0.04em] text-copper-dk">
										{topBag.count} brew{topBag.count === 1 ? '' : 's'}
									</div>
								</div>
							</a>
						{/if}

						{#if freshness.total > 0}
							<div class="rounded-[14px] border border-hairline bg-surface px-3.5 py-3">
								<div
									class="mb-2 font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
								>
									FRESHNESS AT BREW
								</div>
								<div class="flex h-2.5 overflow-hidden rounded-full">
									{#if freshness.fresh > 0}
										<div
											class="h-full"
											style="background: var(--color-success); width: {(freshness.fresh /
												freshness.total) *
												100}%"
											title="{freshness.fresh} fresh"
										></div>
									{/if}
									{#if freshness.careful > 0}
										<div
											class="h-full"
											style="background: var(--color-warning); width: {(freshness.careful /
												freshness.total) *
												100}%"
											title="{freshness.careful} careful"
										></div>
									{/if}
									{#if freshness.old > 0}
										<div
											class="h-full"
											style="background: var(--color-danger); width: {(freshness.old /
												freshness.total) *
												100}%"
											title="{freshness.old} old"
										></div>
									{/if}
								</div>
								<div
									class="mt-2 flex justify-between font-mono text-[10px] tracking-[0.04em] text-muted"
								>
									<span style="color: var(--color-success)">{freshness.fresh} FRESH</span>
									<span style="color: var(--color-warning)">{freshness.careful} CAREFUL</span>
									<span style="color: var(--color-danger)">{freshness.old} OLD</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Time of day -->
			{#if filtered.length > 0}
				<div>
					<div class="mb-2 flex items-center justify-between">
						<Eyebrow>TIME OF DAY</Eyebrow>
						{#if peak}
							<span class="font-mono text-[11px] tracking-[0.04em] text-muted">
								PEAK <span class="text-copper">{formatHour(peak.hour)}</span>
							</span>
						{/if}
					</div>
					<div class="grid grid-cols-12 gap-1">
						{#each byHour as count, hr (hr)}
							{@const intensity = count === 0 ? 0 : 0.2 + (count / maxHour) * 0.8}
							<div
								class="aspect-square rounded-sm"
								style="background-color: var(--color-paper); background-image: linear-gradient(rgb(var(--color-copper-rgb) / {intensity.toFixed(
									2
								)}), rgb(var(--color-copper-rgb) / {intensity.toFixed(2)}))"
								title="{count} brew{count === 1 ? '' : 's'} at {formatHour(hr)}"
								aria-label="{count} brews at {formatHour(hr)}"
							></div>
						{/each}
					</div>
					<div
						class="mt-1.5 flex justify-between font-mono text-[9.5px] tracking-[0.04em] text-muted"
					>
						<span>12 AM</span>
						<span>6 AM</span>
						<span>12 PM</span>
						<span>6 PM</span>
					</div>
				</div>
			{/if}

			<!-- Pull quote -->
			<div
				class="rounded-[18px] border border-hairline bg-surface px-4 py-4 text-center font-display text-[14px] leading-[1.55] text-ink-70 italic"
			>
				"{quote}"
			</div>
		</div>
	{/if}
</div>
