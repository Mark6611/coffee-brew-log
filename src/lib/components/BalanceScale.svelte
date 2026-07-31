<script lang="ts">
	import { FOCUS_RING_INSET } from './focus';
	type Balance = 'light' | 'balanced' | 'heavy';

	let {
		value,
		readonly = false,
		oninput
	}: {
		value: Balance | undefined;
		readonly?: boolean;
		oninput?: (v: Balance) => void;
	} = $props();

	const options: Balance[] = ['light', 'balanced', 'heavy'];
</script>

<div class="relative grid h-11 grid-cols-3 gap-1 rounded-xl border border-hairline bg-paper p-1">
	{#each options as opt (opt)}
		<button
			type="button"
			onclick={() => oninput?.(opt)}
			disabled={readonly}
			aria-pressed={value === opt}
			class="hit-44 {FOCUS_RING_INSET} h-full rounded-[8px] text-[13px] capitalize transition-all duration-200 {value === opt
				? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]'
				: 'bg-transparent font-medium text-muted'} {readonly ? 'cursor-default' : ''}">{opt}</button
		>
	{/each}
</div>
