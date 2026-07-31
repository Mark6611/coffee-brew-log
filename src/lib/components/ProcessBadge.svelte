<script lang="ts">
	import type { Process } from '$lib/db/types';

	let { process }: { process: Process } = $props();
</script>

<!-- Per-process hues are intentional (categories need distinct colors). The
     colors live in layout.css (.process-*) so the dark theme can lift the
     foregrounds in one place — the old inline hex values vanished on dark. -->
<span
	class="process-{process} inline-flex h-[18px] items-center rounded-full px-[7px] font-mono text-[calc(var(--dt-base)*9.5/17)] font-medium tracking-[0.12em] uppercase"
	aria-label={process}>{process}</span
>
