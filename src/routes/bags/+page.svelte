<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import type { Bag, Brew } from '$lib/db/types';
	import { listBags, listBrews, deleteBag } from '$lib/db/repository';
	import { bagConsumption, formatRoastedAt } from '$lib/bags/compute';
	import { fly, slide } from 'svelte/transition';
	import { resolveOrigin } from '$lib/origin/resolve';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Button from '$lib/components/Button.svelte';
	import OriginFlag from '$lib/components/OriginFlag.svelte';
	import DialedBadge from '$lib/components/DialedBadge.svelte';

	let bags = $state<Bag[]>([]);
	let brews = $state<Brew[]>([]);
	let loading = $state(true);

	const showArchived = $derived(page.url.searchParams.get('show') === 'archived');
	const visibleBags = $derived(bags.filter((b) => !!b.archived === showArchived));
	const archivedCount = $derived(bags.filter((b) => b.archived).length);
	const activeCount = $derived(bags.length - archivedCount);

	// Stagger only the first reveal; toggling archived view shouldn't replay it.
	let firstReveal = $state(true);

	async function refresh() {
		[bags, brews] = await Promise.all([listBags(), listBrews()]);
		loading = false;
		if (firstReveal) {
			await tick();
			firstReveal = false;
		}
	}

	onMount(() => {
		refresh();
		const onSynced = () => refresh();
		window.addEventListener('brewlog:synced', onSynced);
		return () => window.removeEventListener('brewlog:synced', onSynced);
	});

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
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[2px]">
		<a
			href="/"
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
	</div>
	<AppHeader eyebrow={showArchived ? `ARCHIVED · ${archivedCount}` : `ACTIVE · ${activeCount}`}>
		Bags
	</AppHeader>

	{#if archivedCount > 0 || showArchived}
		<div class="px-[22px] pb-3">
			{#if showArchived}
				<a
					href="/bags"
					class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
					>← Active</a
				>
			{:else}
				<a
					href="/bags?show=archived"
					class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
					>Show archived ({archivedCount}) →</a
				>
			{/if}
		</div>
	{/if}

	<div class="px-[22px]">
		{#if loading}
			<p class="py-8 text-center text-sm text-muted">Loading…</p>
		{:else if visibleBags.length === 0 && !bags.length}
			<div class="flex flex-col items-center px-6 pt-12 pb-20 text-center">
				<div class="mb-6 grid h-24 w-24 place-items-center rounded-full bg-copper-lt text-copper">
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
					class="m-0 font-display text-[26px] leading-[1.15] font-medium tracking-[-0.01em] text-ink"
				>
					No bags yet.
				</h2>
				<p class="mt-2 mb-7 max-w-[280px] font-display text-[15px] leading-[1.5] text-muted italic">
					Add a bag once and reach for it across all the brews you make from it.
				</p>
				<Button size="large" variant="prominent" href="/bags/new">
					<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path
							d="M9 3v12M3 9h12"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
					Add first bag
				</Button>
			</div>
		{:else if visibleBags.length === 0}
			<p class="py-12 text-center text-sm text-muted">
				{showArchived ? 'No archived bags.' : 'All bags are archived.'}
			</p>
		{:else}
			<div class="flex flex-col gap-2.5">
				{#each visibleBags as bag, i (bag.id)}
					{@const c = bagConsumption(bag, brews)}
					<div
						in:fly={{ y: 8, duration: 220, delay: firstReveal ? i * 30 : 0 }}
						out:slide={{ duration: 220 }}
						class="rounded-[18px] border border-hairline bg-surface px-[18px] pt-[16px] pb-[18px] transition-transform duration-[180ms] ease-out has-[a:active]:scale-[0.985]"
					>
						<a
							href="/bags/{bag.id}"
							class="-m-2 mb-2 flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-paper/40"
						>
							{#if bag.photo}
								<img
									src={bag.photo}
									alt=""
									class="h-[46px] w-[46px] shrink-0 rounded-[11px] border border-hairline object-cover"
								/>
							{/if}
							<div class="min-w-0 flex-1">
								<div
									class="flex flex-wrap items-center gap-2 font-display text-[22px] leading-[1.15] font-medium tracking-[-0.005em] text-ink"
								>
									{bag.name}
									{#if bag.dialedRecipe}<DialedBadge />{/if}
								</div>
								{#if bag.roaster}
									<div class="mt-0.5 text-[13px] text-muted">{bag.roaster}</div>
								{/if}
							</div>
							{#if bag.process}
								<Badge>{bag.process}</Badge>
							{/if}
						</a>

						<div class="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
							{#if bag.origin}
								{@const r = resolveOrigin(bag.origin)}
								<span>
									{#if r}<OriginFlag code={r.code} country={r.country} />{/if}{bag.origin}
								</span>
							{/if}
							{#if bag.roastedAt}
								<span class="font-mono">{formatRoastedAt(bag.roastedAt)}</span>
							{/if}
						</div>

						{#if bag.weightGrams != null}
							<div class="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
								<div>
									<div
										class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
									>
										USED
									</div>
									<div class="mt-0.5 font-mono text-[15px] font-medium text-ink">
										{c.used.toFixed(1)}g
									</div>
								</div>
								<div>
									<div
										class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
									>
										REMAINING
									</div>
									<div class="mt-0.5 font-mono text-[15px] font-medium text-copper">
										{c.remaining != null ? Math.max(0, c.remaining).toFixed(1) + 'g' : '—'}
									</div>
								</div>
								<div>
									<div
										class="font-mono text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase"
									>
										BREWS
									</div>
									<div class="mt-0.5 font-mono text-[15px] font-medium text-ink">
										{c.brewCount}
									</div>
								</div>
							</div>
							{#if c.percentUsed != null}
								<div class="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
									<div
										class="h-full bg-copper transition-all"
										style="width: {Math.min(100, c.percentUsed)}%"
									></div>
								</div>
							{/if}
						{:else if c.brewCount > 0}
							<div class="mt-3 border-t border-hairline pt-3">
								<div class="text-[13px] text-muted">
									{c.brewCount} brew{c.brewCount === 1 ? '' : 's'}
									{#if c.used > 0}· {c.used.toFixed(1)}g used{/if}
								</div>
							</div>
						{/if}

						<div class="mt-3 flex items-center justify-end gap-4">
							<Button size="regular" variant="plain" href="/bags/{bag.id}/edit">Edit</Button>
							<Button size="regular" variant="destructive" onclick={() => handleDelete(bag)}>
								Delete
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if bags.length > 0}
		<Button
			size="large"
			iconOnly
			variant="prominent"
			href="/bags/new"
			label="New bag"
			class="fixed right-6 z-40 h-[60px] w-[60px]"
			style="bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px))"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
				<path
					d="M10 3.5v13M3.5 10h13"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</Button>
	{/if}
</div>
