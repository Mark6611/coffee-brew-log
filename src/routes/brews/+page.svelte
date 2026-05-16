<script lang="ts">
	import { onMount } from 'svelte';
	import type { Brew } from '$lib/db/types';
	import { listBrews, deleteBrew, toggleFavorite } from '$lib/db/repository';
	import { groupBrewsByDay } from '$lib/brews/compute';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import DayHeader from '$lib/components/DayHeader.svelte';
	import BrewCard from '$lib/components/BrewCard.svelte';
	import Chip from '$lib/components/Chip.svelte';

	type Filter = 'all' | 'espresso' | 'pour-over' | 'favorites';

	let allBrews = $state<Brew[]>([]);
	let loading = $state(true);
	let filter = $state<Filter>('all');
	let searchOpen = $state(false);
	let searchQuery = $state('');

	async function refresh() {
		allBrews = await listBrews();
		loading = false;
	}

	onMount(refresh);

	function matchesSearch(brew: Brew, q: string): boolean {
		if (!q) return true;
		const hay = [brew.coffeeName, brew.roaster, brew.notes]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return hay.includes(q.toLowerCase().trim());
	}

	const filtered = $derived(
		allBrews.filter((b) => {
			if (!matchesSearch(b, searchQuery)) return false;
			if (filter === 'all') return true;
			if (filter === 'favorites') return !!b.isFavorite;
			return b.method === filter;
		})
	);

	const groups = $derived(groupBrewsByDay(filtered));

	async function handleDelete(id: string) {
		if (!confirm('Delete this brew?')) return;
		await deleteBrew(id);
		await refresh();
	}

	async function handleFavorite(id: string) {
		await toggleFavorite(id);
		await refresh();
	}
</script>

<svelte:head>
	<title>Brews</title>
</svelte:head>

<div class="relative mx-auto max-w-2xl pb-24">
	<AppHeader eyebrow="ALL TIME · {allBrews.length}">
		Brews
		{#snippet action()}
			<button
				type="button"
				onclick={() => (searchOpen = !searchOpen)}
				class="bg-surface border-hairline hover:bg-paper grid h-[38px] w-[38px] place-items-center rounded-full border transition-colors"
				aria-label={searchOpen ? 'Close search' : 'Open search'}
			>
				{#if searchOpen}
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				{:else}
					<svg width="15" height="15" viewBox="0 0 17 17" fill="none">
						<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.6" />
						<path
							d="M11.2 11.2L15 15"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
						/>
					</svg>
				{/if}
			</button>
		{/snippet}
	</AppHeader>

	{#if searchOpen}
		<div class="px-[22px] pb-3">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search coffee, roaster, notes…"
				class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
			/>
		</div>
	{/if}

	<div class="flex gap-2 overflow-x-auto px-[22px] pb-3">
		<Chip active={filter === 'all'} onclick={() => (filter = 'all')}>All</Chip>
		<Chip active={filter === 'pour-over'} onclick={() => (filter = 'pour-over')}>Pour-over</Chip>
		<Chip active={filter === 'espresso'} onclick={() => (filter = 'espresso')}>Espresso</Chip>
		<Chip active={filter === 'favorites'} onclick={() => (filter = 'favorites')}>Favorites</Chip>
	</div>

	<div class="px-[22px]">
		{#if loading}
			<p class="text-muted py-8 text-center text-sm">Loading…</p>
		{:else if filtered.length === 0}
			<p class="text-muted py-8 text-center text-sm">
				{#if searchQuery}No matches for "{searchQuery}".{:else if filter === 'favorites'}No
					favorites yet. Tap the star on a brew to favorite it.{:else}No brews. <a
						href="/brews/new"
						class="text-copper underline">Log your first</a
					>.{/if}
			</p>
		{:else}
			{#each groups as group (group.dayKey)}
				<DayHeader>{group.dayKey}</DayHeader>
				<div class="mb-5 flex flex-col gap-2.5">
					{#each group.brews as brew (brew.id)}
						<BrewCard {brew} ondelete={handleDelete} ontogglefavorite={handleFavorite} />
					{/each}
				</div>
			{/each}
		{/if}
	</div>

	<a
		href="/brews/new"
		class="bg-copper text-paper hover:bg-copper-dk fixed right-6 bottom-6 z-40 grid h-[60px] w-[60px] place-items-center rounded-full shadow-[0_8px_24px_rgba(156,74,31,0.35),0_2px_6px_rgba(0,0,0,0.12)] transition-colors"
		aria-label="New brew"
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
</div>
