<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getBagById, updateBag } from '$lib/db/repository';
	import { BagSchema, type Bag, type Process, type RoastLevel } from '$lib/db/types';
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
			await goto(`/bags/${bagId}`);
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
	<p class="text-muted py-8 text-center text-sm">Loading…</p>
{:else if notFound}
	<div class="mx-auto max-w-2xl px-[22px] pt-12 text-center">
		<p class="text-muted">Bag not found.</p>
		<a href="/bags" class="text-copper mt-3 inline-block underline">Back to bags</a>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
		<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
			<a
				href="/bags/{bagId}"
				class="text-muted hover:text-ink flex h-9 items-center gap-1 text-[15px] transition-colors"
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
			class="font-display text-ink mx-[22px] mt-1.5 mb-[18px] text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
		>Edit bag</h1>

		<div class="space-y-[18px] px-[22px]">
			<div>
				<Eyebrow class="mb-2">NAME</Eyebrow>
				<input
					type="text"
					bind:value={name}
					required
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
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
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
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
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
				/>
			</div>

			<div>
				<Eyebrow class="mb-2">PROCESS</Eyebrow>
				<div class="flex flex-wrap gap-2">
					<Chip active={process === ''} onclick={() => (process = '')}>—</Chip>
					<Chip active={process === 'washed'} onclick={() => (process = 'washed')}>Washed</Chip>
					<Chip active={process === 'natural'} onclick={() => (process = 'natural')}>Natural</Chip>
					<Chip active={process === 'honey'} onclick={() => (process = 'honey')}>Honey</Chip>
					<Chip active={process === 'anaerobic'} onclick={() => (process = 'anaerobic')}>Anaerobic</Chip>
				</div>
			</div>

			<div>
				<Eyebrow class="mb-2">ROAST LEVEL</Eyebrow>
				<RoastChips bind:value={roastLevel} />
			</div>

			<div class="grid grid-cols-2 gap-2.5">
				<div>
					<Eyebrow class="mb-2">WEIGHT (G)</Eyebrow>
					<div
						class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
					>
						<input
							type="number"
							bind:value={weightGrams}
							step="1"
							min="1"
							inputmode="decimal"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
						/>
						<span class="text-muted font-mono text-[12px]">g</span>
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
						class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none focus:ring-2"
					/>
				</div>
			</div>

			<div>
				<Eyebrow class="mb-2">NOTES</Eyebrow>
				<textarea
					bind:value={notes}
					rows="3"
					class="bg-paper border-hairline text-ink-70 placeholder:text-faint focus:border-copper focus:ring-copper/25 font-display w-full resize-none rounded-[14px] border px-3.5 py-3.5 text-[15px] leading-[1.45] italic transition outline-none focus:ring-2"
				></textarea>
			</div>

			{#if error}
				<div class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-sm">{error}</div>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="bg-copper text-paper hover:bg-copper-dk flex h-14 w-full items-center justify-center rounded-2xl text-base font-medium transition-colors disabled:opacity-50"
			>{submitting ? 'Saving…' : 'Save'}</button>
		</div>
	</form>
{/if}
