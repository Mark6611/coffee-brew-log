<script lang="ts">
	import type { Brew } from '$lib/db/types';
	import { formatRatio, formatBrewTime, formatTimeAgo } from '$lib/brews/compute';
	import Badge from './Badge.svelte';

	let {
		brew,
		hero = false,
		ondelete,
		ontogglefavorite
	}: {
		brew: Brew;
		hero?: boolean;
		ondelete?: (id: string) => void;
		ontogglefavorite?: (id: string) => void;
	} = $props();

	const outValue = $derived(
		brew.method === 'espresso' ? `${brew.yieldGrams}g` : `${brew.waterGrams}g`
	);
	const outLabel = $derived(brew.method === 'espresso' ? 'YIELD' : 'WATER');
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
	class="bg-surface border-hairline relative overflow-hidden border {hero
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
					onclick={() => ontogglefavorite?.(brew.id)}
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
		</div>
		<span class="text-muted font-mono text-[11px] tracking-[0.04em]">
			{formatTimeAgo(brew.brewedAt)}
		</span>
	</div>

	{#if brew.coffeeName}
		<div class="font-display text-ink text-[22px] font-medium leading-[1.15] tracking-[-0.005em]">
			{brew.coffeeName}
		</div>
		{#if brew.roaster}
			<div class="text-muted mt-0.5 text-[13px]">{brew.roaster}</div>
		{/if}
	{/if}

	<div class="border-hairline mt-[14px] grid grid-cols-4 gap-1 border-t pt-[12px]">
		{@render metric('DOSE', `${brew.doseGrams}g`)}
		{@render metric(outLabel, outValue)}
		{@render metric('TIME', formatBrewTime(brew))}
		{@render metric('RATIO', formatRatio(brew), true)}
	</div>

	{#if brew.notes}
		<div
			class="border-hairline font-display text-ink-70 mt-3 border-t border-dashed pt-3 text-[14.5px] leading-[1.45] italic"
		>{brew.notes}</div>
	{/if}

	{#if ondelete}
		<div class="mt-3 flex justify-end">
			<button
				type="button"
				onclick={() => ondelete?.(brew.id)}
				class="text-faint hover:text-danger text-[12px] transition-colors"
			>Delete</button>
		</div>
	{/if}
</div>
