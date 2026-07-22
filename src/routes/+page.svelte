<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { Brew, Bag } from '$lib/db/types';
	import { listBrews, listBags } from '$lib/db/repository';
	import { weekStats, formatTimeAgo } from '$lib/brews/compute';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import BrewCard from '$lib/components/BrewCard.svelte';
	import Button from '$lib/components/Button.svelte';
	import ListGroup from '$lib/components/ListGroup.svelte';
	import ListRow from '$lib/components/ListRow.svelte';

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
	const activeBagCount = $derived(allBags.filter((b) => !b.archived).length);
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
			<Button size="large" variant="prominent" href={resolve('/brews/new')} full>
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

		<!-- Primary navigation. This was four 11px mono links on one line; as a
		     grouped inset list every destination gets a real 52px touch target and
		     room for the counts, which is what the row was missing. -->
		<div class="px-[22px] pt-[22px]">
			<ListGroup>
				<ListRow
					href={resolve('/brews')}
					title="All brews"
					value={allBrews.length || undefined}
					icon={brewsIcon}
				/>
				<ListRow
					href={resolve('/bags')}
					title="Bags"
					value={activeBagCount || undefined}
					icon={bagsIcon}
				/>
				<ListRow href={resolve('/stats')} title="Stats" icon={statsIcon} />
				<ListRow href={resolve('/settings')} title="Settings" icon={settingsIcon} />
			</ListGroup>
		</div>
	{/if}
</div>

<!-- Row glyphs. 1.5 stroke on an 18px box, matching the icons already in
     BagPicker/PhotoInput so the list doesn't introduce a second icon voice. -->
{#snippet brewsIcon()}
	<svg
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3.5 5.5h9v5a4.5 4.5 0 0 1-9 0v-5z" />
		<path d="M12.5 6.5h1.2a1.8 1.8 0 0 1 0 3.6h-1.2" />
		<path d="M5.5 2.2v1.4M8.5 2v1.6M11.5 2.4v1.2" />
	</svg>
{/snippet}

{#snippet bagsIcon()}
	<svg
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M3.2 5L4.7 3h8.6L14.8 5" />
		<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
		<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
	</svg>
{/snippet}

{#snippet statsIcon()}
	<svg
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M2.5 15.5h13" />
		<path d="M4.8 15.5V9.2M9 15.5V4.5M13.2 15.5v-4" />
	</svg>
{/snippet}

{#snippet settingsIcon()}
	<svg
		width="18"
		height="18"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<!-- Sliders, not a gear: a short-spoked gear at 18px reads as a sun, which
		     is exactly the glyph the theme toggle uses two rows up. -->
		<path d="M2.5 5h4M9.5 5h6M2.5 13h6M11.5 13h4" />
		<circle cx="8" cy="5" r="1.9" />
		<circle cx="10" cy="13" r="1.9" />
	</svg>
{/snippet}
