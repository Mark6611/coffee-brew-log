<script lang="ts">
	import type { Process } from '$lib/db/types';

	let { process }: { process: Process } = $props();

	const styles: Record<Process, { bg: string; color: string }> = {
		washed: { bg: 'rgba(63,123,162,0.10)', color: '#3F5B7B' },
		natural: { bg: 'rgba(166,52,27,0.10)', color: '#7A2913' },
		honey: { bg: 'rgba(176,122,20,0.14)', color: '#7A540C' },
		anaerobic: { bg: 'rgba(79,107,46,0.12)', color: '#3F5723' }
	};

	const s = $derived(styles[process]);
</script>

<span
	class="inline-flex h-[18px] items-center rounded-full px-[7px] font-mono text-[9.5px] font-medium tracking-[0.12em] uppercase"
	style="background: {s.bg}; color: {s.color}"
	aria-label={process}
>{process}</span>
