<script lang="ts">
	import { onMount } from 'svelte';
	import { listBrews, deleteBrew } from '$lib/db/repository';
	import { formatRatio, formatBrewTime } from '$lib/brews/compute';
	import type { Brew } from '$lib/db/types';

	let brews = $state<Brew[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function refresh() {
		try {
			brews = await listBrews();
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	onMount(refresh);

	async function handleDelete(id: string) {
		if (!confirm('Delete this brew?')) return;
		await deleteBrew(id);
		await refresh();
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<svelte:head>
	<title>Brews</title>
</svelte:head>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-amber-700">Brews</h1>
		<a href="/brews/new" class="rounded bg-amber-700 px-4 py-2 text-white hover:bg-amber-800">
			New brew
		</a>
	</div>

	{#if loading}
		<p class="text-gray-600">Loading…</p>
	{:else if error}
		<div class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
	{:else if brews.length === 0}
		<p class="text-gray-600">
			No brews yet. <a class="text-amber-700 underline" href="/brews/new">Log your first one</a>.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each brews as brew (brew.id)}
				<li class="rounded border border-gray-200 p-4">
					<div class="flex items-start justify-between gap-2">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span
									class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900"
								>
									{brew.method}
								</span>
								{#if brew.coffeeName}
									<span class="font-medium">{brew.coffeeName}</span>
								{/if}
							</div>
							<div class="text-sm text-gray-600">{formatDate(brew.brewedAt)}</div>
							<div class="text-sm">
								{brew.doseGrams}g →
								{#if brew.method === 'espresso'}
									{brew.yieldGrams}g
								{:else}
									{brew.waterGrams}g water
								{/if}
								· {formatBrewTime(brew)} · {formatRatio(brew)} · grind {brew.grindSetting}
								{#if brew.method === 'pour-over' && brew.waterTempC}
									· {brew.waterTempC}°C
								{/if}
							</div>
							{#if brew.rating}
								<div class="text-sm">Rating: {brew.rating}/5</div>
							{/if}
							{#if brew.balance}
								<div class="text-sm">Balance: {brew.balance}</div>
							{/if}
							{#if brew.notes}
								<div class="mt-2 text-sm italic text-gray-700">"{brew.notes}"</div>
							{/if}
						</div>
						<button
							onclick={() => handleDelete(brew.id)}
							class="text-sm text-red-600 hover:underline"
						>
							Delete
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
