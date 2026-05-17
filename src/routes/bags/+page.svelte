<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { Bag, Brew } from '$lib/db/types';
	import { listBags, listBrews, deleteBag } from '$lib/db/repository';
	import { bagConsumption, formatRoastedAt } from '$lib/bags/compute';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';

	let bags = $state<Bag[]>([]);
	let brews = $state<Brew[]>([]);
	let loading = $state(true);

	const showArchived = $derived(page.url.searchParams.get('show') === 'archived');
	const visibleBags = $derived(bags.filter((b) => !!b.archived === showArchived));
	const archivedCount = $derived(bags.filter((b) => b.archived).length);
	const activeCount = $derived(bags.length - archivedCount);

	async function refresh() {
		[bags, brews] = await Promise.all([listBags(), listBrews()]);
		loading = false;
	}

	onMount(refresh);

	async function handleDelete(bag: Bag) {
		const c = bagConsumption(bag, brews);
		const msg =
			c.brewCount > 0
				? `This bag has ${c.brewCount} linked brews. Deleting will unlink them (brews are kept). Continue?`
				: 'Delete this bag?';
		if (!confirm(msg)) return;
		await deleteBag(bag.id);
		await refresh();
	}
</script>

<svelte:head>
	<title>Bags</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-24">
	<AppHeader eyebrow={showArchived ? `ARCHIVED · ${archivedCount}` : `ACTIVE · ${activeCount}`}>
		Bags
	</AppHeader>

	{#if archivedCount > 0 || showArchived}
		<div class="px-[22px] pb-3">
			{#if showArchived}
				<a
					href="/bags"
					class="text-muted hover:text-ink font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors"
				>← Active</a>
			{:else}
				<a
					href="/bags?show=archived"
					class="text-muted hover:text-ink font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors"
				>Show archived ({archivedCount}) →</a>
			{/if}
		</div>
	{/if}

	<div class="px-[22px]">
		{#if loading}
			<p class="text-muted py-8 text-center text-sm">Loading…</p>
		{:else if visibleBags.length === 0 && !bags.length}
			<div class="flex flex-col items-center px-6 pt-12 pb-20 text-center">
				<div class="bg-copper-lt text-copper mb-6 grid h-24 w-24 place-items-center rounded-full">
					<svg width="56" height="56" viewBox="0 0 56 56" fill="none">
						<g transform="translate(28 28) rotate(-18)">
							<ellipse
								cx="0"
								cy="0"
								rx="14"
								ry="19"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
							/>
							<path
								d="M 0 -16.5 C 5.5 -10, -5.5 -1, 0 6.5 S 5.5 14, 0 16.5"
								fill="none"
								stroke="currentColor"
								stroke-width="2.4"
								stroke-linecap="round"
							/>
						</g>
					</svg>
				</div>
				<h2
					class="font-display text-ink m-0 text-[26px] font-medium leading-[1.15] tracking-[-0.01em]"
				>No bags yet.</h2>
				<p
					class="font-display text-muted mt-2 mb-7 max-w-[280px] text-[15px] leading-[1.5] italic"
				>Add a bag once and reach for it across all the brews you make from it.</p>
				<a
					href="/bags/new"
					class="bg-copper text-paper hover:bg-copper-dk inline-flex h-[52px] items-center gap-2.5 rounded-2xl px-5 text-[15px] font-medium transition-colors"
				>
					<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path
							d="M9 3v12M3 9h12"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
					Add first bag
				</a>
			</div>
		{:else if visibleBags.length === 0}
			<p class="text-muted py-12 text-center text-sm">
				{showArchived ? 'No archived bags.' : 'All bags are archived.'}
			</p>
		{:else}
			<div class="flex flex-col gap-2.5">
				{#each visibleBags as bag (bag.id)}
					{@const c = bagConsumption(bag, brews)}
					<div class="bg-surface border-hairline rounded-[18px] border px-[18px] pt-[16px] pb-[18px]">
						<a
							href="/bags/{bag.id}"
							class="mb-2 flex items-start justify-between gap-3 -m-2 p-2 rounded-lg hover:bg-paper/40 transition-colors"
						>
							<div class="flex-1">
								<div
									class="font-display text-ink text-[22px] font-medium leading-[1.15] tracking-[-0.005em]"
								>{bag.name}</div>
								{#if bag.roaster}
									<div class="text-muted mt-0.5 text-[13px]">{bag.roaster}</div>
								{/if}
							</div>
							{#if bag.process}
								<Badge>{bag.process}</Badge>
							{/if}
						</a>

						<div class="text-muted flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
							{#if bag.origin}
								<span>{bag.origin}</span>
							{/if}
							{#if bag.roastedAt}
								<span class="font-mono">{formatRoastedAt(bag.roastedAt)}</span>
							{/if}
						</div>

						{#if bag.weightGrams != null}
							<div class="border-hairline mt-3 grid grid-cols-3 gap-2 border-t pt-3">
								<div>
									<div class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]">USED</div>
									<div class="text-ink mt-0.5 font-mono text-[15px] font-medium">
										{c.used.toFixed(1)}g
									</div>
								</div>
								<div>
									<div class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]">REMAINING</div>
									<div class="text-copper mt-0.5 font-mono text-[15px] font-medium">
										{c.remaining != null ? c.remaining.toFixed(1) + 'g' : '—'}
									</div>
								</div>
								<div>
									<div class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]">BREWS</div>
									<div class="text-ink mt-0.5 font-mono text-[15px] font-medium">
										{c.brewCount}
									</div>
								</div>
							</div>
							{#if c.percentUsed != null}
								<div class="bg-hairline mt-3 h-1 overflow-hidden rounded-full">
									<div
										class="bg-copper h-full transition-all"
										style="width: {Math.min(100, c.percentUsed)}%"
									></div>
								</div>
							{/if}
						{:else if c.brewCount > 0}
							<div class="border-hairline mt-3 border-t pt-3">
								<div class="text-muted text-[13px]">
									{c.brewCount} brew{c.brewCount === 1 ? '' : 's'}
									{#if c.used > 0}· {c.used.toFixed(1)}g used{/if}
								</div>
							</div>
						{/if}

						<div class="mt-3 flex items-center justify-end gap-4">
							<a
								href="/bags/{bag.id}/edit"
								class="text-muted hover:text-ink text-[12px] transition-colors"
							>Edit</a>
							<button
								type="button"
								onclick={() => handleDelete(bag)}
								class="text-faint hover:text-danger text-[12px] transition-colors"
							>Delete</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if bags.length > 0}
		<a
			href="/bags/new"
			class="bg-copper text-paper hover:bg-copper-dk fixed right-6 bottom-6 z-40 grid h-[60px] w-[60px] place-items-center rounded-full shadow-[0_8px_24px_rgba(156,74,31,0.35),0_2px_6px_rgba(0,0,0,0.12)] transition-colors"
			aria-label="New bag"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path
					d="M10 3.5v13M3.5 10h13"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</a>
	{/if}
</div>
