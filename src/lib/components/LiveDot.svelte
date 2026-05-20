<script lang="ts">
	// Breathing dot used in the published indicator.
	// Keyframe `brewBreath` is defined in src/routes/layout.css.
	let {
		color = 'var(--color-success)',
		size = 6
	}: { color?: string; size?: number } = $props();
</script>

<span
	class="inline-block rounded-full align-middle"
	style="width: {size}px; height: {size}px; background: {color}; color: {color}; animation: brewBreath 2.4s ease-in-out infinite;"
	aria-hidden="true"
></span>
