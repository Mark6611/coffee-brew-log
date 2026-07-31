<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		scale,
		connectScale,
		disconnectScale,
		tareScale,
		onWeight,
		onScaleButton
	} from '$lib/scale/scale.svelte';
	import { ShotTracker } from '$lib/scale/shot';

	// Live-scale assist for the espresso form. Owns the whole brew loop and
	// writes the captured values into the bound yield/time fields. On the web
	// build (no BLE) it renders a single quiet hint and nothing else.
	let {
		doseGrams,
		yieldGrams = $bindable(),
		brewTimeSeconds = $bindable()
	}: {
		doseGrams: number | null;
		yieldGrams: number | null;
		brewTimeSeconds: number | null;
	} = $props();

	type Mode = 'idle' | 'listening' | 'running' | 'done';
	let mode = $state<Mode>('idle');
	let tracker: ShotTracker | null = null;
	let unsubWeight: (() => void) | null = null;
	let unsubButton: (() => void) | null = null;
	let startWall = 0;
	let nowTick = $state(0);
	let liveFlow = $state(0);
	let ticker: ReturnType<typeof setInterval> | null = null;

	const elapsed = $derived(mode === 'running' && startWall ? (nowTick - startWall) / 1000 : 0);
	const liveWeight = $derived(scale.weightG ?? 0);

	function cleanup() {
		unsubWeight?.();
		unsubButton?.();
		unsubWeight = unsubButton = null;
		if (ticker) clearInterval(ticker);
		ticker = null;
	}
	onDestroy(cleanup);

	function beginListening() {
		void tareScale();
		tracker = new ShotTracker({ method: 'espresso', doseG: doseGrams ?? 18 });
		mode = 'listening';
		unsubWeight = onWeight((g, t) => {
			const r = tracker!.push(g, t);
			if (r.justStarted) {
				mode = 'running';
				startWall = Date.now();
				ticker = setInterval(() => (nowTick = Date.now()), 100);
			}
			if (mode === 'running') {
				yieldGrams = tracker!.yieldG;
				brewTimeSeconds = Math.round(tracker!.elapsedS);
				liveFlow = tracker!.flowRate;
			}
			if (r.justEnded) finish();
		});
		// The scale's own timer buttons should drive the same loop.
		unsubButton = onScaleButton((action) => {
			if (action === 'stop' && mode === 'running') finish();
			if (action === 'reset') redo();
		});
	}

	function finish() {
		if (tracker) {
			yieldGrams = tracker.yieldG;
			brewTimeSeconds = Math.round(tracker.elapsedS);
		}
		mode = 'done';
		cleanup();
	}

	function redo() {
		cleanup();
		mode = 'idle';
		tracker = null;
	}
</script>

{#if scale.status === 'unsupported'}
	<!-- Scale feature disabled for 1.0 (see scale.svelte.ts) — render nothing. -->
{:else}
	<div class="mt-1 rounded-[14px] border border-hairline bg-surface p-3">
		{#if scale.status === 'idle' || scale.status === 'disconnected'}
			<button
				type="button"
				onclick={() => connectScale()}
				class="press flex w-full items-center justify-center gap-2 font-mono text-[11px] font-medium tracking-[0.1em] text-copper-dk uppercase"
			>
				<svg
					width="15"
					height="15"
					viewBox="0 0 18 18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M6 5l6 8-3 2V2l3 2-6 8" />
				</svg>
				Connect Acaia scale
			</button>
			{#if scale.error}
				<p class="mt-2 text-center text-[11px] text-danger">{scale.error}</p>
			{/if}
		{:else if scale.status === 'scanning' || scale.status === 'connecting'}
			<p class="text-center font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
				{scale.status === 'scanning' ? 'Searching for scale…' : 'Connecting…'}
			</p>
		{:else if scale.status === 'connected'}
			<!-- Header: name + battery + disconnect -->
			<div class="mb-2.5 flex items-center justify-between">
				<span
					class="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.12em] text-copper-dk uppercase"
				>
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true"></span>
					{scale.deviceName ?? 'Acaia'}
					{#if scale.batteryPct != null}· {scale.batteryPct}%{/if}
				</span>
				<button
					type="button"
					onclick={() => disconnectScale()}
					class="text-[11px] text-muted hover:text-ink">Disconnect</button
				>
			</div>

			{#if mode === 'idle' || mode === 'done'}
				<div class="flex items-center justify-between gap-3">
					<div class="font-mono">
						<span class="text-[22px] font-medium tracking-[-0.02em] text-ink"
							>{liveWeight.toFixed(1)}</span
						>
						<span class="text-[12px] text-muted"> g</span>
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => tareScale()}
							class="press-sm rounded-lg border border-hairline px-3 py-2 text-[12px] font-medium text-muted hover:text-ink"
							>Tare</button
						>
						<button
							type="button"
							onclick={beginListening}
							class="press-sm rounded-lg bg-copper px-3.5 py-2 text-[12px] font-medium text-paper hover:bg-copper-dk"
						>
							{mode === 'done' ? 'New shot' : 'Start shot'}
						</button>
					</div>
				</div>
				{#if mode === 'done'}
					<p class="mt-2 font-mono text-[10.5px] tracking-[0.1em] text-success uppercase">
						Captured {yieldGrams}g in {brewTimeSeconds}s
					</p>
				{/if}
			{:else}
				<!-- listening / running: big live readout -->
				<div class="flex items-end justify-between gap-4">
					<div class="font-mono">
						<span class="text-[34px] leading-none font-medium tracking-[-0.03em] text-copper"
							>{liveWeight.toFixed(1)}</span
						>
						<span class="text-[13px] text-muted"> g</span>
					</div>
					<div class="text-right font-mono">
						<div class="text-[20px] font-medium tracking-[-0.02em] text-ink">
							{elapsed.toFixed(1)}s
						</div>
						<div class="text-[11px] text-muted">{liveFlow.toFixed(1)} g/s</div>
					</div>
				</div>
				<div class="mt-2.5 flex items-center gap-2">
					{#if mode === 'listening'}
						<span class="flex-1 font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase"
							>Waiting for first drip…</span
						>
					{:else}
						<span class="flex-1 font-mono text-[10.5px] tracking-[0.1em] text-copper uppercase"
							>Recording — auto-stops when flow settles</span
						>
					{/if}
					<button
						type="button"
						onclick={finish}
						class="press-sm rounded-lg bg-ink/[0.06] px-3.5 py-2 text-[12px] font-medium text-ink hover:bg-ink/[0.1]"
						>Stop</button
					>
				</div>
			{/if}
		{/if}
	</div>
{/if}
