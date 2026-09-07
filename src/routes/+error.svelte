<script lang="ts">
	// Root error boundary. SvelteKit renders this when a load() or a component
	// render throws anywhere in the tree. Without it an unexpected throw showed
	// the framework's unstyled fallback — inside the iOS shell that reads as the
	// app having crashed, with no navigation and no way home.
	//
	// Matches the empty/error states the routes already use (see the loadError
	// block on the home route) rather than inventing a second visual language.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';

	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Not found' : 'Something went wrong'} · Coffee Brew Log</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-10">
	<div class="px-5 pt-16 text-center">
		<p class="font-display text-[calc(var(--dt-base)*20/17)] font-medium text-ink">
			{isNotFound ? 'That page isn’t here.' : 'Something went wrong.'}
		</p>
		<p class="mt-2 text-[calc(var(--dt-base)*14/17)] text-muted">
			{isNotFound
				? 'The link may be old, or the page may have moved.'
				: 'An unexpected error interrupted the app. Your brews are stored on this device and are not affected.'}
		</p>

		<Button size="medium" variant="prominent" href={resolve('/')} class="mt-5">Back to today</Button
		>

		{#if page.error?.message && !isNotFound}
			<!-- The message is for diagnosis, not instruction: quiet, and only on a
			     real error (a 404's message is just "Not Found"). -->
			<p class="mt-8 font-mono text-[calc(var(--dt-base)*11/17)] tracking-[0.04em] text-muted">
				{page.error.message}
			</p>
		{/if}
	</div>
</div>
