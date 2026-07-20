<script lang="ts">
	import { onMount } from 'svelte';
	import type { Brew, Bag } from '$lib/db/types';
	import { listBrews, listBags } from '$lib/db/repository';
	import { weekStats, formatTimeAgo } from '$lib/brews/compute';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import BrewCard from '$lib/components/BrewCard.svelte';
	import Button from '$lib/components/Button.svelte';

	let allBrews = $state<Brew[]>([]);
	let allBags = $state<Bag[]>([]);
	let loading = $state(true);
	let loadError = $state(false);

	async function load() {
		try {
			loadError = false;
			[allBrews, allBags] = await Promise.all([listBrews(), listBags()]);
		} catch (e) {
			console.error('Home load failed:', e);
			loadError = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
		const onSynced = () => load();
		window.addEventListener('brewlog:synced', onSynced);
		return () => window.removeEventListener('brewlog:synced', onSynced);
	});

	const stats = $derived(weekStats(allBrews));
	const lastBrew = $derived(allBrews[0]);
	const lastBrewBag = $derived(
		lastBrew?.bagId ? allBags.find((b) => b.id === lastBrew.bagId) : undefined
	);

	const todayEyebrow = (() => {
		const d = new Date();
		const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
		const md = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
		return `${day} · ${md}`;
	})();

	const greeting = (() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning.';
		if (h < 18) return 'Good afternoon.';
		return 'Good evening.';
	})();
</script>

<svelte:head>
	<title>Coffee Brew Log</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-10">
	{#if loading}
		<div class="px-[22px] pt-16 text-center">
			<p class="text-sm text-muted">Loading…</p>
		</div>
	{:else if loadError}
		<div class="px-[22px] pt-16 text-center">
			<p class="font-display text-[20px] font-medium text-ink">Couldn't load your brews.</p>
			<p class="mt-2 text-[14px] text-muted">
				Something went wrong reading your data on this device.
			</p>
			<Button size="medium" variant="prominent" onclick={load} class="mt-5">Try again</Button>
		</div>
	{:else}
		<AppHeader eyebrow={todayEyebrow}>
			{greeting}<br />
			<span class="text-muted italic">
				{#if allBrews.length === 0}Your first brew.{:else}Brew #{allBrews.length + 1}.{/if}
			</span>
		</AppHeader>

		{#if lastBrew}
			<div class="px-[22px]">
				<Eyebrow class="mb-2.5">Last brew · {formatTimeAgo(lastBrew.brewedAt)}</Eyebrow>
				<BrewCard brew={lastBrew} bag={lastBrewBag} hero />
			</div>
		{/if}

		<div class="px-[22px] pt-[18px]">
			<Button size="large" variant="prominent" href="/brews/new" full>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<path
						d="M9 3v12M3 9h12"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
				New brew
			</Button>
		</div>

		{#if allBrews.length > 0}
			<div class="px-[22px] pt-[18px]">
				<Eyebrow class="mb-2.5">This week</Eyebrow>
				<div class="grid grid-cols-3 gap-2.5">
					<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
						<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
							BREWS
						</div>
						<div class="mt-1 font-display text-2xl font-medium tracking-[-0.01em] text-ink">
							{stats.count}
						</div>
					</div>
					<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
						<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
							AVG RATIO
						</div>
						<div class="mt-1 font-display text-2xl font-medium tracking-[-0.01em] text-ink">
							{stats.avgRatio ?? '—'}
						</div>
					</div>
					<div class="rounded-2xl border border-hairline bg-surface px-3.5 pt-3.5 pb-4">
						<div class="font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
							FAVORITES
						</div>
						<div class="mt-1 font-display text-2xl font-medium tracking-[-0.01em] text-ink">
							{stats.favoritesCount}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex gap-5 px-[22px] pt-[18px]">
			<a
				href="/brews"
				class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
				>View all brews →</a
			>
			<a
				href="/bags"
				class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
				>Bags →</a
			>
			<a
				href="/stats"
				class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
				>Stats →</a
			>
			<a
				href="/settings"
				class="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase transition-colors hover:text-ink"
				>Settings →</a
			>
		</div>
	{/if}
</div>
