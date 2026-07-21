<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		resolveOrigins,
		isBlend,
		toggleOriginChip,
		POPULAR_ORIGINS,
		type ResolvedOrigin
	} from '$lib/origin/resolve';
	import OriginFlag from './OriginFlag.svelte';

	let { value = $bindable('') }: { value?: string } = $props();

	// Flags in the input adornment are debounced so they don't flicker "no match"
	// mid-word while typing. Chip active-state is derived straight from `value`
	// (instant) — a tap should light up immediately.
	let resolved = $state<ResolvedOrigin[]>([]);
	let firstRun = true;

	$effect(() => {
		const current = value;
		if (!current) {
			resolved = [];
			firstRun = false;
			return;
		}
		if (firstRun) {
			firstRun = false;
			resolved = resolveOrigins(current);
			return;
		}
		const timer = setTimeout(() => {
			resolved = resolveOrigins(current);
		}, 300);
		return () => clearTimeout(timer);
	});

	const blend = $derived(isBlend(value));
	const activeCodes = $derived(new Set(resolveOrigins(value).map((r) => r.code)));

	// Tapping a chip adds/removes that country in the free-text value. All the
	// logic lives in the pure toggleOriginChip helper (unit-tested); here we just
	// apply it and refresh the flag adornment instantly.
	function toggle(o: ResolvedOrigin) {
		value = toggleOriginChip(value, o);
		resolved = resolveOrigins(value);
	}
</script>

<div
	class="flex min-h-12 w-full items-center rounded-[14px] border bg-paper transition-all duration-200 {resolved.length
		? 'border-copper ring-[3px] ring-copper/[0.18]'
		: 'border-hairline focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25'}"
>
	{#if resolved.length}
		<div
			class="flex h-full items-center gap-0.5 border-r border-hairline px-3"
			transition:fade={{ duration: 180 }}
		>
			{#each resolved as f (f.code)}<OriginFlag code={f.code} country={f.country} />{/each}
		</div>
	{/if}
	<input
		type="text"
		bind:value
		placeholder="e.g. Ethiopia, or Brazil + Ethiopia"
		class="min-h-12 min-w-0 flex-1 bg-transparent px-3.5 text-ink outline-none placeholder:text-faint"
	/>
	{#if blend}
		<span
			class="mr-2.5 rounded-full bg-copper-lt px-2 py-[3px] font-mono text-[10px] font-medium tracking-[0.12em] text-copper-dk uppercase"
			transition:fade={{ duration: 180 }}>Blend</span
		>
	{:else if resolved.length === 1}
		<span
			class="pr-3.5 font-mono text-[12px] font-medium tracking-[0.14em] text-copper"
			transition:fade={{ duration: 180 }}>{resolved[0].code}</span
		>
	{/if}
</div>

<!-- Quick-pick popular origins. Multi-select: tap two for a blend. -->
<div class="mt-2 flex flex-wrap gap-1.5">
	{#each POPULAR_ORIGINS as o (o.code)}
		{@const active = activeCodes.has(o.code)}
		<button
			type="button"
			onclick={() => toggle(o)}
			aria-pressed={active}
			class="press-sm inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium {active
				? 'border-copper bg-copper text-paper'
				: 'border-hairline bg-surface text-ink hover:border-copper/50'}"
		>
			<OriginFlag code={o.code} country={o.country} />
			{o.country}
		</button>
	{/each}
</div>

<p class="mt-1.5 text-[12px] {resolved.length ? 'text-copper-dk' : 'text-faint'}" aria-live="polite">
	{#if blend}
		Blend of <strong class="font-medium"
			>{resolved.length ? resolved.map((r) => r.country).join(', ') : 'multiple origins'}</strong
		>.
	{:else if resolved.length === 1}
		Matched <strong class="font-medium">{resolved[0].country}</strong> for the flag indicator.
	{:else if value}
		Free text — no flag if origin isn't recognized.
	{:else}
		Tap a country, or type — e.g. Ethiopia · Brazil Cerrado · Brazil + Ethiopia
	{/if}
</p>
