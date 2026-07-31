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
	class="rounded-[18px] border px-4 py-[16px] {isHold
		? 'border-success/25 bg-success/[0.07]'
		: isDiagnose
			? 'border-warning/30 bg-warning/[0.07]'
			: 'border-copper/25 bg-copper-lt'}"
>
	<div class="flex items-center justify-between">
		<div
			class="font-mono text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.14em] uppercase {isHold
				? 'text-success'
				: isDiagnose
					? 'text-warning-dk'
					: 'text-copper-dk'}"
		>
			{eyebrow}
		</div>
		{#if !c.fromTaste}
			<div
				class="font-mono text-[calc(var(--dt-base)*9/17)] tracking-[0.12em] text-muted uppercase"
			>
				from the numbers
			</div>
		{/if}
	</div>

	<!-- Metrics row -->
	<div class="mt-2.5 flex items-baseline gap-4 font-mono">
		<div>
			<span
				class="text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.12em] text-muted uppercase"
				>Ratio
			</span>
			<span class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink"
				>1:{c.ratio.toFixed(2)}</span
			>
		</div>
		<div>
			<span
				class="text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.12em] text-muted uppercase"
				>Flow
			</span>
			<span class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink"
				>{c.flowRate.toFixed(2)}</span
			>
			<span class="text-[calc(var(--dt-base)*10/17)] text-muted">g/s</span>
		</div>
		<div>
			<span
				class="text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.12em] text-muted uppercase"
				>Time
			</span>
			<span class="text-[calc(var(--dt-base)*15/17)] font-medium tracking-[-0.01em] text-ink"
				>{c.timeS}</span
			>
			<span class="text-[calc(var(--dt-base)*10/17)] text-muted">s</span>
		</div>
	</div>

	<!-- Under ↔ over rail -->
	<div class="mt-3">
		<div
			class="flex justify-between font-mono text-[calc(var(--dt-base)*8.5/17)] font-medium tracking-[0.14em] text-muted uppercase"
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
		<div class="mt-1.5 flex items-baseline gap-2.5">
			<span
				class="font-mono text-[calc(var(--dt-base)*24/17)] font-medium tracking-[-0.02em] text-copper"
				>{actionValue}</span
			>
			{#if actionQualifier}
				<span
					class="font-mono text-[calc(var(--dt-base)*10.5/17)] font-medium tracking-[0.12em] text-copper-dk uppercase"
					>{actionQualifier}</span
				>
			{/if}
		</div>
	{/if}
	<p class="mt-2 text-[calc(var(--dt-base)*13/17)] leading-[1.5] text-ink-70">{c.prose}</p>
	{#if c.aside}
		<p class="mt-1.5 text-[calc(var(--dt-base)*12/17)] leading-[1.5] text-muted italic">
			{c.aside}
		</p>
	{/if}

	{#if footer}
		<div class="mt-3.5 flex flex-wrap items-center gap-2">
			{@render footer()}
		</div>
	{/if}
</div>
