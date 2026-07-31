<script lang="ts">
	// Quiet helper shown when the publish toggle goes from on → off on a
	// brew that was previously published. Not a warning, not an error.
</script>

<div
	class="mt-2 flex items-start gap-2 rounded-[10px] bg-ink/[0.04] px-2.5 py-2 text-[calc(var(--dt-base)*12.5/17)] leading-[1.5] text-ink-70"
>
	<svg
		width="13"
		height="13"
		viewBox="0 0 13 13"
		class="mt-[2px] shrink-0 text-muted"
		fill="none"
		stroke="currentColor"
		stroke-width="1.2"
		stroke-linecap="round"
	>
		<circle cx="6.5" cy="6.5" r="5.5" />
		<path d="M6.5 4v3M6.5 9h.01" stroke-width="1.4" />
	</svg>
	<span>This post will disappear from the public site on the next build.</span>
</div>
