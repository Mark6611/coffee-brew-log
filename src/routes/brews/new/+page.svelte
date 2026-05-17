<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { addBrew, listBrews, listBags } from '$lib/db/repository';
	import { BrewSchema, type Bag } from '$lib/db/types';
	import MethodPicker from '$lib/components/MethodPicker.svelte';
	import BagPicker from '$lib/components/BagPicker.svelte';
	import Chip from '$lib/components/Chip.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	type Method = 'espresso' | 'pour-over';
	type Balance = '' | 'light' | 'balanced' | 'heavy';

	const DRAFT_KEY = 'brew-form-draft';

	let method = $state<Method>('espresso');
	let bagId = $state<string | undefined>(undefined);
	let allBags = $state<Bag[]>([]);
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
	let balance = $state<Balance>('');
	let brewedAtLocal = $state(localDatetimeNow());
	let error = $state<string | null>(null);
	let submitting = $state(false);
	let brewCount = $state(0);

	const selectedBag = $derived(allBags.find((b) => b.id === bagId) ?? null);

	onMount(async () => {
		// Restore draft first (so URL bagId can override)
		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (raw) {
			try {
				const d = JSON.parse(raw);
				method = d.method ?? method;
				bagId = d.bagId ?? bagId;
				doseGrams = d.doseGrams ?? doseGrams;
				yieldGrams = d.yieldGrams ?? yieldGrams;
				waterGrams = d.waterGrams ?? waterGrams;
				waterTempC = d.waterTempC ?? waterTempC;
				brewTimeSeconds = d.brewTimeSeconds ?? brewTimeSeconds;
				brewMinutes = d.brewMinutes ?? brewMinutes;
				brewSecondsPart = d.brewSecondsPart ?? brewSecondsPart;
				grindSetting = d.grindSetting ?? grindSetting;
				notes = d.notes ?? notes;
				rating = d.rating ?? rating;
				balance = d.balance ?? balance;
				if (d.brewedAtLocal) brewedAtLocal = d.brewedAtLocal;
			} catch {}
			sessionStorage.removeItem(DRAFT_KEY);
		}

		// URL ?bagId= overrides (after returning from /bags/new)
		const urlBagId = page.url.searchParams.get('bagId');
		if (urlBagId) bagId = urlBagId;

		[allBags, brewCount] = await Promise.all([
			listBags(),
			listBrews().then((all) => all.length)
		]);
	});

	function saveDraft() {
		const draft = {
			method,
			bagId,
			doseGrams,
			yieldGrams,
			waterGrams,
			waterTempC,
			brewTimeSeconds,
			brewMinutes,
			brewSecondsPart,
			grindSetting,
			notes,
			rating,
			balance,
			brewedAtLocal
		};
		sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}

	function handleCreateNewBag(name: string) {
		saveDraft();
		goto(`/bags/new?name=${encodeURIComponent(name)}&returnTo=/brews/new`);
	}

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

	function applyTimeSeconds(total: number) {
		brewMinutes = Math.floor(total / 60);
		brewSecondsPart = total % 60;
	}

	const actualRatio = $derived.by(() => {
		if (!doseGrams || doseGrams <= 0) return null;
		if (method === 'pour-over' && waterGrams) return waterGrams / doseGrams;
		if (method === 'espresso' && yieldGrams) return yieldGrams / doseGrams;
		return null;
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		submitting = true;

		try {
			if (!selectedBag) {
				throw new Error('Pick or create a bag for this brew.');
			}

			const totalBrewSeconds =
				method === 'espresso'
					? (brewTimeSeconds ?? NaN)
					: (brewMinutes ?? 0) * 60 + (brewSecondsPart ?? 0);

			const base = {
				id: crypto.randomUUID(),
				brewedAt: new Date(brewedAtLocal).toISOString(),
				bagId: selectedBag.id,
				coffeeName: selectedBag.name,
				roaster: selectedBag.roaster,
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
	<title>New brew</title>
</svelte:head>

<form onsubmit={handleSubmit} class="mx-auto max-w-2xl pb-20">
	<!-- Header row -->
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/brews"
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
		<Eyebrow>BREW #{brewCount + 1}</Eyebrow>
		<span class="h-9 w-[60px]" aria-hidden="true"></span>
	</div>

	<h1
		class="font-display text-ink mx-[22px] mt-1.5 mb-[18px] text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
	>New brew</h1>

	<div class="space-y-[18px] px-[22px]">
		<!-- Method -->
		<div>
			<Eyebrow class="mb-2">METHOD</Eyebrow>
			<MethodPicker bind:value={method} />
		</div>

		<!-- Brewed at -->
		<div>
			<Eyebrow class="mb-2">BREWED AT</Eyebrow>
			<input
				type="datetime-local"
				bind:value={brewedAtLocal}
				required
				class="bg-paper border-hairline text-ink focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
			/>
		</div>

		<!-- Coffee (bag) -->
		<div>
			<Eyebrow class="mb-2">COFFEE</Eyebrow>
			<BagPicker bind:bagId oncreatenew={handleCreateNewBag} />
		</div>

		<!-- Dose + Yield/Water (big mono fields) -->
		<div class="grid grid-cols-2 gap-2.5">
			<div>
				<Eyebrow class="mb-2">DOSE</Eyebrow>
				<div
					class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
				>
					<input
						type="number"
						bind:value={doseGrams}
						step="0.1"
						min="0.1"
						required
						inputmode="decimal"
						placeholder="0.0"
						class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
					/>
					<span class="text-muted font-mono text-[13px]">g</span>
				</div>
			</div>
			<div>
				<Eyebrow class="mb-2">{method === 'espresso' ? 'YIELD' : 'WATER'}</Eyebrow>
				<div
					class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
				>
					{#if method === 'espresso'}
						<input
							type="number"
							bind:value={yieldGrams}
							step="0.1"
							min="0.1"
							required
							inputmode="decimal"
							placeholder="0.0"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
						/>
					{:else}
						<input
							type="number"
							bind:value={waterGrams}
							step="1"
							min="1"
							required
							inputmode="decimal"
							placeholder="0"
							class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
						/>
					{/if}
					<span class="text-muted font-mono text-[13px]">g</span>
				</div>
			</div>
		</div>

		<!-- Ratio quick-pick (pour-over only) -->
		{#if method === 'pour-over'}
			<div>
				<Eyebrow class="mb-2">RATIO · QUICK</Eyebrow>
				<div class="flex flex-wrap items-center gap-2">
					{#each [15, 16, 17, 18] as r (r)}
						<Chip onclick={() => applyRatio(r)}>1:{r}</Chip>
					{/each}
					{#if actualRatio !== null}
						<span
							class="bg-copper-lt text-copper inline-flex h-9 items-center rounded-full px-2.5 font-mono text-[12px] tracking-[-0.01em]"
						>= 1:{actualRatio.toFixed(1)} actual</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Grind -->
		<div>
			<Eyebrow class="mb-2">
				GRIND · {method === 'espresso' ? 'LAGOM CASA' : 'FELLOW ODE 2'}
			</Eyebrow>
			<input
				type="text"
				bind:value={grindSetting}
				required
				placeholder={method === 'espresso' ? 'e.g. 1.3' : 'e.g. 5.5'}
				class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 font-mono transition outline-none focus:ring-2"
			/>
		</div>

		<!-- Water temp (pour-over only) -->
		{#if method === 'pour-over'}
			<div>
				<Eyebrow class="mb-2">WATER TEMP (OPTIONAL)</Eyebrow>
				<div
					class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
				>
					<input
						type="number"
						bind:value={waterTempC}
						step="1"
						min="1"
						max="100"
						inputmode="numeric"
						placeholder="0"
						class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
					/>
					<span class="text-muted font-mono text-[12px]">°C</span>
				</div>
			</div>
		{/if}

		<!-- Brew time -->
		<div>
			<Eyebrow class="mb-2">BREW TIME</Eyebrow>
			{#if method === 'espresso'}
				<div
					class="field-wrapper bg-surface border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-14 items-center gap-1.5 rounded-[14px] border px-4 transition focus-within:ring-2"
				>
					<input
						type="number"
						bind:value={brewTimeSeconds}
						step="1"
						min="1"
						required
						inputmode="numeric"
						placeholder="0"
						class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-2xl font-medium tracking-[-0.02em]"
					/>
					<span class="text-muted font-mono text-[13px]">sec</span>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-2.5">
					<div>
						<div
							class="text-muted mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
						>MIN</div>
						<input
							type="number"
							bind:value={brewMinutes}
							step="1"
							min="0"
							inputmode="numeric"
							placeholder="0"
							class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-14 w-full rounded-[14px] border px-4 font-mono text-2xl font-medium tracking-[-0.02em] transition outline-none focus:ring-2"
						/>
					</div>
					<div>
						<div
							class="text-muted mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em]"
						>SEC</div>
						<input
							type="number"
							bind:value={brewSecondsPart}
							step="1"
							min="0"
							max="59"
							inputmode="numeric"
							placeholder="0"
							class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-14 w-full rounded-[14px] border px-4 font-mono text-2xl font-medium tracking-[-0.02em] transition outline-none focus:ring-2"
						/>
					</div>
				</div>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each [150, 165, 180, 195, 210, 240] as s (s)}
						<Chip onclick={() => applyTimeSeconds(s)}>
							{Math.floor(s / 60)}:{(s % 60).toString().padStart(2, '0')}
						</Chip>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Rating -->
		<div>
			<Eyebrow class="mb-2">RATING (1–5, OPTIONAL)</Eyebrow>
			<div
				class="field-wrapper bg-paper border-hairline focus-within:border-copper focus-within:ring-copper/25 flex h-12 items-center gap-1.5 rounded-[14px] border px-3.5 transition focus-within:ring-2"
			>
				<input
					type="number"
					bind:value={rating}
					step="0.1"
					min="1"
					max="5"
					inputmode="decimal"
					placeholder="0.0"
					class="text-ink placeholder:text-faint min-w-0 flex-1 font-mono text-[16px] tracking-[-0.01em]"
				/>
				<span class="text-muted font-mono text-[12px]">/ 5</span>
			</div>
		</div>

		<!-- Balance -->
		<div>
			<Eyebrow class="mb-2">BALANCE (OPTIONAL)</Eyebrow>
			<div class="flex flex-wrap gap-2">
				<Chip active={balance === ''} onclick={() => (balance = '')}>—</Chip>
				<Chip active={balance === 'light'} onclick={() => (balance = 'light')}>Light</Chip>
				<Chip active={balance === 'balanced'} onclick={() => (balance = 'balanced')}>Balanced</Chip>
				<Chip active={balance === 'heavy'} onclick={() => (balance = 'heavy')}>Heavy</Chip>
			</div>
		</div>

		<!-- Notes -->
		<div>
			<Eyebrow class="mb-2">NOTES</Eyebrow>
			<textarea
				bind:value={notes}
				rows="3"
				placeholder="Stone fruit, jasmine on cool-down…"
				class="bg-paper border-hairline text-ink-70 placeholder:text-faint focus:border-copper focus:ring-copper/25 font-display w-full resize-none rounded-[14px] border px-3.5 py-3.5 text-[15px] leading-[1.45] italic transition outline-none focus:ring-2"
			></textarea>
		</div>

		{#if error}
			<div
				class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-sm"
			>{error}</div>
		{/if}

		<!-- Save button at bottom -->
		<button
			type="submit"
			disabled={submitting}
			class="bg-copper text-paper hover:bg-copper-dk flex h-14 w-full items-center justify-center rounded-2xl text-base font-medium transition-colors disabled:opacity-50"
		>{submitting ? 'Saving…' : 'Save brew'}</button>
	</div>
</form>
