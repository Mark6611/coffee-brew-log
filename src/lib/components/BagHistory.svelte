<script lang="ts">
	// A bag's recent brews on one method, the learned grind and the next move —
	// the reference the brew form opens in a sheet. Display only: everything is
	// worked out in $lib/brews/bagHistory, and nothing here writes to the form.
	import type { BagHistory } from '$lib/brews/bagHistory';
	import { formatTimeAgo } from '$lib/brews/compute';
	import Eyebrow from './Eyebrow.svelte';
	import GrindSweetSpot from './GrindSweetSpot.svelte';
	import { extractionTone } from './tones';

	let { history }: { history: BagHistory } = $props();

	const espresso = $derived(history.method === 'espresso');
	const noun = $derived(espresso ? 'shot' : 'brew');
	const next = $derived(history.next);
</script>

<div class="space-y-4">
	<section>
		<div class="mb-2 flex items-baseline justify-between gap-3">
			<Eyebrow>
				{#if history.rows.length === 0}
					Recent {noun}s
				{:else if history.rows.length === 1}
					Last {noun}
				{:else}
					Last {history.rows.length} {noun}s
				{/if}
			</Eyebrow>
			{#if history.total > history.rows.length}
				<span class="font-mono text-eyebrow tracking-[0.12em] text-muted uppercase"
					>of {history.total}</span
				>
			{/if}
		</div>

		{#if history.rows.length === 0}
			<p
				class="rounded-card border border-hairline bg-paper px-4 py-4 font-display text-[calc(var(--dt-base)*14/17)] leading-[1.45] text-muted italic"
			>
				{espresso ? 'No espresso shots' : 'No pour-overs'} on this bag yet. They will line up here as
				you log them.
			</p>
		{:else}
			<ol class="divide-y divide-hairline overflow-hidden rounded-card border border-hairline">
				{#each history.rows as r (r.id)}
					<li class="bg-paper px-4 py-3">
						<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
							<span
								class="font-mono text-[calc(var(--dt-base)*17/17)] font-medium tracking-[-0.01em] text-ink"
								>{r.grind}</span
							>
							<span class="font-mono text-[calc(var(--dt-base)*13/17)] text-ink">
								{r.doseG}g <span class="text-muted">→</span>
								{r.outG}g <span class="text-muted">·</span>
								{r.time}
							</span>
						</div>
						<div class="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
							<span
								class="font-mono text-eyebrow font-medium tracking-[0.12em] text-muted uppercase"
								>{noun} {r.n} · {formatTimeAgo(r.brewedAt)}</span
							>
							<span class="flex items-center gap-2 text-[calc(var(--dt-base)*12/17)] text-ink-70">
								{#if r.taste}
									<span class="flex items-center gap-1.5">
										{#if espresso}
											<span
												class="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
												style="background: {extractionTone(r.extraction)}"
												aria-hidden="true"
											></span>
										{/if}
										{r.taste}
									</span>
								{/if}
								{#if r.rating != null}
									<span class="font-mono text-ink" aria-label="Rated {r.rating.toFixed(1)} of 5"
										>{r.rating.toFixed(1)}</span
									>
								{/if}
							</span>
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	{#if history.calibration}
		<GrindSweetSpot calibration={history.calibration} />
	{/if}

	{#if next?.kind === 'dialed'}
		{@const r = next.recipe}
		<section class="rounded-card border border-success/25 bg-success/[0.06] p-4">
			<span
				class="font-mono text-eyebrow font-medium tracking-[0.14em] uppercase"
				style="color: var(--color-success)">Settled recipe</span
			>
			<div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span
					class="font-mono text-[calc(var(--dt-base)*24/17)] font-medium tracking-[-0.01em]"
					style="color: var(--color-success)">{r.grind}</span
				>
				<span
					class="font-mono text-[calc(var(--dt-base)*11.5/17)] tracking-[0.04em] text-muted uppercase"
				>
					Dose {r.doseG}g · Yield {r.yieldG}g · Time ~{r.timeS}s{r.tempC != null
						? ` · Temp ${r.tempC}°C`
						: ''}
				</span>
			</div>
		</section>
	{:else if next?.kind === 'compass'}
		{@const c = next.compass}
		{@const a = c.action}
		<section class="rounded-card border border-copper/25 bg-copper-lt px-4 py-4">
			<div class="flex items-center justify-between gap-3">
				<span class="font-mono text-eyebrow font-medium tracking-[0.14em] text-copper-dk uppercase"
					>Next shot</span
				>
				{#if !c.fromTaste}
					<span class="font-mono text-eyebrow tracking-[0.12em] text-muted uppercase"
						>from the numbers</span
					>
				{/if}
			</div>
			<div
				class="mt-2 font-display text-[calc(var(--dt-base)*16/17)] leading-[1.25] font-medium text-ink"
			>
				{c.headline}{#if a.kind === 'grind' && a.target}
					<span class="text-copper">&nbsp;→ {a.target}</span>
				{:else if a.kind === 'yield'}
					<span class="text-copper">&nbsp;→ {a.targetG}g</span>
				{/if}
			</div>
			<p class="mt-1 text-[calc(var(--dt-base)*12.5/17)] leading-[1.45] text-ink-70">{c.prose}</p>
		</section>
	{:else if next?.kind === 'start'}
		{@const s = next.suggestion}
		<section class="rounded-card border border-copper/25 bg-copper-lt px-4 py-4">
			<span class="font-mono text-eyebrow font-medium tracking-[0.14em] text-copper-dk uppercase">
				{s.kind === 'history'
					? `From your history · ${s.brews} brew${s.brews === 1 ? '' : 's'}`
					: 'Starting point'}
			</span>
			<div class="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span
					class="font-mono text-[calc(var(--dt-base)*22/17)] font-semibold tracking-[-0.01em] text-copper"
					>{s.value}</span
				>
				<span class="text-[calc(var(--dt-base)*12/17)] text-muted">on the {s.grinder}</span>
			</div>
		</section>
	{/if}
</div>
