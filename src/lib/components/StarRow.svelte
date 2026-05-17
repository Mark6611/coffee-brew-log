<script lang="ts">
	let {
		value,
		size = 16,
		gap = 2
	}: {
		value: number;
		size?: number;
		gap?: number;
	} = $props();
</script>

<div class="inline-flex items-center text-copper" style="gap: {gap}px">
	{#each [0, 1, 2, 3, 4] as i (i)}
		{@const fill = Math.max(0, Math.min(1, value - i))}
		<span class="relative inline-block" style="width: {size}px; height: {size}px">
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linejoin="round"
				class="absolute inset-0 opacity-30"
			>
				<polygon
					points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
				/>
			</svg>
			{#if fill > 0}
				<span
					class="absolute inset-y-0 left-0 overflow-hidden"
					style="width: {fill * 100}%"
				>
					<svg
						width={size}
						height={size}
						viewBox="0 0 24 24"
						fill="currentColor"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linejoin="round"
					>
						<polygon
							points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
						/>
					</svg>
				</span>
			{/if}
		</span>
	{/each}
</div>
