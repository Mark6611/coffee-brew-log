<script lang="ts">
	import { FOCUS_RING_INSET } from './focus';
	import type { Extraction } from '$lib/db/types';

	// Espresso extraction picker (sour ↔ balanced ↔ bitter). Same segmented
	// shell as BalanceScale, plus a tonal cue on the active segment — an inset
	// bottom underline + dot in the semantic tone, because this axis carries
	// direction (sour = under-extracted, bitter = over-extracted).
	let {
		value,
		readonly = false,
		oninput
	}: {
		value: Extraction | undefined;
		readonly?: boolean;
		oninput?: (v: Extraction) => void;
	} = $props();

	const options: { key: Extraction; tone: string }[] = [
		{ key: 'sour', tone: 'var(--color-warning)' },
		{ key: 'balanced', tone: 'var(--color-success)' },
		{ key: 'bitter', tone: 'var(--color-danger)' }
	];
</script>

<div
	class="relative grid min-h-11 grid-cols-3 gap-1 rounded-input border border-hairline bg-paper p-1"
	role={readonly ? 'group' : undefined}
	aria-label={readonly ? `Taste: ${value ?? 'not set'}` : undefined}
>
	{#each options as opt (opt.key)}
		{@const active = value === opt.key}
		<button
			type="button"
			onclick={() => oninput?.(opt.key)}
			tabindex={readonly ? -1 : undefined}
			aria-hidden={readonly ? true : undefined}
			aria-pressed={active}
			class="hit-44 {FOCUS_RING_INSET} relative h-full rounded-control text-[calc(var(--dt-base)*13/17)] capitalize transition-all duration-200 {active
				? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]'
				: 'bg-transparent font-medium text-muted'} {readonly ? 'cursor-default' : ''}"
		>
			<span class="inline-flex items-center gap-2">
				{#if active}
					<span
						class="inline-block h-[5px] w-[5px] rounded-full"
						style="background: {opt.tone}"
						aria-hidden="true"
					></span>
				{/if}
				{opt.key}
			</span>
			{#if active}
				<span
					class="absolute right-2.5 bottom-[3px] left-2.5 h-[2px] rounded-full"
					style="background: {opt.tone}"
					aria-hidden="true"
				></span>
			{/if}
		</button>
	{/each}
</div>
