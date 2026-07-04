<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Brew, Bag } from '$lib/db/types';
	import { formatRatio, formatTimeAgo } from '$lib/brews/compute';
	import { freshnessTone, freshnessLabel, freshnessStale } from '$lib/bags/compute';
	import { resolveOrigin } from '$lib/origin/resolve';
	import { stageBrewAgain } from '$lib/brews/repeat';
	import Badge from './Badge.svelte';
	import OriginFlag from './OriginFlag.svelte';
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
	const resolvedOrigin = $derived(bag ? resolveOrigin(bag.origin) : null);

	function openDetail() {
		goto(`/brews/${brew.id}`);
	}

	function brewAgain(e: MouseEvent) {
		e.stopPropagation();
		goto(stageBrewAgain(brew));
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
		<div class="text-muted font-mono text-[9.5px] font-medium uppercase tracking-[0.14em]">
			{label}
		</div>
		<div
			class="mt-0.5 font-mono text-[17px] font-medium tracking-[-0.01em] {accent
				? 'text-copper'
				: 'text-ink'}"
		>{value}</div>
	</div>
{/snippet}

<div
	role="button"
	tabindex="0"
	onclick={openDetail}
	onkeydown={handleCardKeydown}
	class="bg-surface border-hairline hover:border-rule relative cursor-pointer overflow-hidden border transition duration-[180ms] ease-out active:scale-[0.985] {hero
		? 'rounded-[22px] p-[22px]'
		: 'rounded-[18px] px-[18px] pt-[16px] pb-[18px]'}"
>
	{#if hero}
		<div
			class="bg-copper-lt pointer-events-none absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full opacity-50"
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
					class="grid h-[22px] w-[22px] place-items-center rounded-full transition-colors {brew.isFavorite
						? 'text-copper hover:bg-copper-lt'
						: 'text-faint hover:bg-hairline'}"
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
			{#if brew.published}
				<span
					class="bg-copper-lt text-copper-dk inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase"
				>
					<LiveDot color="var(--color-copper-dk)" size={4.5} />
					Public
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-muted font-mono text-[11px] tracking-[0.04em]">
				{formatTimeAgo(brew.brewedAt)}
			</span>
			<button
				type="button"
				onclick={brewAgain}
				class="text-faint hover:text-copper hover:bg-copper-lt grid h-[22px] w-[22px] place-items-center rounded-full transition-colors"
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
		<div class="font-display text-ink text-[22px] font-medium leading-[1.15] tracking-[-0.005em]">
			{bag?.name ?? brew.coffeeName}
		</div>
		{#if roasterText}
			{#if bag}
				<a
					href="/bags/{bag.id}"
					onclick={(e) => e.stopPropagation()}
					class="text-copper-dk hover:text-copper mt-1 inline-flex items-center gap-1 text-[13px] transition-colors"
					style="border-bottom: 1px solid rgba(156,74,31,0.35); padding-bottom: 1px;"
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
					{#if resolvedOrigin}<span class="text-muted"> · <OriginFlag code={resolvedOrigin.code} country={resolvedOrigin.country} /></span>{/if}
					{#if bag.process}<span class="text-muted"> · {bag.process}</span>{/if}
				</a>
			{:else}
				<div class="text-muted mt-0.5 text-[13px]">{roasterText}</div>
			{/if}
		{/if}
	{/if}

	{#if bag && label && tone}
		<div
			class="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
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

	<div class="border-hairline mt-[14px] grid grid-cols-3 gap-1 border-t pt-[12px]">
		{@render metric('DOSE', `${brew.doseGrams}g`)}
		{@render metric(outLabel, outValue)}
		{@render metric('RATIO', formatRatio(brew), true)}
	</div>

	{#if brew.notes}
		<div
			class="border-hairline font-display text-ink-70 mt-3 border-t border-dashed pt-3 text-[14.5px] leading-[1.45] italic"
		>
			<MarkdownText text={brew.notes} />
		</div>
	{/if}

	{#if brew.photo}
		<div class="border-hairline mt-3 overflow-hidden rounded-[12px] border">
			<img src={brew.photo} alt="" class="max-h-[160px] w-full object-cover" />
		</div>
	{/if}
</div>
