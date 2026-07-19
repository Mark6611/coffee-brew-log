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
			class="font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] {isHold
				? 'text-success'
				: isDiagnose
					? 'text-warning'
					: 'text-copper-dk'}"
		>{eyebrow}</div>
		{#if !c.fromTaste}
			<div class="text-faint font-mono text-[9px] uppercase tracking-[0.12em]">from the numbers</div>
		{/if}
	</div>

	<!-- Metrics row -->
	<div class="mt-2.5 flex items-baseline gap-4 font-mono">
		<div>
			<span class="text-muted text-[9.5px] font-medium uppercase tracking-[0.12em]">Ratio </span>
			<span class="text-ink text-[15px] font-medium tracking-[-0.01em]">1:{c.ratio.toFixed(2)}</span>
		</div>
		<div>
			<span class="text-muted text-[9.5px] font-medium uppercase tracking-[0.12em]">Flow </span>
			<span class="text-ink text-[15px] font-medium tracking-[-0.01em]">{c.flowRate.toFixed(2)}</span>
			<span class="text-muted text-[10px]">g/s</span>
		</div>
		<div>
			<span class="text-muted text-[9.5px] font-medium uppercase tracking-[0.12em]">Time </span>
			<span class="text-ink text-[15px] font-medium tracking-[-0.01em]">{c.timeS}</span>
			<span class="text-muted text-[10px]">s</span>
		</div>
	</div>

	<!-- Under ↔ over rail -->
	<div class="mt-3">
		<div class="text-muted flex justify-between font-mono text-[8.5px] font-medium uppercase tracking-[0.14em]">
			<span>Under</span><span>Balanced</span><span>Over</span>
		</div>
		<div class="relative mt-1 h-[6px] rounded-full" style="background: linear-gradient(90deg, var(--color-warning) 0%, var(--color-success) 50%, var(--color-danger) 100%); opacity: 0.85">
			<div
				class="border-paper bg-ink absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[left] duration-200"
				style="left: {dotLeft}%"
			></div>
		</div>
	</div>

	<div class="font-display text-ink mt-3 text-[18px] font-medium leading-[1.25]">{c.headline}</div>
	{#if actionValue}
		<div class="mt-1.5 flex items-baseline gap-2.5">
			<span class="text-copper font-mono text-[24px] font-medium tracking-[-0.02em]">{actionValue}</span>
			{#if actionQualifier}
				<span class="text-copper-dk font-mono text-[10.5px] font-medium tracking-[0.12em] uppercase">{actionQualifier}</span>
			{/if}
		</div>
	{/if}
	<p class="text-ink-70 mt-2 text-[13px] leading-[1.5]">{c.prose}</p>
	{#if c.aside}
		<p class="text-muted mt-1.5 text-[12px] leading-[1.5] italic">{c.aside}</p>
	{/if}

	{#if footer}
		<div class="mt-3.5 flex flex-wrap items-center gap-2">
			{@render footer()}
		</div>
	{/if}
</div>
