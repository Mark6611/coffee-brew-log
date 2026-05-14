<script lang="ts">
	import { goto } from '$app/navigation';
	import { addBrew } from '$lib/db/repository';
	import { BrewSchema } from '$lib/db/types';

	type Method = 'espresso' | 'pour-over';

	let method = $state<Method>('espresso');
	let coffeeName = $state('');
	let doseGrams = $state<number | null>(null);
	let yieldGrams = $state<number | null>(null);
	let waterGrams = $state<number | null>(null);
	let waterTempC = $state<number | null>(null);
	let brewTimeSeconds = $state<number | null>(null);
	let brewMinutes = $state<number | null>(null);
	let brewSecondsPart = $state<number | null>(null);
	let grindSetting = $state('');
	let notes = $state('');
	let rating = $state<number | null>(null);
	let balance = $state<'' | 'light' | 'balanced' | 'heavy'>('');
	let brewedAtLocal = $state(localDatetimeNow());
	let error = $state<string | null>(null);
	let submitting = $state(false);

	function localDatetimeNow(): string {
		const now = new Date();
		const tz = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - tz).toISOString().slice(0, 16);
	}

	function applyRatio(target: number) {
		if (doseGrams && doseGrams > 0) {
			waterGrams = Math.round(doseGrams * target);
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;

		try {
			const totalBrewSeconds =
				method === 'espresso'
					? (brewTimeSeconds ?? NaN)
					: (brewMinutes ?? 0) * 60 + (brewSecondsPart ?? 0);

			const base = {
				id: crypto.randomUUID(),
				brewedAt: new Date(brewedAtLocal).toISOString(),
				coffeeName: coffeeName.trim() || undefined,
				doseGrams: doseGrams ?? NaN,
				brewTimeSeconds: totalBrewSeconds,
				grindSetting: grindSetting.trim(),
				notes: notes.trim() || undefined,
				rating: rating ?? undefined,
				balance: balance || undefined
			};

			const candidate =
				method === 'espresso'
					? { ...base, method: 'espresso' as const, yieldGrams: yieldGrams ?? NaN }
					: {
							...base,
							method: 'pour-over' as const,
							waterGrams: waterGrams ?? NaN,
							waterTempC: waterTempC ?? undefined
						};

			const brew = BrewSchema.parse(candidate);
			await addBrew(brew);
			await goto('/brews');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Log a brew</title>
</svelte:head>

<form onsubmit={handleSubmit} class="mx-auto max-w-xl space-y-6 p-6">
	<h1 class="text-2xl font-bold text-amber-700">Log a brew</h1>

	<fieldset>
		<legend class="mb-2 text-sm font-medium">Method</legend>
		<div class="flex gap-4">
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={method} value="espresso" /> Espresso
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={method} value="pour-over" /> Pour-over
			</label>
		</div>
	</fieldset>

	<label class="block">
		<span class="mb-1 block text-sm font-medium">Brewed at</span>
		<input
			type="datetime-local"
			bind:value={brewedAtLocal}
			required
			class="w-full rounded border-gray-300"
		/>
	</label>

	<label class="block">
		<span class="mb-1 block text-sm font-medium">Coffee (optional)</span>
		<input
			type="text"
			bind:value={coffeeName}
			placeholder="e.g. Onyx Monarch"
			class="w-full rounded border-gray-300"
		/>
	</label>

	<label class="block">
		<span class="mb-1 block text-sm font-medium">Dose (g)</span>
		<input
			type="number"
			bind:value={doseGrams}
			step="0.1"
			min="0.1"
			required
			class="w-full rounded border-gray-300"
		/>
	</label>

	{#if method === 'espresso'}
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Yield (g)</span>
			<input
				type="number"
				bind:value={yieldGrams}
				step="0.1"
				min="0.1"
				required
				class="w-full rounded border-gray-300"
			/>
		</label>
	{:else}
		<div class="space-y-2">
			<label class="block">
				<span class="mb-1 block text-sm font-medium">Water (g)</span>
				<input
					type="number"
					bind:value={waterGrams}
					step="1"
					min="1"
					required
					class="w-full rounded border-gray-300"
				/>
			</label>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={() => applyRatio(15)}
					class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-amber-50"
				>
					1:15
				</button>
				<button
					type="button"
					onclick={() => applyRatio(16)}
					class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-amber-50"
				>
					1:16
				</button>
				<button
					type="button"
					onclick={() => applyRatio(17)}
					class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-amber-50"
				>
					1:17
				</button>
			</div>
		</div>
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Water temp °C (optional)</span>
			<input
				type="number"
				bind:value={waterTempC}
				step="1"
				min="1"
				max="100"
				class="w-full rounded border-gray-300"
			/>
		</label>
	{/if}

	{#if method === 'espresso'}
		<label class="block">
			<span class="mb-1 block text-sm font-medium">Brew time (seconds)</span>
			<input
				type="number"
				bind:value={brewTimeSeconds}
				step="1"
				min="1"
				required
				class="w-full rounded border-gray-300"
			/>
		</label>
	{:else}
		<fieldset>
			<legend class="mb-1 block text-sm font-medium">Brew time</legend>
			<div class="flex items-center gap-2">
				<input
					type="number"
					bind:value={brewMinutes}
					step="1"
					min="0"
					placeholder="min"
					class="w-24 rounded border-gray-300"
				/>
				<span class="text-gray-500">:</span>
				<input
					type="number"
					bind:value={brewSecondsPart}
					step="1"
					min="0"
					max="59"
					placeholder="sec"
					class="w-24 rounded border-gray-300"
				/>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
				<span class="text-gray-600">min</span>
				{#each [1, 2, 3, 4, 5] as m}
					<button
						type="button"
						onclick={() => (brewMinutes = m)}
						class="rounded border border-gray-300 px-3 py-1 hover:bg-amber-50"
					>
						{m}
					</button>
				{/each}
			</div>
			<div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
				<span class="text-gray-600">sec</span>
				{#each [0, 10, 20, 30, 40, 50] as s}
					<button
						type="button"
						onclick={() => (brewSecondsPart = s)}
						class="rounded border border-gray-300 px-3 py-1 hover:bg-amber-50"
					>
						{s}
					</button>
				{/each}
			</div>
		</fieldset>
	{/if}

	<label class="block">
		<span class="mb-1 block text-sm font-medium">
			Grind setting ({method === 'espresso' ? 'Lagom Casa' : 'Fellow Ode 2'})
		</span>
		<input
			type="text"
			bind:value={grindSetting}
			required
			placeholder={method === 'espresso' ? 'e.g. 1.3' : 'e.g. 5.5'}
			class="w-full rounded border-gray-300"
		/>
	</label>

	<label class="block">
		<span class="mb-1 block text-sm font-medium">Rating (1–5, optional)</span>
		<input
			type="number"
			bind:value={rating}
			min="1"
			max="5"
			step="1"
			class="w-full rounded border-gray-300"
		/>
	</label>

	<fieldset>
		<legend class="mb-2 text-sm font-medium">Balance (optional)</legend>
		<div class="flex flex-wrap gap-3">
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={balance} value="" /> —
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={balance} value="light" /> Light
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={balance} value="balanced" /> Balanced
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" bind:group={balance} value="heavy" /> Heavy
			</label>
		</div>
	</fieldset>

	<label class="block">
		<span class="mb-1 block text-sm font-medium">Notes (optional)</span>
		<textarea bind:value={notes} rows="3" class="w-full rounded border-gray-300"></textarea>
	</label>

	{#if error}
		<div class="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
	{/if}

	<div class="flex gap-2">
		<button
			type="submit"
			disabled={submitting}
			class="rounded bg-amber-700 px-4 py-2 text-white hover:bg-amber-800 disabled:opacity-50"
		>
			{submitting ? 'Saving…' : 'Save brew'}
		</button>
		<a href="/brews" class="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50">Cancel</a>
	</div>
</form>
