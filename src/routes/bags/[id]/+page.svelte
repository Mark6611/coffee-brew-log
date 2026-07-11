<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Bag, Brew } from '$lib/db/types';
	import { getBagById, listBags, listBrews, archiveBag, updateBag } from '$lib/db/repository';
	import { bagConsumption, daysSinceRoast, freshnessTone, freshnessLabel } from '$lib/bags/compute';
	import { ratio, formatRatio, formatBrewTime, formatTimeAgo } from '$lib/brews/compute';
	import { resolveOrigin } from '$lib/origin/resolve';
	import { resolveGrindSuggestion } from '$lib/brews/grind';
	import {
		espressoShotsFor,
		resolveNextShot,
		readyToDial,
		inWindow,
		ROAST_TARGETS
	} from '$lib/brews/dialin';
	import { roastMeta } from '$lib/bags/roast';
	import { costPerGram, costPerCupForBag } from '$lib/stats/cost';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import ProcessBadge from '$lib/components/ProcessBadge.svelte';
	import OriginFlag from '$lib/components/OriginFlag.svelte';
	import MarkdownText from '$lib/components/MarkdownText.svelte';
	import TargetWindowBar from '$lib/components/TargetWindowBar.svelte';
	import DialedBadge from '$lib/components/DialedBadge.svelte';

	const bagId = $derived(page.params.id as string);

	let bag = $state<Bag | null>(null);
	let allBags = $state<Bag[]>([]);
	let allBrews = $state<Brew[]>([]);
	let brews = $state<Brew[]>([]);
	let loading = $state(true);
	let notFound = $state(false);

	$effect(() => {
		void load(bagId);
	});

	async function load(id: string) {
		loading = true;
		notFound = false;
		const [found, bags, allBrewsData] = await Promise.all([
			getBagById(id),
			listBags(),
			listBrews()
		]);
		if (!found) {
			notFound = true;
			bag = null;
			brews = [];
		} else {
			bag = found;
			allBrews = allBrewsData;
			brews = allBrewsData.filter((b) => b.bagId === id);
			allBags = bags;
		}
		loading = false;
	}

	const consumption = $derived(bag ? bagConsumption(bag, brews) : null);
	const costPerCup = $derived(bag ? costPerCupForBag(bag, brews) : null);
	const perGram = $derived(bag ? costPerGram(bag) : null);
	// Estimated value of coffee still in the bag (remaining grams × cost/gram).
	const remainingValue = $derived(
		perGram != null && consumption?.remaining != null
			? perGram * Math.max(0, consumption.remaining)
			: null
	);
	function money(n: number, dp = 0): string {
		return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp });
	}

	const bagNumber = $derived.by(() => {
		const current = bag;
		if (!current || allBags.length === 0) return null;
		const sortedAsc = [...allBags].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		return sortedAsc.findIndex((b) => b.id === current.id) + 1;
	});

	const avgRatioStr = $derived.by(() => {
		if (brews.length === 0) return null;
		const sum = brews.reduce((acc, b) => acc + ratio(b), 0);
		return `1:${(sum / brews.length).toFixed(1)}`;
	});

	const dominantMethod = $derived.by(() => {
		if (brews.length === 0) return null;
		const counts: Record<string, number> = {};
		for (const b of brews) counts[b.method] = (counts[b.method] ?? 0) + 1;
		return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
	});

	// Read-only grind reference, one per method (shown only when roast level is set).
	const grindPourOver = $derived(
		bag?.roastLevel ? resolveGrindSuggestion(bag, 'pour-over', allBrews, allBags) : null
	);
	const grindEspresso = $derived(
		bag?.roastLevel ? resolveGrindSuggestion(bag, 'espresso', allBrews, allBags) : null
	);
	function provenance(kind: 'prefill' | 'history' | 'seed', brewsN?: number): string {
		if (kind === 'prefill') return 'YOUR LAST BREW';
		if (kind === 'history') return `FROM YOUR HISTORY · ${brewsN} BREW${brewsN === 1 ? '' : 'S'}`;
		return 'STARTING POINT';
	}

	const roastedDays = $derived(bag ? daysSinceRoast(bag.roastedAt) : null);
	const roastedTone = $derived(bag ? freshnessTone(bag.roastedAt) : null);
	const roastedFmt = $derived(
		bag?.roastedAt
			? new Date(bag.roastedAt + 'T00:00:00').toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				})
			: null
	);

	// ── Espresso dial-in ────────────────────────────────────────────────────
	const shots = $derived(bag ? espressoShotsFor(bag, allBrews) : []);
	const lastShot = $derived(shots.length > 0 ? shots[shots.length - 1] : null);
	// "Espresso bags only" — bags aren't typed by method, so infer: show the
	// section once espresso shots exist (or a recipe was declared), and show
	// the empty invite only on a brand-new bag with a roast level and no brews
	// of any method yet (a pour-over-only bag thus never sees it).
	const showDialIn = $derived.by(() => {
		const b = bag;
		if (!b) return false;
		if (shots.length > 0) return true;
		if (b.dialedRecipe) return true;
		if (brews.length === 0 && b.roastLevel) return true;
		return false;
	});
	const roastTarget = $derived(bag?.roastLevel ? ROAST_TARGETS[bag.roastLevel] : null);
	const windowShots = $derived(
		shots.map((s, i) => ({
			timeS: s.brewTimeSeconds,
			extraction: s.extraction,
			latest: i === shots.length - 1
		}))
	);
	const grindPath = $derived(shots.map((s) => s.grindSetting));
	const canDial = $derived.by(() => {
		const b = bag;
		if (!b) return false;
		if (b.dialedRecipe) return false;
		return shots.length >= 2;
	});
	const dialReady = $derived(bag ? readyToDial(shots, bag.roastLevel ?? undefined) : false);
	const nextMove = $derived.by(() => {
		const b = bag;
		if (!b) return null;
		if (b.dialedRecipe) return null;
		if (!lastShot) return null;
		return resolveNextShot(lastShot, b);
	});
	const pullShotHref = $derived.by(() => {
		const b = bag;
		if (!b) return '';
		const base = `/brews/new?bagId=${b.id}&method=espresso&quick=1`;
		const n = nextMove;
		if (n?.kind === 'move' && n.target) return `${base}&grind=${encodeURIComponent(n.target)}`;
		return base;
	});
	const settledAtShot = $derived.by(() => {
		const b = bag;
		if (!b?.dialedRecipe) return null;
		const declared = b.dialedRecipe.declaredAt;
		return shots.filter((s) => s.brewedAt <= declared).length;
	});
	function extractionTone(e: string | undefined): string {
		if (e === 'sour') return 'var(--color-warning)';
		if (e === 'balanced') return 'var(--color-success)';
		if (e === 'bitter') return 'var(--color-danger)';
		return 'var(--color-faint)';
	}

	async function handleMarkDialed() {
		const b = bag;
		const last = lastShot;
		if (!b || !last) return;
		const updated: Bag = {
			...b,
			dialedRecipe: {
				grind: last.grindSetting,
				doseG: last.doseGrams,
				yieldG: last.yieldGrams,
				timeS: last.brewTimeSeconds,
				tempC: last.waterTempC ?? undefined,
				declaredAt: new Date().toISOString()
			}
		};
		await updateBag(updated);
		bag = updated;
	}

	async function handleReopen() {
		const b = bag;
		if (!b) return;
		if (!confirm('Re-open the dial-in? The settled recipe will be cleared.')) return;
		const updated: Bag = { ...b, dialedRecipe: null };
		await updateBag(updated);
		bag = updated;
	}

	async function handleArchive() {
		if (!bag) return;
		const archive = !bag.archived;
		const msg = archive
			? 'Archive this bag? It will be hidden from the bag picker but linked brews keep their reference.'
			: 'Unarchive this bag?';
		if (!confirm(msg)) return;
		await archiveBag(bag.id, archive);
		bag = { ...bag, archived: archive };
	}
</script>

<svelte:head>
	<title>{bag?.name ?? 'Bag'}</title>
</svelte:head>

{#if loading}
	<p class="py-8 text-center text-sm text-muted">Loading…</p>
{:else if notFound || !bag}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Bag not found.</p>
		<a href="/bags" class="mt-3 inline-block text-copper underline">Back to bags</a>
	</div>
{:else}
	<div class="mx-auto max-w-2xl pb-12">
		<!-- Header row -->
		<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
			<a
				href="/bags"
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
				Bags
			</a>
			<span aria-hidden="true"></span>
			<a
				href="/bags/{bag.id}/edit"
				class="h-9 px-2 text-[14px] text-muted transition-colors hover:text-ink">Edit</a
			>
		</div>

		<div class="px-[22px]">
			<!-- Identity -->
			{#if bagNumber != null}
				<Eyebrow
					>BAG · #{bagNumber.toString().padStart(2, '0')}{bag.archived
						? ' · ARCHIVED'
						: ''}</Eyebrow
				>
			{/if}
			<h1
				class="mt-1 flex flex-wrap items-center gap-2.5 font-display text-[30px] leading-[1.1] font-medium tracking-[-0.015em] text-ink"
			>
				{bag.name}
				{#if bag.dialedRecipe}<DialedBadge />{/if}
			</h1>
			<div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
				{#if bag.roaster}
					<span>{bag.roaster}</span>
				{/if}
				{#if bag.roaster && bag.origin}<span>·</span>{/if}
				{#if bag.origin}
					{@const r = resolveOrigin(bag.origin)}
					<span>
						{#if r}<OriginFlag code={r.code} country={r.country} />{/if}{bag.origin}
					</span>
				{/if}
				{#if (bag.roaster || bag.origin) && bag.process}<span>·</span>{/if}
				{#if bag.process}
					<ProcessBadge process={bag.process} />
				{/if}
			</div>

			<!-- Label photo -->
			{#if bag.photo}
				<div class="mt-5 overflow-hidden rounded-2xl border border-hairline bg-surface">
					<img src={bag.photo} alt="{bag.name} label" class="max-h-[320px] w-full object-cover" />
				</div>
			{/if}

			<!-- Key facts card -->
			<div class="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-hairline bg-surface p-4">
				<div>
					<div class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">
						ROASTED
					</div>
					{#if roastedDays != null}
						<div
							class="mt-1 font-display text-[22px] font-medium tracking-[-0.01em]"
							style="color: {roastedTone}"
						>
							{roastedDays}d
						</div>
						<div class="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted">
							{roastedFmt}
						</div>
					{:else}
						<div class="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-ink">
							—
						</div>
					{/if}
				</div>
				<div>
					<div class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">
						BREWS
					</div>
					<div class="mt-1 font-display text-[22px] font-medium tracking-[-0.01em] text-ink">
						{brews.length}
					</div>
					<div class="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted">this bag</div>
				</div>
				<div>
					<div class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">
						AVG RATIO
					</div>
					<div
						class="mt-1 font-display font-mono text-[22px] font-medium tracking-[-0.01em] text-ink"
					>
						{avgRatioStr ?? '—'}
					</div>
					<div class="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-muted">
						{dominantMethod ?? '—'}
					</div>
				</div>
			</div>

			<!-- Consumption bar -->
			{#if bag.weightGrams != null && consumption != null}
				<div class="mt-5">
					<div class="flex items-center justify-between">
						<div class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">
							REMAINING
						</div>
						<div class="font-mono text-[12px]">
							<span class="text-copper">{Math.max(0, consumption.remaining ?? 0).toFixed(0)}g</span>
							<span class="text-muted"> / {bag.weightGrams}g</span>
						</div>
					</div>
					<div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EDE5D4]">
						<div
							class="h-full bg-copper transition-[width] duration-300 ease-out"
							style="width: {Math.max(0, 100 - (consumption.percentUsed ?? 0))}%"
						></div>
					</div>
					{#if consumption.percentUsed != null && consumption.percentUsed > 100}
						<div class="mt-1.5 font-mono text-[11px] text-warning">
							{(consumption.used - bag.weightGrams).toFixed(1)}g over recorded weight
						</div>
					{/if}
				</div>
			{/if}

			<!-- Cost (only when a price is logged for this bag) -->
			{#if perGram != null}
				<div class="mt-3 flex items-center justify-between">
					<div class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">
						COST{#if costPerCup != null}
							· {money(costPerCup, 1)}/cup{/if}
					</div>
					<div class="font-mono text-[12px]">
						{#if remainingValue != null}
							<span class="text-copper">{money(remainingValue)}</span>
							<span class="text-muted"> left</span>
						{:else}
							<span class="text-muted">{money(perGram, 2)}/g</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Roast level + suggested grind (only when roast level is set) -->
			{#if bag.roastLevel}
				{@const rm = roastMeta(bag.roastLevel)}
				<div class="mt-5">
					<Eyebrow class="mb-2">ROAST LEVEL</Eyebrow>
					<span
						class="inline-flex h-[34px] items-center rounded-full px-[14px] font-sans text-[13px] font-medium"
						style="background:{rm.bg}; color:{rm.fg}">{rm.label}</span
					>
				</div>

				<div class="mt-5">
					<Eyebrow class="mb-2">SUGGESTED GRIND</Eyebrow>
					<div
						class="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface"
					>
						{#each [{ label: 'Pour-over', s: grindPourOver }, { label: 'Espresso', s: grindEspresso }] as row (row.label)}
							{#if row.s}
								<div class="flex items-center justify-between gap-3 px-3.5 py-2.5">
									<span class="text-[13px] text-ink">{row.label}</span>
									<span class="flex items-center gap-2">
										<span class="font-mono text-[13px] font-medium text-copper">{row.s.value}</span>
										<span
											class="font-mono text-[9.5px] font-medium tracking-[0.1em] text-muted uppercase"
											>{provenance(
												row.s.kind,
												row.s.kind === 'history' ? row.s.brews : undefined
											)}</span
										>
									</span>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Espresso dial-in -->
			{#if showDialIn}
				<div class="mt-5">
					<div class="mb-2 flex items-baseline justify-between">
						<Eyebrow>DIAL-IN</Eyebrow>
						{#if bag.dialedRecipe}
							<span
								class="font-mono text-[10px] font-medium tracking-[0.12em] uppercase"
								style="color: var(--color-success)">Settled at shot {settledAtShot}</span
							>
						{:else if shots.length > 0}
							<span class="font-mono text-[10px] font-medium tracking-[0.12em] text-muted uppercase"
								>Shot {shots.length} · converging</span
							>
						{/if}
					</div>

					{#if roastTarget != null && bag.roastLevel}
						<div class="rounded-2xl border border-hairline bg-surface p-4">
							<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
								<span
									class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
									>{bag.roastLevel} roast target · 18g dose</span
								>
								<span class="font-mono text-[11.5px] font-medium text-copper">
									{roastTarget.ratio} → {roastTarget.yieldG}
								</span>
							</div>
							<div class="mt-3">
								<TargetWindowBar window={roastTarget.time} shots={windowShots} />
							</div>
							{#if shots.length === 0}
								<p class="mt-2.5 font-display text-[13px] leading-[1.45] text-muted italic">
									No shots yet. The window is where {bag.roastLevel} roasts usually land — your dots will
									appear here as you pull.
								</p>
							{/if}
						</div>
					{/if}

					{#if bag.dialedRecipe}
						{@const r = bag.dialedRecipe}
						<div
							class="mt-3 rounded-2xl border p-4"
							style="border-color: color-mix(in oklab, var(--color-success) 25%, transparent); background: color-mix(in oklab, var(--color-success) 6%, transparent)"
						>
							<div class="flex items-baseline justify-between">
								<span
									class="font-mono text-[9.5px] font-medium tracking-[0.14em] uppercase"
									style="color: var(--color-success)">Settled recipe</span
								>
								<button
									type="button"
									onclick={handleReopen}
									class="font-mono text-[9.5px] font-medium tracking-[0.12em] text-muted uppercase transition-colors hover:text-ink"
									>Re-open</button
								>
							</div>
							<div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span
									class="font-mono text-[24px] font-medium tracking-[-0.01em]"
									style="color: var(--color-success)">{r.grind}</span
								>
								<span class="font-mono text-[11.5px] tracking-[0.04em] text-muted uppercase">
									Dose {r.doseG}g · Yield {r.yieldG}g · Time ~{r.timeS}s{r.tempC != null
										? ` · Temp ${r.tempC}°C`
										: ''}
								</span>
							</div>
							<p class="mt-1.5 font-display text-[12.5px] text-muted italic">
								Declared after two consistent shots.
							</p>
						</div>
					{/if}

					{#if shots.length > 0}
						<div class="mt-3 space-y-1.5">
							{#each shots as s, i (s.id)}
								{@const latest = i === shots.length - 1}
								<a
									href="/brews/{s.id}"
									class="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 transition-colors {latest
										? 'border border-hairline bg-surface'
										: 'hover:bg-paper/60'}"
								>
									<span class="w-4 shrink-0 text-right font-mono text-[11px] text-muted"
										>{i + 1}</span
									>
									<span
										class="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
										style="background: {extractionTone(s.extraction)}"
										aria-hidden="true"
									></span>
									<span class="shrink-0 font-mono text-[14px] font-medium text-ink"
										>{s.grindSetting}</span
									>
									<span class="shrink-0 font-mono text-[12px] text-muted"
										>{s.yieldGrams}g · {s.brewTimeSeconds}s</span
									>
									<span class="min-w-0 flex-1 truncate text-[12px] text-muted">{s.notes ?? ''}</span
									>
									{#if s.rating != null}
										<span class="shrink-0 font-mono text-[12px] text-ink"
											>{s.rating.toFixed(1)}</span
										>
									{/if}
								</a>
							{/each}
						</div>

						{#if grindPath.length >= 2}
							<div class="mt-2 px-2.5 font-mono text-[11px] tracking-[0.04em] text-muted">
								<span class="text-[9.5px] font-medium tracking-[0.14em] uppercase">Grind path</span>
								{#each grindPath as g, i (i)}
									{#if i > 0}<span class="text-faint"> → </span>{/if}
									<span class={i === grindPath.length - 1 ? 'font-semibold text-copper' : ''}
										>{g}</span
									>
								{/each}
							</div>
						{/if}
					{/if}

					{#if !bag.dialedRecipe}
						<div class="mt-3.5 flex flex-wrap items-center gap-2">
							<a
								href={pullShotHref}
								class="inline-flex h-10 items-center rounded-xl bg-copper px-4 text-[13.5px] font-medium text-paper transition-colors hover:bg-copper-dk"
								>{shots.length === 0 ? 'Pull first shot' : 'Pull next shot'}</a
							>
							{#if canDial}
								<button
									type="button"
									onclick={handleMarkDialed}
									class="inline-flex h-10 items-center rounded-xl border px-4 text-[13.5px] font-medium transition-all {dialReady
										? 'border-copper bg-copper-lt text-copper'
										: 'border-hairline text-muted hover:text-ink'}">Mark dialed</button
								>
							{/if}
						</div>
					{:else}
						<div class="mt-3.5">
							<a
								href={pullShotHref}
								class="inline-flex h-10 items-center rounded-xl border border-hairline px-4 text-[13.5px] font-medium text-ink transition-colors hover:bg-paper"
								>Log a shot</a
							>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Notes -->
			{#if bag.notes}
				<div class="mt-5">
					<Eyebrow class="mb-2">NOTES</Eyebrow>
					<div
						class="rounded-2xl border border-hairline bg-paper px-4 py-3.5 font-display text-[15px] leading-[1.5] text-ink-70 italic"
					>
						<MarkdownText text={bag.notes} />
					</div>
				</div>
			{/if}

			<!-- Brews list -->
			{#if brews.length > 0}
				<div class="mt-6">
					<div class="mb-2 flex items-center justify-between">
						<Eyebrow>BREWS · {brews.length}</Eyebrow>
						<a
							href="/brews"
							class="font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
							>See all →</a
						>
					</div>
					<div class="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
						{#each brews as brew (brew.id)}
							<div class="flex items-center justify-between gap-3 bg-surface px-3.5 py-3">
								<div class="flex items-center gap-3">
									<span
										class="w-[62px] shrink-0 font-mono text-[17px] font-medium tracking-[-0.01em] text-copper"
										>{formatRatio(brew)}</span
									>
									<div>
										<div
											class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase"
										>
											{formatTimeAgo(brew.brewedAt)}
										</div>
										<div class="text-[13px] text-ink">
											{brew.method} · {formatBrewTime(brew)}
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 text-faint">
									{#if brew.isFavorite}
										<svg
											class="text-copper"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<polygon
												points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
											/>
										</svg>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Archive button -->
			<div class="mt-8">
				<button
					type="button"
					onclick={handleArchive}
					class="{bag.archived
						? 'bg-success/10 text-success hover:bg-success/15'
						: 'bg-danger/8 text-danger hover:bg-danger/14'} press w-full rounded-full py-3 text-[14px] font-medium"
					>{bag.archived ? 'Unarchive this bag' : 'Archive this bag'}</button
				>
			</div>
		</div>
	</div>
{/if}
