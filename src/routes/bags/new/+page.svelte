<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { addBag } from '$lib/db/repository';
	import { BagSchema, type Process, type RoastLevel } from '$lib/db/types';
	import Button from '$lib/components/Button.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';
	import OriginInput from '$lib/components/OriginInput.svelte';
	import RoastChips from '$lib/components/RoastChips.svelte';
	import PhotoInput from '$lib/components/PhotoInput.svelte';

	let name = $state('');
	let photo = $state<string | null | undefined>(undefined);
	let roaster = $state('');
	let origin = $state('');
	let roastedAt = $state('');
	let process = $state<Process | ''>('');
	let roastLevel = $state<RoastLevel | ''>('');
	let weightGrams = $state<number | null>(null);
	let pricePaid = $state<number | null>(null);
	let notes = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	onMount(() => {
		const queryName = page.url.searchParams.get('name');
		if (queryName) name = queryName;
	});

	// Where Cancel/Save go back to. `returnTo` is whatever the query string says,
	// so it can't be handed to resolve() — or to goto() — as a route. Only the two
	// screens that link here (new brew, edit brew) are honoured; anything else
	// falls back to the bag list rather than bouncing the user somewhere arbitrary.
	function returnTarget(newBagId?: string): ResolvedPathname {
		const raw = page.url.searchParams.get('returnTo');
		// Matched against the uuid shape ids actually have (crypto.randomUUID, and
		// BrewSchema.id is z.string().uuid()). A looser [^/?#]+ would also accept
		// dot segments — `/brews/../edit` resolves to `/edit`, a dead route.
		const editId = /^\/brews\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/edit$/i.exec(
			raw ?? ''
		)?.[1];
		if (editId) {
			return newBagId
				? resolve(`/brews/[id]/edit?bagId=${newBagId}`, { id: editId })
				: resolve('/brews/[id]/edit', { id: editId });
		}
		if (raw === '/brews/new') {
			return newBagId ? resolve(`/brews/new?bagId=${newBagId}`) : resolve('/brews/new');
		}
		return resolve('/bags');
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;

		try {
			const candidate = {
				id: crypto.randomUUID(),
				name: name.trim(),
				roaster: roaster.trim() || undefined,
				origin: origin.trim() || undefined,
				roastedAt: roastedAt || undefined,
				process: process || undefined,
				roastLevel: roastLevel || undefined,
				weightGrams: weightGrams ?? undefined,
				pricePaid: pricePaid ?? undefined,
				notes: notes.trim() || undefined,
				photo: photo ?? undefined,
				createdAt: new Date().toISOString()
			};
			const bag = BagSchema.parse(candidate);
			await addBag(bag);
			await goto(returnTarget(bag.id));
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>New bag</title>
</svelte:head>

<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
	<div class="flex items-center justify-between gap-2 px-5 pe-16 pt-2 pb-2 sm:pe-5">
		<a
			href={returnTarget()}
			class="flex h-9 items-center gap-1 text-[calc(var(--dt-base)*15/17)] text-copper-dk transition-colors hover:text-copper dark:text-copper dark:hover:text-ink"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M10 3L4 8l6 5" />
			</svg>
			Cancel
		</a>
		<Eyebrow class="min-w-0 truncate">NEW BAG</Eyebrow>
		<span class="h-9 w-[60px]" aria-hidden="true"></span>
	</div>

	<h1
		class="mx-5 mt-2 mb-5 font-display text-[calc(var(--dt-base)*30/17)] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
	>
		New bag
	</h1>

	<div class="space-y-5 px-5">
		<div>
			<Eyebrow class="mb-2">NAME</Eyebrow>
			<input
				type="text"
				bind:value={name}
				placeholder="e.g. Worka Sakaro"
				autocapitalize="words"
				autocorrect="off"
				spellcheck="false"
				required
				class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
			/>
		</div>

		<div>
			<Eyebrow class="mb-2">LABEL PHOTO</Eyebrow>
			<PhotoInput bind:photo label="label photo" />
		</div>

		<div>
			<Eyebrow class="mb-2">ROASTER</Eyebrow>
			<input
				type="text"
				bind:value={roaster}
				placeholder="e.g. Sey Coffee"
				autocapitalize="words"
				autocorrect="off"
				spellcheck="false"
				class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
			/>
		</div>

		<div>
			<Eyebrow class="mb-2">ORIGIN</Eyebrow>
			<OriginInput bind:value={origin} />
		</div>

		<div>
			<Eyebrow class="mb-2">ROAST DATE</Eyebrow>
			<input
				type="date"
				bind:value={roastedAt}
				class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
			/>
		</div>

		<div>
			<Eyebrow class="mb-2">PROCESS</Eyebrow>
			<div class="flex flex-wrap gap-2">
				<Chip active={process === ''} onclick={() => (process = '')}>—</Chip>
				<Chip active={process === 'washed'} onclick={() => (process = 'washed')}>Washed</Chip>
				<Chip active={process === 'natural'} onclick={() => (process = 'natural')}>Natural</Chip>
				<Chip active={process === 'honey'} onclick={() => (process = 'honey')}>Honey</Chip>
				<Chip active={process === 'anaerobic'} onclick={() => (process = 'anaerobic')}
					>Anaerobic</Chip
				>
			</div>
		</div>

		<div>
			<Eyebrow class="mb-2">ROAST LEVEL</Eyebrow>
			<RoastChips bind:value={roastLevel} />
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<Eyebrow class="mb-2">WEIGHT (G)</Eyebrow>
				<div
					class="field-wrapper flex min-h-12 items-center gap-2 rounded-input border border-hairline bg-paper px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
				>
					<input
						type="number"
						bind:value={weightGrams}
						step="1"
						min="1"
						inputmode="decimal"
						placeholder="250"
						class="min-w-0 flex-1 font-mono text-[max(16px,calc(var(--dt-base)*16/17))] tracking-[-0.01em] text-ink placeholder:text-muted"
					/>
					<span class="font-mono text-[calc(var(--dt-base)*12/17)] text-muted">g</span>
				</div>
			</div>
			<div>
				<Eyebrow class="mb-2">PRICE</Eyebrow>
				<input
					type="number"
					bind:value={pricePaid}
					step="0.01"
					min="0"
					inputmode="decimal"
					placeholder="0.00"
					class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 font-mono text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				/>
			</div>
		</div>

		<div>
			<Eyebrow class="mb-2">NOTES</Eyebrow>
			<textarea
				bind:value={notes}
				rows="3"
				placeholder="Taste notes from the roaster…"
				class="w-full resize-none rounded-input border border-hairline bg-paper px-4 py-4 font-display text-[max(16px,calc(var(--dt-base)*16/17))] leading-[1.45] text-ink-70 italic transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
			></textarea>
		</div>

		{#if error}
			<div class="rounded-input border border-danger/20 bg-danger/8 p-3 text-sm text-danger">
				{error}
			</div>
		{/if}

		<Button size="large" variant="prominent" full type="submit" disabled={submitting}
			>{submitting ? 'Saving…' : 'Save bag'}</Button
		>
	</div>
</form>
