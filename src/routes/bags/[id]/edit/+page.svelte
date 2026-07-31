<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getBagById, updateBag } from '$lib/db/repository';
	import { BagSchema, type Bag, type Process, type RoastLevel } from '$lib/db/types';
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
	let createdAt = $state('');
	let archived = $state<boolean | undefined>(undefined);
	let dialedRecipeStash: Bag['dialedRecipe'] = undefined;
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let loading = $state(true);
	let notFound = $state(false);

	const bagId = $derived(page.params.id as string);

	onMount(async () => {
		const bag = await getBagById(bagId);
		if (!bag) {
			notFound = true;
			loading = false;
			return;
		}
		name = bag.name;
		photo = bag.photo ?? undefined;
		roaster = bag.roaster ?? '';
		origin = bag.origin ?? '';
		roastedAt = bag.roastedAt ?? '';
		process = bag.process ?? '';
		roastLevel = bag.roastLevel ?? '';
		weightGrams = bag.weightGrams ?? null;
		pricePaid = bag.pricePaid ?? null;
		notes = bag.notes ?? '';
		createdAt = bag.createdAt;
		archived = bag.archived;
		// Settled dial-in recipe: no edit UI here — pass through untouched so an
		// edit-save never strips it (whole-row put + upsert).
		dialedRecipeStash = bag.dialedRecipe;
		loading = false;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;

		try {
			const candidate = {
				id: bagId,
				name: name.trim(),
				roaster: roaster.trim() || undefined,
				origin: origin.trim() || undefined,
				roastedAt: roastedAt || undefined,
				process: process || undefined,
				roastLevel: roastLevel || undefined,
				weightGrams: weightGrams ?? undefined,
				pricePaid: pricePaid ?? undefined,
				notes: notes.trim() || undefined,
				photo,
				archived,
				createdAt,
				dialedRecipe: dialedRecipeStash
			};
			const bag = BagSchema.parse(candidate);
			await updateBag(bag);
			await goto(resolve('/bags/[id]', { id: bagId }));
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Edit bag</title>
</svelte:head>

{#if loading}
	<p class="py-8 text-center text-sm text-muted">Loading…</p>
{:else if notFound}
	<div class="mx-auto max-w-2xl px-5 pt-12 text-center">
		<p class="text-muted">Bag not found.</p>
		<a href={resolve('/bags')} class="mt-3 inline-block text-copper underline">Back to bags</a>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
		<div class="flex items-center justify-between px-5 pe-16 pt-2 pb-2 sm:pe-5">
			<a
				href={resolve('/bags/[id]', { id: bagId })}
				class="flex h-9 items-center gap-1 text-[calc(var(--dt-base)*15/17)] text-muted transition-colors hover:text-ink"
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
			<Eyebrow>EDIT BAG</Eyebrow>
			<span class="h-9 w-[60px]" aria-hidden="true"></span>
		</div>

		<h1
			class="mx-5 mt-2 mb-5 font-display text-[calc(var(--dt-base)*30/17)] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			Edit bag
		</h1>

		<div class="space-y-5 px-5">
			<div>
				<Eyebrow class="mb-2">NAME</Eyebrow>
				<input
					type="text"
					bind:value={name}
					required
					class="min-h-12 w-full rounded-[14px] border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
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
					class="min-h-12 w-full rounded-[14px] border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
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
					class="min-h-12 w-full rounded-[14px] border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
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
						class="field-wrapper flex min-h-12 items-center gap-2 rounded-[14px] border border-hairline bg-paper px-4 py-2 transition focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25"
					>
						<input
							type="number"
							bind:value={weightGrams}
							step="1"
							min="1"
							inputmode="decimal"
							class="min-w-0 flex-1 font-mono text-[calc(var(--dt-base)*16/17)] tracking-[-0.01em] text-ink placeholder:text-muted"
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
						class="min-h-12 w-full rounded-[14px] border border-hairline bg-paper px-4 py-2 font-mono text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
					/>
				</div>
			</div>

			<div>
				<Eyebrow class="mb-2">NOTES</Eyebrow>
				<textarea
					bind:value={notes}
					rows="3"
					class="w-full resize-none rounded-[14px] border border-hairline bg-paper px-4 py-4 font-display text-[calc(var(--dt-base)*16/17)] leading-[1.45] text-ink-70 italic transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
				></textarea>
			</div>

			{#if error}
				<div class="rounded-[14px] border border-danger/20 bg-danger/8 p-3 text-sm text-danger">
					{error}
				</div>
			{/if}

			<Button size="large" variant="prominent" full type="submit" disabled={submitting}
				>{submitting ? 'Saving…' : 'Save'}</Button
			>
		</div>
	</form>
{/if}
