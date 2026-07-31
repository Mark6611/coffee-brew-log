<script lang="ts">
	import type { Compass } from '$lib/brews/compass';
	import type { Snippet } from 'svelte';

	// The Brew Compass verdict card — one component, three surfaces (shot
	// detail, new-brew LAST SHOT card, bag page). Pure display: metrics row,
	// under↔over rail, headline + one action, prose, optional aside. Footer
	// buttons come from the caller (they differ per surface).
	let {
		compass,
		eyebrow = 'BREW COMPASS',
		footer
	}: {
		compass: Compass;
		eyebrow?: string;
		footer?: Snippet;
	} = $props();

	const c = $derived(compass);
	const isHold = $derived(c.action.kind === 'hold');
	const isDiagnose = $derived(c.action.kind === 'diagnose');
	// Dot position: −1…1 → 6%…94% (kept off the rail's rounded ends).
	const dotLeft = $derived(50 + (c.position ?? 0) * 44);

	const actionValue = $derived.by(() => {
		const a = c.action;
		if (a.kind === 'grind') return a.target ?? `${Math.abs(a.deltaTicks)} ticks ${a.direction}`;
		if (a.kind === 'yield') return `${a.targetG}g`;
		return null;
	});
	const actionQualifier = $derived.by(() => {
		const a = c.action;
		if (a.kind === 'grind')
			return `${a.deltaTicks < 0 ? '−' : '+'}${Math.abs(a.deltaTicks)} ticks · ${a.direction}`;
		if (a.kind === 'yield') return a.direction === 'increase' ? 'longer yield' : 'shorter yield';
		return null;
	});
</script>

<div
	class="rounded-[18px] border px-4 py-4 {isHold
		? 'border-success/25 bg-success/[0.07]'
		: isDiagnose
			? 'border-warning/30 bg-warning/[0.07]'
			: 'border-copper/25 bg-copper-lt'}"
>
	<div class="flex items-center justify-between">
		<div
			class="font-mono text-eyebrow font-medium tracking-[0.14em] uppercase {isHold
				? 'text-success'
				: isDiagnose
					? 'text-warning-dk'
					: 'text-copper-dk'}"
		>
			{eyebrow}
		</div>
		{#if !c.fromTaste}
			<div class="font-mono text-eyebrow tracking-[0.12em] text-muted uppercase">
				from the numbers
			</div>
		{/if}
	</div>

	<!-- Metrics row.
	     Stacked label-over-value in a 3-column grid, matching BrewCard and the
	     brew-detail DOSE/YIELD/RATIO rows. It used to lay each group out INLINE
	     (`label value unit` on one baseline), which left under 14px of slack at
	     393pt and already wrapped at 375pt — so any type increase, or a user
	     raising their text size, broke it. Stacked, each column only has to fit
	     the WIDER of its label and value rather than their sum. -->
	<div class="mt-3 grid grid-cols-3 gap-2 font-mono">
		<div>
			<div class="text-eyebrow font-medium tracking-[0.12em] text-muted uppercase">Ratio</div>
			<div class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink">
				1:{c.ratio.toFixed(2)}
			</div>
		</div>
		<div>
			<div class="text-eyebrow font-medium tracking-[0.12em] text-muted uppercase">Flow</div>
			<div class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink">
				{c.flowRate.toFixed(2)}<span class="text-micro text-muted">g/s</span>
			</div>
		</div>
		<div>
			<div class="text-eyebrow font-medium tracking-[0.12em] text-muted uppercase">Time</div>
			<div class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink">
				{c.timeS}<span class="text-micro text-muted">s</span>
			</div>
		</div>
	</div>

	<!-- Under ↔ over rail -->
	<div class="mt-3">
		<div
			class="flex justify-between font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase"
		>
			<span>Under</span><span>Balanced</span><span>Over</span>
		</div>
		<div
			class="relative mt-1 h-[6px] rounded-full"
			style="background: linear-gradient(90deg, var(--color-warning) 0%, var(--color-success) 50%, var(--color-danger) 100%); opacity: 0.85"
		>
			<div
				class="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink transition-[left] duration-200"
				style="left: {dotLeft}%"
			></div>
		</div>
	</div>

	<div
		class="mt-3 font-display text-[calc(var(--dt-base)*18/17)] leading-[1.25] font-medium text-ink"
	>
		{c.headline}
	</div>
	{#if actionValue}
		<div class="mt-2 flex items-baseline gap-3">
			<span
				class="font-mono text-[calc(var(--dt-base)*24/17)] font-medium tracking-[-0.02em] text-copper"
				>{actionValue}</span
			>
			{#if actionQualifier}
				<span class="font-mono text-eyebrow font-medium tracking-[0.12em] text-copper-dk uppercase"
					>{actionQualifier}</span
				>
			{/if}
		</div>
	{/if}
	<p class="mt-2 text-[calc(var(--dt-base)*13/17)] leading-[1.5] text-ink-70">{c.prose}</p>
	{#if c.aside}
		<p class="mt-2 text-[calc(var(--dt-base)*12/17)] leading-[1.5] text-muted italic">
			{c.aside}
		</p>
	{/if}

	{#if footer}
		<div class="mt-4 flex flex-wrap items-center gap-2">
			{@render footer()}
		</div>
	{/if}
</div>
