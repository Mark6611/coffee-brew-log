<script lang="ts">
	import type { RoastLevel } from '$lib/db/types';
	import { ROAST_LEVELS } from '$lib/bags/roast';

	// Tonal roast-level picker: chips shade light → dark so the row is its own
	// legend (lightness, not hue, carries meaning — colour-blind safe). Selection
	// is the system copper ring, not a fill swap. Tapping the active chip clears
	// it (the field is optional). Process chips stay neutral — roast is the only
	// shaded row, signalling the two rows mean different kinds of things.
	let { value = $bindable<RoastLevel | ''>('') }: { value?: RoastLevel | '' } = $props();

	function toggle(k: RoastLevel) {
		value = value === k ? '' : k;
	}
</script>

<div class="flex flex-wrap gap-2">
	{#each ROAST_LEVELS as lvl (lvl.key)}
		{@const active = value === lvl.key}
		<button
			type="button"
			onclick={() => toggle(lvl.key)}
			aria-pressed={active}
			class="h-[38px] rounded-full px-[14px] font-sans text-[13.5px] transition-all duration-150"
			style="background:{lvl.bg}; color:{lvl.fg}; opacity:{active ? 1 : 0.82}; font-weight:{active
				? 600
				: 500}; {active
				? 'box-shadow: 0 0 0 2px var(--color-paper), 0 0 0 4px var(--color-copper);'
				: ''}"
		>{lvl.label}</button>
	{/each}
</div>
