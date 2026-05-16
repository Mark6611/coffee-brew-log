<script lang="ts">
	import { onMount } from 'svelte';
	import type { Brew } from '$lib/db/types';
	import { listBrews } from '$lib/db/repository';
	import { weekStats, formatTimeAgo } from '$lib/brews/compute';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import BrewCard from '$lib/components/BrewCard.svelte';

	let allBrews = $state<Brew[]>([]);
	let loading = $state(true);

	onMount(async () => {
		allBrews = await listBrews();
		loading = false;
	});

	const stats = $derived(weekStats(allBrews));
	const lastBrew = $derived(allBrews[0]);

	const todayEyebrow = (() => {
		const d = new Date();
		const day = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
		const md = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
		return `${day} · ${md}`;
	})();
</script>

<svelte:head>
	<title>Coffee Brew Log</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-10">
	{#if !loading}
		<AppHeader eyebrow={todayEyebrow}>
			Good morning.<br />
			<span class="text-muted italic">
				{#if allBrews.length === 0}Your first brew.{:else}Brew #{allBrews.length + 1}.{/if}
			</span>
		</AppHeader>

		{#if lastBrew}
			<div class="px-[22px]">
				<Eyebrow class="mb-2.5">Last brew · {formatTimeAgo(lastBrew.brewedAt)}</Eyebrow>
				<BrewCard brew={lastBrew} hero />
			</div>
		{/if}

		<div class="px-[22px] pt-[18px]">
			<a
				href="/brews/new"
				class="bg-copper text-paper hover:bg-copper-dk flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-medium transition-colors"
			>
				<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
					<path
						d="M9 3v12M3 9h12"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
				New brew
			</a>
		</div>

		{#if allBrews.length > 0}
			<div class="px-[22px] pt-[18px]">
				<Eyebrow class="mb-2.5">This week</Eyebrow>
				<div class="grid grid-cols-3 gap-2.5">
					<div class="bg-surface border-hairline rounded-2xl border px-3.5 pt-3.5 pb-4">
						<div
							class="text-muted font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
						>BREWS</div>
						<div
							class="font-display text-ink mt-1 text-2xl font-medium tracking-[-0.01em]"
						>{stats.count}</div>
					</div>
					<div class="bg-surface border-hairline rounded-2xl border px-3.5 pt-3.5 pb-4">
						<div
							class="text-muted font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
						>AVG RATIO</div>
						<div
							class="font-display text-ink mt-1 text-2xl font-medium tracking-[-0.01em]"
						>{stats.avgRatio ?? '—'}</div>
					</div>
					<div class="bg-surface border-hairline rounded-2xl border px-3.5 pt-3.5 pb-4">
						<div
							class="text-muted font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
						>FAVORITES</div>
						<div
							class="font-display text-ink mt-1 text-2xl font-medium tracking-[-0.01em]"
						>{stats.favoritesCount}</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="flex gap-5 px-[22px] pt-[18px]">
			<a
				href="/brews"
				class="text-muted hover:text-ink font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors"
			>View all brews →</a>
			<a
				href="/bags"
				class="text-muted hover:text-ink font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors"
			>Bags →</a>
		</div>
	{/if}
</div>
