<script lang="ts">
	import { FOCUS_RING_INSET } from './focus';
	type Method = 'espresso' | 'pour-over';
	let { value = $bindable<Method>('espresso') }: { value?: Method } = $props();
</script>

<!--
  iOS-style segmented control: a track holding a single sliding thumb that
  animates between segments with a gentle spring overshoot, rather than the
  active state hard-swapping between two buttons. Palette stays the app's own
  (paper track, surface thumb); only the motion + structure follow iOS 27.
-->
<div class="relative flex h-12 rounded-[14px] border border-hairline bg-paper p-1">
	<!-- sliding thumb: width = one segment; translates to the selected index -->
	<div
		class="thumb pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[10px] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
		style="transform: translateX({value === 'espresso' ? '0%' : '100%'})"
	></div>
	<button
		type="button"
		onclick={() => (value = 'espresso')}
		aria-pressed={value === 'espresso'}
		class="hit-44 {FOCUS_RING_INSET} relative z-10 h-full flex-1 text-[14.5px] transition-colors duration-200 {value ===
		'espresso'
			? 'font-semibold text-ink'
			: 'font-medium text-muted'}">Espresso</button
	>
	<button
		type="button"
		onclick={() => (value = 'pour-over')}
		aria-pressed={value === 'pour-over'}
		class="relative z-10 h-full flex-1 text-[14.5px] transition-colors duration-200 {value ===
		'pour-over'
			? 'font-semibold text-ink'
			: 'font-medium text-muted'}">Pour-over</button
	>
</div>

<style>
	/* iOS-feel spring: slight overshoot on settle. Reduced-motion is handled
	   globally in layout.css (transitions collapse to ~1ms). */
	.thumb {
		transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
	}
</style>
