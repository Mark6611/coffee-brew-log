<script lang="ts">
	import { TIME_RAIL } from '$lib/brews/dialin';
	import type { Extraction } from '$lib/db/types';

	// Horizontal shot-time rail (fixed 18–36s domain) with the roast window as
	// a copper band and each shot as a dot positioned by its time, colored by
	// its extraction verdict. Pure CSS — no canvas, no streamed data.
	let {
		window: win,
		shots
	}: {
		window: [number, number];
		shots: { timeS: number; extraction?: Extraction; latest: boolean }[];
	} = $props();

	const [railLo, railHi] = TIME_RAIL;
	const span = railHi - railLo;
	function pct(t: number): number {
		return Math.min(98, Math.max(2, ((t - railLo) / span) * 100));
	}
	function tone(e: Extraction | undefined): string {
		if (e === 'sour') return 'var(--color-warning)';
		if (e === 'balanced') return 'var(--color-success)';
		if (e === 'bitter') return 'var(--color-danger)';
		return 'var(--color-faint)';
	}
</script>

<div>
	<div class="relative h-8">
		<!-- rail -->
		<div
			class="absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full bg-hairline"
		></div>
		<!-- roast window band -->
		<div
			class="absolute top-1/2 h-[14px] -translate-y-1/2 rounded-[4px] border border-copper/40 bg-copper/[0.22]"
			style="left: {pct(win[0])}%; width: {pct(win[1]) - pct(win[0])}%"
		></div>
		<!-- shot dots -->
		{#each shots as s, i (i)}
			<span
				class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full {s.latest
					? 'h-3 w-3 ring-2 ring-paper'
					: 'h-[7px] w-[7px] opacity-55'}"
				style="left: {pct(s.timeS)}%; background: {tone(s.extraction)}"
				title="{s.timeS}s"
			></span>
		{/each}
	</div>
	<div
		class="mt-1 flex items-baseline justify-between font-mono text-micro tracking-[0.06em] text-muted"
	>
		<span>{railLo}s</span>
		<span class="font-medium text-copper">{win[0]}–{win[1]}s TARGET</span>
		<span>{railHi}s</span>
	</div>
</div>
