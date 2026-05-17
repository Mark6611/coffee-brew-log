<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Bag, Brew } from '$lib/db/types';
	import { getBagById, listBags, listBrews, archiveBag } from '$lib/db/repository';
	import {
		bagConsumption,
		daysSinceRoast,
		freshnessTone,
		freshnessLabel
	} from '$lib/bags/compute';
	import { ratio, formatRatio, formatBrewTime, formatTimeAgo } from '$lib/brews/compute';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import ProcessBadge from '$lib/components/ProcessBadge.svelte';

	const bagId = $derived(page.params.id as string);

	let bag = $state<Bag | null>(null);
	let allBags = $state<Bag[]>([]);
	let brews = $state<Brew[]>([]);
	let loading = $state(true);
	let notFound = $state(false);

	$effect(() => {
		void load(bagId);
	});

	async function load(id: string) {
		loading = true;
		notFound = false;
		const [found, bags, allBrews] = await Promise.all([
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
			brews = allBrews.filter((b) => b.bagId === id);
			allBags = bags;
		}
		loading = false;
	}

	const consumption = $derived(bag ? bagConsumption(bag, brews) : null);

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
	<p class="text-muted py-8 text-center text-sm">Loading…</p>
{:else if notFound || !bag}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Bag not found.</p>
		<a href="/bags" class="text-copper mt-3 inline-block underline">Back to bags</a>
	</div>
{:else}
	<div class="mx-auto max-w-2xl pb-12">
		<!-- Header row -->
		<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
			<a
				href="/bags"
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
				Bags
			</a>
			<span aria-hidden="true"></span>
			<a
				href="/bags/{bag.id}/edit"
				class="text-muted hover:text-ink h-9 px-2 text-[14px] transition-colors"
			>Edit</a>
		</div>

		<div class="px-[22px]">
			<!-- Identity -->
			{#if bagNumber != null}
				<Eyebrow>BAG · #{bagNumber.toString().padStart(2, '0')}{bag.archived ? ' · ARCHIVED' : ''}</Eyebrow>
			{/if}
			<h1
				class="font-display text-ink mt-1 text-[30px] font-medium leading-[1.1] tracking-[-0.015em]"
			>{bag.name}</h1>
			<div class="text-muted mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
				{#if bag.roaster}
					<span>{bag.roaster}</span>
				{/if}
				{#if bag.roaster && bag.origin}<span>·</span>{/if}
				{#if bag.origin}
					<span>{bag.origin}</span>
				{/if}
				{#if (bag.roaster || bag.origin) && bag.process}<span>·</span>{/if}
				{#if bag.process}
					<ProcessBadge process={bag.process} />
				{/if}
			</div>

			<!-- Key facts card -->
			<div class="bg-surface border-hairline mt-5 grid grid-cols-3 gap-3 rounded-2xl border p-4">
				<div>
					<div
						class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
					>ROASTED</div>
					{#if roastedDays != null}
						<div
							class="font-display mt-1 text-[22px] font-medium tracking-[-0.01em]"
							style="color: {roastedTone}"
						>{roastedDays}d</div>
						<div class="text-muted mt-0.5 font-mono text-[10.5px] tracking-[0.04em]">
							{roastedFmt}
						</div>
					{:else}
						<div
							class="font-display text-ink mt-1 text-[22px] font-medium tracking-[-0.01em]"
						>—</div>
					{/if}
				</div>
				<div>
					<div
						class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
					>BREWS</div>
					<div
						class="font-display text-ink mt-1 text-[22px] font-medium tracking-[-0.01em]"
					>{brews.length}</div>
					<div class="text-muted mt-0.5 font-mono text-[10.5px] tracking-[0.04em]">this bag</div>
				</div>
				<div>
					<div
						class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]"
					>AVG RATIO</div>
					<div
						class="font-display text-ink mt-1 font-mono text-[22px] font-medium tracking-[-0.01em]"
					>{avgRatioStr ?? '—'}</div>
					<div class="text-muted mt-0.5 font-mono text-[10.5px] tracking-[0.04em]">
						{dominantMethod ?? '—'}
					</div>
				</div>
			</div>

			<!-- Consumption bar -->
			{#if bag.weightGrams != null && consumption != null}
				<div class="mt-5">
					<div class="flex items-center justify-between">
						<div
							class="text-muted font-mono text-[10.5px] font-medium uppercase tracking-[0.14em]"
						>REMAINING</div>
						<div class="font-mono text-[12px]">
							<span class="text-copper">{Math.max(0, consumption.remaining ?? 0).toFixed(0)}g</span>
							<span class="text-muted"> / {bag.weightGrams}g</span>
						</div>
					</div>
					<div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EDE5D4]">
						<div
							class="bg-copper h-full transition-[width] duration-300 ease-out"
							style="width: {Math.max(0, 100 - (consumption.percentUsed ?? 0))}%"
						></div>
					</div>
					{#if consumption.percentUsed != null && consumption.percentUsed > 100}
						<div class="text-warning mt-1.5 font-mono text-[11px]">
							{(consumption.used - bag.weightGrams).toFixed(1)}g over recorded weight
						</div>
					{/if}
				</div>
			{/if}

			<!-- Notes -->
			{#if bag.notes}
				<div class="mt-5">
					<Eyebrow class="mb-2">NOTES</Eyebrow>
					<div
						class="bg-paper border-hairline font-display text-ink-70 rounded-2xl border px-4 py-3.5 text-[15px] leading-[1.5] italic"
					>{bag.notes}</div>
				</div>
			{/if}

			<!-- Brews list -->
			{#if brews.length > 0}
				<div class="mt-6">
					<div class="mb-2 flex items-center justify-between">
						<Eyebrow>BREWS · {brews.length}</Eyebrow>
						<a
							href="/brews"
							class="text-muted hover:text-ink font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase transition-colors"
						>See all →</a>
					</div>
					<div
						class="border-hairline divide-hairline overflow-hidden rounded-2xl border divide-y"
					>
						{#each brews as brew (brew.id)}
							<div
								class="bg-surface flex items-center justify-between gap-3 px-3.5 py-3"
							>
								<div class="flex items-center gap-3">
									<span
										class="text-copper w-[62px] shrink-0 font-mono text-[17px] font-medium tracking-[-0.01em]"
									>{formatRatio(brew)}</span>
									<div>
										<div
											class="text-muted font-mono text-[10px] font-medium tracking-[0.14em] uppercase"
										>{formatTimeAgo(brew.brewedAt)}</div>
										<div class="text-ink text-[13px]">
											{brew.method} · {formatBrewTime(brew)}
										</div>
									</div>
								</div>
								<div class="text-faint flex items-center gap-2">
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
						: 'bg-danger/8 text-danger hover:bg-danger/14'} w-full rounded-2xl py-3 text-[14px] font-medium transition-colors"
				>{bag.archived ? 'Unarchive this bag' : 'Archive this bag'}</button>
			</div>
		</div>
	</div>
{/if}
