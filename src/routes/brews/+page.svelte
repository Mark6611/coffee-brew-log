<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Brew, Bag } from '$lib/db/types';
	import { listBrews, listBags, toggleFavorite } from '$lib/db/repository';
	import { groupBrewsByDay } from '$lib/brews/compute';
	import { fly, slide } from 'svelte/transition';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import DayHeader from '$lib/components/DayHeader.svelte';
	import BrewCard from '$lib/components/BrewCard.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import LiveDot from '$lib/components/LiveDot.svelte';
	import { BLOG_ENABLED } from '$lib/blog/config';

	type Filter = 'all' | 'espresso' | 'pour-over' | 'favorites' | 'published';

	let allBrews = $state<Brew[]>([]);
	let allBags = $state<Bag[]>([]);
	let loading = $state(true);
	let filter = $state<Filter>('all');
	let searchOpen = $state(false);
	let searchInputEl = $state<HTMLInputElement | undefined>();

	async function toggleSearch() {
		searchOpen = !searchOpen;
		if (!searchOpen) return;
		// The input mounts in normal flow near the top of the document, NOT inside the
		// pinned header — so tapping the icon while scrolled down opens a field offscreen.
		// Bring it into view and focus it.
		window.scrollTo({ top: 0, behavior: 'smooth' });
		await tick();
		searchInputEl?.focus();
	}
	let searchQuery = $state('');

	// Stagger the entrance only on the first reveal; after that, search/filter
	// re-renders shouldn't replay a staggered cascade on every keystroke.
	let firstReveal = $state(true);

	async function refresh() {
		[allBrews, allBags] = await Promise.all([listBrews(), listBags()]);
		loading = false;
		if (firstReveal) {
			await tick();
			firstReveal = false;
		}
	}

	function bagFor(brew: Brew): Bag | undefined {
		if (!brew.bagId) return undefined;
		return allBags.find((b) => b.id === brew.bagId);
	}

	onMount(() => {
		const onSynced = () => refresh();
		window.addEventListener('brewlog:synced', onSynced);
		return () => window.removeEventListener('brewlog:synced', onSynced);
	});

	onMount(refresh);

	function matchesSearch(brew: Brew, q: string): boolean {
		if (!q) return true;
		const hay = [brew.coffeeName, brew.roaster, brew.notes].filter(Boolean).join(' ').toLowerCase();
		return hay.includes(q.toLowerCase().trim());
	}

	const publishedCount = $derived(allBrews.filter((b) => b.published).length);

	const filtered = $derived(
		allBrews.filter((b) => {
			if (!matchesSearch(b, searchQuery)) return false;
			if (filter === 'all') return true;
			if (filter === 'favorites') return !!b.isFavorite;
			if (filter === 'published') return !!b.published;
			return b.method === filter;
		})
	);

	const groups = $derived(groupBrewsByDay(filtered));

	async function handleFavorite(id: string) {
		await toggleFavorite(id);
		await refresh();
	}
</script>

<svelte:head>
	<title>Brews</title>
</svelte:head>

<div class="relative mx-auto max-w-2xl pb-24">
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
	<AppHeader eyebrow="ALL TIME · {allBrews.length}">
		Brews
		{#snippet action()}
			<button
				type="button"
				onclick={toggleSearch}
				class="press-sm grid h-[38px] w-[38px] place-items-center rounded-full border border-hairline bg-surface hover:bg-paper"
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

	{#if searchOpen && allBrews.length > 0}
		<div class="px-[22px] pb-3">
			<input
				type="search"
				bind:this={searchInputEl}
				bind:value={searchQuery}
				placeholder="Search coffee, roaster, notes…"
				class="h-12 w-full rounded-[14px] border border-hairline bg-paper px-3.5 text-ink transition outline-none placeholder:text-faint focus:border-copper focus:ring-2 focus:ring-copper/25"
			/>
		</div>
	{/if}

	{#if allBrews.length > 0}
		<div class="flex gap-2 overflow-x-auto px-[22px] pb-3">
			<Chip active={filter === 'all'} onclick={() => (filter = 'all')}>All</Chip>
			<Chip active={filter === 'pour-over'} onclick={() => (filter = 'pour-over')}>Pour-over</Chip>
			<Chip active={filter === 'espresso'} onclick={() => (filter = 'espresso')}>Espresso</Chip>
			<Chip active={filter === 'favorites'} onclick={() => (filter = 'favorites')}>Favorites</Chip>
			{#if BLOG_ENABLED && publishedCount > 0}
				<Chip active={filter === 'published'} onclick={() => (filter = 'published')}>
					<span class="inline-flex items-center gap-1.5">
						<LiveDot color="var(--color-copper)" size={4.5} />
						On the blog · {publishedCount}
					</span>
				</Chip>
			{/if}
		</div>
	{/if}

	<div class="px-[22px]">
		{#if loading}
			<p class="py-8 text-center text-sm text-muted">Loading…</p>
		{:else if allBrews.length === 0}
			<!-- Rich empty state -->
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
					No brews yet.
				</h2>
				<p class="mt-2 mb-7 max-w-[280px] font-display text-[15px] leading-[1.5] text-muted italic">
					Your first cup of the morning is also the start of a record. Log it and we'll watch the
					numbers settle.
				</p>
				<a
					href="/brews/new"
					class="press glass-cta inline-flex h-[52px] items-center gap-2.5 rounded-full bg-copper px-5 text-[15px] font-medium text-paper hover:bg-copper-dk"
				>
					<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path
							d="M9 3v12M3 9h12"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
					Log first brew
				</a>
			</div>
		{:else if filtered.length === 0}
			<p class="py-8 text-center text-sm text-muted">
				{#if searchQuery}No matches for "{searchQuery}".{:else if filter === 'favorites'}No
					favorites yet. Tap the star on a brew to favorite it.{:else if filter === 'published'}No
					brews on the blog yet. Edit a brew and flip Publish to blog.{:else}No
					{filter} brews.{/if}
			</p>
		{:else}
			{#each groups as group (group.dayKey)}
				<DayHeader>{group.dayKey}</DayHeader>
				<div class="mb-5 flex flex-col gap-2.5">
					{#each group.brews as brew, i (brew.id)}
						<div
							in:fly={{ y: 8, duration: 220, delay: firstReveal ? i * 30 : 0 }}
							out:slide={{ duration: 220 }}
						>
							<BrewCard {brew} bag={bagFor(brew)} ontogglefavorite={handleFavorite} />
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>

	<a
		href="/brews/new"
		class="press glass-cta fixed right-6 bottom-6 z-40 grid h-[60px] w-[60px] place-items-center rounded-full bg-copper text-paper hover:bg-copper-dk"
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
