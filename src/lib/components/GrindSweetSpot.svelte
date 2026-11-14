<script lang="ts">
	import type { GrindCalibration } from '$lib/brews/calibrate';

	// The learned grind for a bag (see $lib/brews/calibrate). Shown on the bag
	// page and in the brew form's history, so the wording lives here once.
	let { calibration, class: cls = '' }: { calibration: GrindCalibration; class?: string } =
		$props();

	function confTone(c: GrindCalibration['confidence']): string {
		if (c === 'high') return 'var(--color-success)';
		// warning-dk, not warning: this is rendered as TEXT (the plain fill tone is
		// only 3.25:1 on paper). Extraction dots keep the brighter fill.
		if (c === 'low') return 'var(--color-warning-dk)';
		return 'var(--color-copper-dk)';
	}
	function blurb(c: GrindCalibration): string {
		const basis =
			c.basis === 'balanced'
				? 'balanced shots'
				: c.basis === 'rated'
					? 'your top-rated shots'
					: 'balanced and top-rated shots';
		if (c.confidence === 'high')
			return `A tight cluster across ${basis} — treat this as your grind for this bag.`;
		if (c.confidence === 'low')
			return `An early read from ${basis}; it sharpens as you log a few more.`;
		return `Weighted toward your recent ${basis}. Keep logging to tighten it.`;
	}
</script>

<div class="rounded-input border border-copper/30 bg-copper/[0.06] px-4 py-3 {cls}">
	<div class="flex items-center justify-between">
		<span class="font-mono text-eyebrow font-medium tracking-[0.14em] text-copper-dk uppercase"
			>Grind sweet spot</span
		>
		<span
			class="font-mono text-eyebrow font-medium tracking-[0.12em] uppercase"
			style="color: {confTone(calibration.confidence)}">{calibration.confidence} confidence</span
		>
	</div>
	<div class="mt-1 flex items-baseline gap-2">
		<span
			class="font-mono text-[calc(var(--dt-base)*22/17)] font-semibold tracking-[-0.01em] text-copper"
			>{calibration.grind}</span
		>
		<span class="text-[calc(var(--dt-base)*12/17)] text-muted"
			>from {calibration.sampleCount} good shot{calibration.sampleCount === 1
				? ''
				: 's'}{calibration.totalShots > calibration.sampleCount
				? ` of ${calibration.totalShots}`
				: ''}</span
		>
	</div>
	<p class="mt-1 text-[calc(var(--dt-base)*11.5/17)] leading-[1.45] text-muted">
		{blurb(calibration)}
	</p>
</div>
