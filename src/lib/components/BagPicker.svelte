<script lang="ts">
	import { onMount } from 'svelte';
	import type { Bag, Brew } from '$lib/db/types';
	import { listBags, listBrews } from '$lib/db/repository';
	import {
		bagConsumption,
		daysSinceRoast,
		freshnessTone,
		freshnessLabel
	} from '$lib/bags/compute';
	import ProcessBadge from './ProcessBadge.svelte';

	let {
		bagId = $bindable<string | undefined>(undefined),
		onselect,
		oncreatenew
	}: {
		bagId?: string;
		onselect?: (bag: Bag | null) => void;
		oncreatenew?: (queryName: string) => void;
	} = $props();

	let allBags = $state<Bag[]>([]);
	let allBrews = $state<Brew[]>([]);
	let query = $state('');
	let isOpen = $state(false);
	let highlightedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	onMount(async () => {
		[allBags, allBrews] = await Promise.all([listBags(), listBrews()]);
	});

	const selectedBag = $derived(allBags.find((b) => b.id === bagId));

	const activeBags = $derived(allBags.filter((b) => !b.archived));

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return activeBags.slice(0, 3);
		return activeBags.filter(
			(b) =>
				b.name.toLowerCase().includes(q) || (b.roaster?.toLowerCase().includes(q) ?? false)
		);
	});

	const hasQuery = $derived(query.length > 0);
	const showCreateNew = $derived(hasQuery);
	const totalRows = $derived(filtered.length + (showCreateNew ? 1 : 0));

	function selectBag(bag: Bag) {
		bagId = bag.id;
		onselect?.(bag);
		query = '';
		isOpen = false;
		inputEl?.blur();
	}

	function clearSelection() {
		bagId = undefined;
		onselect?.(null);
		query = '';
		setTimeout(() => inputEl?.focus(), 0);
	}

	function createNew() {
		oncreatenew?.(query.trim());
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && !query && selectedBag) {
			e.preventDefault();
			clearSelection();
			return;
		}
		if (!isOpen) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (totalRows === 0) return;
			highlightedIndex = (highlightedIndex + 1) % totalRows;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (totalRows === 0) return;
			highlightedIndex = (highlightedIndex - 1 + totalRows) % totalRows;
		} else if (e.key === 'Enter') {
			if (totalRows === 0) return;
			e.preventDefault();
			if (highlightedIndex < filtered.length) {
				selectBag(filtered[highlightedIndex]);
			} else if (showCreateNew) {
				createNew();
			}
		} else if (e.key === 'Escape') {
			isOpen = false;
		}
	}
</script>

{#if selectedBag}
	<!-- Selected (chip) -->
	<div
		class="bg-copper-lt flex h-14 items-center gap-3 rounded-[14px] border border-transparent px-3"
	>
		<div class="bg-copper text-paper grid h-8 w-8 shrink-0 place-items-center rounded-[9px]">
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
			<div
				class="font-display text-ink truncate text-[17px] font-medium leading-[1.2]"
			>{selectedBag.name}</div>
			<div class="text-copper-dk truncate text-[12px]">
				{#if selectedBag.roaster}{selectedBag.roaster}{/if}
				{#if selectedBag.roaster && (selectedBag.process || selectedBag.roastedAt)} · {/if}
				{#if selectedBag.process}{selectedBag.process}{/if}
				{#if selectedBag.process && selectedBag.roastedAt} · {/if}
				{#if selectedBag.roastedAt}{freshnessLabel(selectedBag.roastedAt)?.toLowerCase()}{/if}
			</div>
		</div>
		<button
			type="button"
			onclick={clearSelection}
			class="bg-ink/[0.06] hover:bg-ink/[0.10] text-ink grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors"
			aria-label="Clear selection"
		>
			<svg
				width="12"
				height="12"
				viewBox="0 0 12 12"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
			>
				<line x1="3" y1="3" x2="9" y2="9" />
				<line x1="3" y1="9" x2="9" y2="3" />
			</svg>
		</button>
	</div>
{:else}
	<div class="relative">
		<!-- Idle / typing -->
		<div
			class="bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-2 rounded-[14px] border px-3 transition focus-within:ring-2"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 18 18"
				fill="none"
				stroke="currentColor"
				stroke-width="1.4"
				stroke-linejoin="round"
				stroke-linecap="round"
				class={isOpen || hasQuery ? 'text-copper' : 'text-faint'}
			>
				<path d="M3.2 5L4.7 3h8.6L14.8 5" />
				<path d="M3.2 5h11.6v9.2c0 1.2-1 2.1-2.1 2.1H5.3c-1.2 0-2.1-1-2.1-2.1V5z" />
				<rect x="6.7" y="9" width="4.6" height="3.4" rx="0.4" />
			</svg>
			<input
				bind:this={inputEl}
				bind:value={query}
				onfocus={() => (isOpen = true)}
				onblur={() => setTimeout(() => (isOpen = false), 150)}
				onkeydown={handleKeydown}
				placeholder="Search or add a coffee…"
				class="text-ink placeholder:text-faint min-w-0 flex-1 bg-transparent outline-none"
				role="combobox"
				aria-expanded={isOpen}
				aria-controls="bag-listbox"
				aria-autocomplete="list"
			/>
			{#if hasQuery}
				<span
					class="text-muted font-mono text-[10px] font-medium tracking-[0.14em] uppercase"
				>{filtered.length} match{filtered.length === 1 ? '' : 'es'}</span>
			{:else}
				<svg
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-muted"
				>
					<path d="M3 4.5l3 3 3-3" />
				</svg>
			{/if}
		</div>

		{#if isOpen}
			<div
				id="bag-listbox"
				class="bg-surface border-hairline absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-hidden rounded-2xl border shadow-[0_12px_32px_rgba(28,24,20,0.10)]"
				role="listbox"
			>
				{#if filtered.length > 0}
					<div
						class="text-muted px-4 pt-3 pb-1 font-mono text-[10px] font-medium tracking-[0.14em] uppercase"
					>
						{hasQuery ? `${filtered.length} match${filtered.length === 1 ? '' : 'es'}` : 'Recent bags'}
					</div>
				{/if}

				<div class="max-h-64 overflow-y-auto">
					{#each filtered as bag, i (bag.id)}
						{@const c = bagConsumption(bag, allBrews)}
						{@const days = daysSinceRoast(bag.roastedAt)}
						{@const tone = freshnessTone(bag.roastedAt)}
						<button
							type="button"
							onmousedown={(e) => {
								e.preventDefault();
								selectBag(bag);
							}}
							onmouseenter={() => (highlightedIndex = i)}
							class="block w-full px-4 py-2.5 text-left transition-colors {highlightedIndex === i
								? 'bg-paper'
								: 'hover:bg-paper/60'} {c.remaining != null && c.remaining <= 0
								? 'opacity-50'
								: ''}"
							role="option"
							aria-selected={highlightedIndex === i}
						>
							<div class="flex items-center gap-3">
								<div
									class="bg-paper border-hairline text-muted grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border"
								>
									<svg
										width="14"
										height="14"
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
									<div class="flex items-center justify-between gap-2">
										<div
											class="font-display text-ink truncate text-[16px] font-medium leading-[1.2]"
										>{bag.name}</div>
										{#if days != null}
											<span
												class="shrink-0 font-mono text-[12px] font-medium"
												style="color: {tone}"
											>{days}d</span>
										{/if}
									</div>
									<div class="mt-0.5 flex items-center justify-between gap-2">
										<div class="text-muted flex min-w-0 items-center gap-1.5 text-[12.5px]">
											{#if bag.roaster}
												<span class="truncate">{bag.roaster}</span>
											{/if}
											{#if bag.roaster && bag.process}
												<span>·</span>
											{/if}
											{#if bag.process}
												<ProcessBadge process={bag.process} />
											{/if}
										</div>
										{#if bag.weightGrams}
											<span class="text-muted shrink-0 font-mono text-[12px]">
												{c.remaining != null ? `${Math.max(0, c.remaining).toFixed(0)}g` : `${bag.weightGrams}g`}
											</span>
										{/if}
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>

				{#if showCreateNew}
					<button
						type="button"
						onmousedown={(e) => {
							e.preventDefault();
							createNew();
						}}
						onmouseenter={() => (highlightedIndex = filtered.length)}
						class="border-hairline block w-full border-t px-4 py-3 text-left transition-colors {highlightedIndex ===
						filtered.length
							? 'bg-paper'
							: 'hover:bg-paper/60'}"
						role="option"
						aria-selected={highlightedIndex === filtered.length}
					>
						<div class="flex items-center gap-3">
							<div
								class="bg-copper text-paper grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
								>
									<path d="M7 2v10M2 7h10" />
								</svg>
							</div>
							<div class="min-w-0 flex-1">
								<div class="text-copper text-[14px] font-medium">Create new bag</div>
								<div class="text-muted mt-0.5 truncate text-[12px]">"{query}"</div>
							</div>
						</div>
					</button>
				{/if}

				<div
					class="text-muted bg-paper/50 border-hairline border-t px-4 py-2 font-mono text-[10px] font-medium tracking-[0.1em] uppercase"
				>
					↑↓ navigate · ↵ select · esc close
				</div>
			</div>
		{/if}
	</div>
{/if}
