<script lang="ts">
	type Method = 'espresso' | 'pour-over';
	let { value = $bindable<Method>('espresso') }: { value?: Method } = $props();
</script>

<div
	class="bg-paper border-hairline relative grid h-12 grid-cols-2 gap-1 rounded-[14px] border p-1"
>
	<button
		type="button"
		onclick={() => (value = 'espresso')}
		class="h-full rounded-[10px] text-[14.5px] transition-all duration-200 {value === 'espresso'
			? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]'
			: 'text-muted bg-transparent font-medium'}"
	>Espresso</button>
	<button
		type="button"
		onclick={() => (value = 'pour-over')}
		class="h-full rounded-[10px] text-[14.5px] transition-all duration-200 {value === 'pour-over'
			? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]'
			: 'text-muted bg-transparent font-medium'}"
	>Pour-over</button>
</div>
