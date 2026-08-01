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

<div class="mx-auto max-w-3xl px-5 py-10">
	<h1 class="mb-6 font-display text-[calc(var(--dt-base)*28/17)] font-medium text-ink">
		Button matrix
	</h1>

	<!-- Glass needs something with structure behind it, or the material has
	     nothing to refract and reads as flat grey. -->
	<div
		class="mb-8 rounded-card-lg p-5"
		style="background: linear-gradient(120deg, var(--color-copper) 0%, var(--color-paper) 45%, var(--color-success) 100%)"
	>
		<div class="flex flex-wrap items-center gap-3">
			{#each sizes as size (size)}
				<Button {size} variant="glass">Glass {size}</Button>
			{/each}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-3">
			{#each sizes as size (size)}
				<Button {size} variant="glassProminent">Tinted {size}</Button>
			{/each}
		</div>
	</div>

	<!-- glassScrim is the over-media material: it sits on a user photo, where the
	     card-tinted glass above would lose contrast. Shown on a bright backdrop
	     because that's the case it exists to survive. -->
	<div
		class="mb-8 rounded-card-lg p-5"
		style="background: linear-gradient(115deg, #f7f3e8 0%, #d8c9a8 40%, #8fae6a 100%)"
	>
		<!-- The backdrop is a hardcoded bright gradient, so this caption is a
		     hardcoded dark ink too — text-ink would flip to cream in dark theme and
		     vanish against a swatch that never changes. -->
		<div
			class="mb-3 font-mono text-eyebrow font-medium tracking-[0.14em] uppercase"
			style="color: rgba(28,24,20,0.7)"
		>
			glassScrim · over media
		</div>
		<div class="flex flex-wrap items-center gap-3">
			{#each sizes as size (size)}
				<Button {size} variant="glassScrim">Scrim {size}</Button>
			{/each}
			<Button size="medium" variant="glassScrim" iconOnly label="Close">✕</Button>
		</div>
	</div>

	{#each variants as variant (variant)}
		<div class="border-t border-hairline py-5">
			<div class="mb-3 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
				{variant}
			</div>
			<div class="flex flex-wrap items-center gap-3">
				{#each sizes as size (size)}
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
		<div class="mb-3 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
			full width
		</div>
		<Button size="large" variant="prominent" full>Save brew</Button>
	</div>
</div>
