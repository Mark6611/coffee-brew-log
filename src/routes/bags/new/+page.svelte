<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { addBag } from '$lib/db/repository';
	import { BagSchema, type Process } from '$lib/db/types';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	let name = $state('');
	let roaster = $state('');
	let origin = $state('');
	let roastedAt = $state('');
	let process = $state<Process | ''>('');
	let weightGrams = $state<number | null>(null);
	let pricePaid = $state<number | null>(null);
	let notes = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	onMount(() => {
		const queryName = page.url.searchParams.get('name');
		if (queryName) name = queryName;
	});

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
				weightGrams: weightGrams ?? undefined,
				pricePaid: pricePaid ?? undefined,
				notes: notes.trim() || undefined,
				createdAt: new Date().toISOString()
			};
			const bag = BagSchema.parse(candidate);
			await addBag(bag);
			await goto('/bags');
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
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/bags"
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
		<Eyebrow>NEW BAG</Eyebrow>
		<span class="h-9 w-[60px]" aria-hidden="true"></span>
	</div>

	<h1
		class="font-display text-ink mx-[22px] mt-1.5 mb-[18px] text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
	>New bag</h1>

	<div class="space-y-[18px] px-[22px]">
		<div>
			<Eyebrow class="mb-2">NAME</Eyebrow>
			<input
				type="text"
				bind:value={name}
				placeholder="e.g. Worka Sakaro"
				required
				class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
			/>
		</div>

		<div>
			<Eyebrow class="mb-2">ROASTER</Eyebrow>
			<input
				type="text"
				bind:value={roaster}
				placeholder="e.g. Sey Coffee"
				class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
			/>
		</div>

		<div>
			<Eyebrow class="mb-2">ORIGIN</Eyebrow>
			<input
				type="text"
				bind:value={origin}
				placeholder="e.g. Ethiopia"
				class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
			/>
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
						placeholder="250"
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
					placeholder="0.00"
					class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none focus:ring-2"
				/>
			</div>
		</div>

		<div>
			<Eyebrow class="mb-2">NOTES</Eyebrow>
			<textarea
				bind:value={notes}
				rows="3"
				placeholder="Taste notes from the roaster…"
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
		>{submitting ? 'Saving…' : 'Save bag'}</button>
	</div>
</form>
