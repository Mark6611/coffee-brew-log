<script lang="ts">
	import { onDestroy } from 'svelte';
	import { scale, connectScale, disconnectScale, tareScale, onWeight, onScaleButton } from '$lib/scale/scale.svelte';
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
	<p class="text-faint mt-1 text-[11.5px]">
		Live Acaia assist is available in the iOS app.
	</p>
{:else}
	<div class="border-hairline bg-surface mt-1 rounded-[14px] border p-3">
		{#if scale.status === 'idle' || scale.status === 'disconnected'}
			<button
				type="button"
				onclick={() => connectScale()}
				class="text-copper-dk flex w-full items-center justify-center gap-2 font-mono text-[11px] font-medium tracking-[0.1em] uppercase"
			>
				<svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M6 5l6 8-3 2V2l3 2-6 8" />
				</svg>
				Connect Acaia scale
			</button>
			{#if scale.error}
				<p class="text-danger mt-2 text-center text-[11px]">{scale.error}</p>
			{/if}
		{:else if scale.status === 'scanning' || scale.status === 'connecting'}
			<p class="text-muted text-center font-mono text-[11px] tracking-[0.1em] uppercase">
				{scale.status === 'scanning' ? 'Searching for scale…' : 'Connecting…'}
			</p>
		{:else if scale.status === 'connected'}
			<!-- Header: name + battery + disconnect -->
			<div class="mb-2.5 flex items-center justify-between">
				<span class="text-copper-dk flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
					<span class="bg-success inline-block h-1.5 w-1.5 rounded-full" aria-hidden="true"></span>
					{scale.deviceName ?? 'Acaia'}
					{#if scale.batteryPct != null}· {scale.batteryPct}%{/if}
				</span>
				<button type="button" onclick={() => disconnectScale()} class="text-faint hover:text-ink text-[11px]">Disconnect</button>
			</div>

			{#if mode === 'idle' || mode === 'done'}
				<div class="flex items-center justify-between gap-3">
					<div class="font-mono">
						<span class="text-ink text-[22px] font-medium tracking-[-0.02em]">{liveWeight.toFixed(1)}</span>
						<span class="text-muted text-[12px]"> g</span>
					</div>
					<div class="flex gap-2">
						<button type="button" onclick={() => tareScale()} class="border-hairline text-muted hover:text-ink rounded-lg border px-3 py-2 text-[12px] font-medium">Tare</button>
						<button type="button" onclick={beginListening} class="bg-copper text-paper hover:bg-copper-dk rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors">
							{mode === 'done' ? 'New shot' : 'Start shot'}
						</button>
					</div>
				</div>
				{#if mode === 'done'}
					<p class="text-success mt-2 font-mono text-[10.5px] tracking-[0.1em] uppercase">
						Captured {yieldGrams}g in {brewTimeSeconds}s
					</p>
				{/if}
			{:else}
				<!-- listening / running: big live readout -->
				<div class="flex items-end justify-between gap-4">
					<div class="font-mono">
						<span class="text-copper text-[34px] font-medium leading-none tracking-[-0.03em]">{liveWeight.toFixed(1)}</span>
						<span class="text-muted text-[13px]"> g</span>
					</div>
					<div class="text-right font-mono">
						<div class="text-ink text-[20px] font-medium tracking-[-0.02em]">{elapsed.toFixed(1)}s</div>
						<div class="text-muted text-[11px]">{liveFlow.toFixed(1)} g/s</div>
					</div>
				</div>
				<div class="mt-2.5 flex items-center gap-2">
					{#if mode === 'listening'}
						<span class="text-muted flex-1 font-mono text-[10.5px] tracking-[0.1em] uppercase">Waiting for first drip…</span>
					{:else}
						<span class="text-copper flex-1 font-mono text-[10.5px] tracking-[0.1em] uppercase">Recording — auto-stops when flow settles</span>
					{/if}
					<button type="button" onclick={finish} class="bg-ink/[0.06] text-ink hover:bg-ink/[0.1] rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors">Stop</button>
				</div>
			{/if}
		{/if}
	</div>
{/if}
