<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Brew, Bag } from '$lib/db/types';
	import { formatRatio, formatTimeAgo } from '$lib/brews/compute';
	import { freshnessTone, freshnessLabel, freshnessStale } from '$lib/bags/compute';
	import { resolveOrigins } from '$lib/origin/resolve';
	import { stageBrewAgain } from '$lib/brews/repeat';
	import { BLOG_ENABLED } from '$lib/blog/config';
	import Badge from './Badge.svelte';
	import OriginFlags from './OriginFlags.svelte';
	import MarkdownText from './MarkdownText.svelte';
	import LiveDot from './LiveDot.svelte';

	let {
		brew,
		bag,
		hero = false,
		ontogglefavorite
	}: {
		brew: Brew;
		bag?: Bag;
		hero?: boolean;
		ontogglefavorite?: (id: string) => void;
	} = $props();

	const outValue = $derived(
		brew.method === 'espresso' ? `${brew.yieldGrams}g` : `${brew.waterGrams}g`
	);
	const outLabel = $derived(brew.method === 'espresso' ? 'YIELD' : 'WATER');

	const tone = $derived(bag ? freshnessTone(bag.roastedAt) : null);
	const label = $derived(bag ? freshnessLabel(bag.roastedAt) : null);
	const stale = $derived(bag ? freshnessStale(bag.roastedAt) : false);
	const roasterText = $derived(bag?.roaster ?? brew.roaster);
	const originFlags = $derived(bag ? resolveOrigins(bag.origin) : []);

	function openDetail() {
		goto(resolve('/brews/[id]', { id: brew.id }));
	}

	function brewAgain(e: MouseEvent) {
		e.stopPropagation();
		stageBrewAgain(brew);
		goto(resolve('/brews/new'));
	}

	function handleCardKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			openDetail();
		}
	}
</script>

{#snippet metric(label: string, value: string, accent: boolean = false)}
	<div>
		<div
			class="font-mono text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.14em] text-muted uppercase"
		>
			{label}
		</div>
		<div
			class="mt-0.5 font-mono text-[calc(var(--dt-base)*17/17)] font-medium tracking-[-0.01em] {accent
				? 'text-copper'
				: 'text-ink'}"
		>
			{value}
		</div>
	</div>
{/snippet}

<div
	role="button"
	tabindex="0"
	onclick={openDetail}
	onkeydown={handleCardKeydown}
	class="relative cursor-pointer overflow-hidden border border-hairline bg-surface transition duration-[180ms] ease-out hover:border-rule active:scale-[0.985] {hero
		? 'rounded-[22px] p-[22px]'
		: 'rounded-[18px] px-[18px] pt-[16px] pb-[18px]'}"
>
	{#if hero}
		<div
			class="pointer-events-none absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full bg-copper-lt opacity-50"
		></div>
	{/if}
	<div class="relative mb-2.5 flex items-center justify-between">
		<div class="flex items-center gap-1.5">
			<Badge>{brew.method}</Badge>
			{#if ontogglefavorite}
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						ontogglefavorite?.(brew.id);
					}}
					class="press-sm hit-44-sq -m-[7px] grid h-9 w-9 place-items-center rounded-full {brew.isFavorite
						? 'text-copper hover:bg-copper-lt'
						: 'text-muted hover:bg-hairline'}"
					aria-label={brew.isFavorite ? 'Remove favorite' : 'Mark favorite'}
				>
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill={brew.isFavorite ? 'currentColor' : 'none'}
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					>
						<polygon
							points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
						/>
					</svg>
				</button>
			{/if}
			{#if BLOG_ENABLED && brew.published}
				<span
					class="inline-flex h-[22px] items-center gap-1.5 rounded-full bg-copper-lt px-2 font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.12em] text-copper-dk uppercase"
				>
					<LiveDot color="var(--color-copper-dk)" size={4.5} />
					Public
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-1.5">
			<span class="font-mono text-[calc(var(--dt-base)*11/17)] tracking-[0.04em] text-muted">
				{formatTimeAgo(brew.brewedAt)}
			</span>
			<button
				type="button"
				onclick={brewAgain}
				class="press-sm hit-44-sq -m-[7px] grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-copper-lt hover:text-copper"
				aria-label="Brew this again"
				title="Brew again"
			>
				<svg
					width="13"
					height="13"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linejoin="round"
					stroke-linecap="round"
				>
					<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
					<path d="M13.5 2.5V5H11" />
				</svg>
			</button>
		</div>
	</div>

	{#if brew.coffeeName || bag}
		<div
			class="font-display text-[calc(var(--dt-base)*22/17)] leading-[1.15] font-medium tracking-[-0.005em] text-ink"
		>
			{bag?.name ?? brew.coffeeName}
		</div>
		{#if roasterText}
			{#if bag}
				<a
					href={resolve('/bags/[id]', { id: bag.id })}
					onclick={(e) => e.stopPropagation()}
					class="mt-1 inline-flex items-center gap-1 border-b border-copper/35 pb-px text-[calc(var(--dt-base)*13/17)] text-copper-dk transition-colors hover:text-copper"
				>
					<svg
						width="11"
						height="11"
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
					{roasterText}
					{#if originFlags.length}<span class="text-muted">
							· <OriginFlags origin={bag.origin} /></span
						>{/if}
					{#if bag.process}<span class="text-muted"> · {bag.process}</span>{/if}
				</a>
			{:else}
				<div class="mt-0.5 text-[calc(var(--dt-base)*13/17)] text-muted">{roasterText}</div>
			{/if}
		{/if}
	{/if}

	{#if bag && label && tone}
		<div
			class="mt-2 flex items-center gap-1.5 font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.14em] uppercase"
			style="color: {tone}"
		>
			<span
				class="inline-block h-[5px] w-[5px] rounded-full"
				class:freshness-pulse={stale}
				style="background: currentColor"
				aria-hidden="true"
			></span>
			{label}
		</div>
	{/if}

	<div class="mt-[14px] grid grid-cols-3 gap-1 border-t border-hairline pt-[12px]">
		{@render metric('DOSE', `${brew.doseGrams}g`)}
		{@render metric(outLabel, outValue)}
		{@render metric('RATIO', formatRatio(brew), true)}
	</div>

	{#if brew.notes}
		<div
			class="mt-3 border-t border-dashed border-hairline pt-3 font-display text-[calc(var(--dt-base)*14.5/17)] leading-[1.45] text-ink-70 italic"
		>
			<MarkdownText text={brew.notes} />
		</div>
	{/if}

	{#if brew.photo}
		<div class="mt-3 overflow-hidden rounded-[12px] border border-hairline">
			<img src={brew.photo} alt="" class="max-h-[160px] w-full object-cover" />
		</div>
	{/if}
</div>
