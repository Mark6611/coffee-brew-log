<script lang="ts">
	// Dev-only gallery for the Button matrix (see Button.svelte). Not linked
	// from the app; it exists so the size x style grid can be eyeballed in both
	// themes without hunting the same button down across real screens.
	import Button from '$lib/components/Button.svelte';

	const sizes = ['large', 'medium', 'regular', 'small'] as const;
	const variants = [
		'prominent',
		'glassProminent',
		'glass',
		'bordered',
		'plain',
		'destructive'
	] as const;
</script>

<svelte:head><title>Button matrix</title></svelte:head>

<div class="mx-auto max-w-3xl px-[22px] py-10">
	<h1 class="mb-6 font-display text-[28px] font-medium text-ink">Button matrix</h1>

	<!-- Glass needs something with structure behind it, or the material has
	     nothing to refract and reads as flat grey. -->
	<div
		class="mb-8 rounded-[22px] p-5"
		style="background: linear-gradient(120deg, var(--color-copper) 0%, var(--color-paper) 45%, var(--color-success) 100%)"
	>
		<div class="flex flex-wrap items-center gap-3">
			{#each sizes as size}
				<Button {size} variant="glass">Glass {size}</Button>
			{/each}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			{#each sizes as size}
				<Button {size} variant="glassProminent">Tinted {size}</Button>
			{/each}
		</div>
	</div>

	{#each variants as variant}
		<div class="border-t border-hairline py-5">
			<div class="mb-3 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
				{variant}
			</div>
			<div class="flex flex-wrap items-center gap-3">
				{#each sizes as size}
					<Button {size} {variant}>Label</Button>
				{/each}
				<Button size="regular" {variant} disabled>Disabled</Button>
				<Button size="regular" {variant} iconOnly label="Add">
					<svg width="16" height="16" viewBox="0 0 18 18" fill="none">
						<path
							d="M9 3v12M3 9h12"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
						/>
					</svg>
				</Button>
			</div>
		</div>
	{/each}

	<div class="border-t border-hairline py-5">
		<div class="mb-3 font-mono text-[10px] font-medium tracking-[0.14em] text-muted uppercase">
			full width
		</div>
		<Button size="large" variant="prominent" full>Save brew</Button>
	</div>
</div>
