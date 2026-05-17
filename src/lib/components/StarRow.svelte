<script lang="ts">
	let {
		value,
		size = 16,
		gap = 2,
		oninput
	}: {
		value: number;
		size?: number;
		gap?: number;
		oninput?: (v: number) => void;
	} = $props();

	const interactive = $derived(!!oninput);
</script>

<div class="text-copper inline-flex items-center" style="gap: {gap}px">
	{#each [1, 2, 3, 4, 5] as star (star)}
		{@const fill = Math.max(0, Math.min(1, value - (star - 1)))}
		<span class="relative inline-block" style="width: {size}px; height: {size}px">
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linejoin="round"
				class="pointer-events-none absolute inset-0 opacity-30"
			>
				<polygon
					points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
				/>
			</svg>
			{#if fill > 0}
				<span
					class="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
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
			{#if interactive}
				<button
					type="button"
					onclick={() => oninput?.(star - 0.5)}
					class="absolute top-0 -bottom-1 left-0 w-1/2 cursor-pointer"
					aria-label="Rate {star - 0.5} of 5"
				></button>
				<button
					type="button"
					onclick={() => oninput?.(star)}
					class="absolute top-0 -bottom-1 right-0 w-1/2 cursor-pointer"
					aria-label="Rate {star} of 5"
				></button>
			{/if}
		</span>
	{/each}
</div>
