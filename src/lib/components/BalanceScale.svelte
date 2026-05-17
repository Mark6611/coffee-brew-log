<script lang="ts">
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

<div
	class="bg-paper border-hairline relative grid h-11 grid-cols-3 gap-1 rounded-xl border p-1"
>
	{#each options as opt (opt)}
		<button
			type="button"
			onclick={() => oninput?.(opt)}
			disabled={readonly}
			class="h-full rounded-[8px] text-[13px] capitalize transition-all duration-200 {value === opt
				? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]'
				: 'text-muted bg-transparent font-medium'} {readonly ? 'cursor-default' : ''}"
		>{opt}</button>
	{/each}
</div>
