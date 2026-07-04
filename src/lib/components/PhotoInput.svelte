<script lang="ts">
	import { fileToPhoto } from '$lib/photo/resize';

	// Capture/replace/remove a single inline photo (data URL). Bindable so the
	// parent form owns the value. On iOS the file picker offers Take Photo /
	// Photo Library (no `capture` attr, so the user can pick either). Decoding +
	// downscaling happens here; the parent just stores the resulting string.
	let {
		photo = $bindable(),
		label = 'Photo'
	}: {
		photo: string | null | undefined;
		label?: string;
	} = $props();

	let input = $state<HTMLInputElement | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);

	function pick() {
		error = null;
		input?.click();
	}

	async function onFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		busy = true;
		error = null;
		try {
			const data = await fileToPhoto(file);
			if (data) photo = data;
			else error = "That file isn't a readable image.";
		} catch {
			error = "Couldn't process that photo.";
		} finally {
			busy = false;
			// Allow re-selecting the same file later.
			if (input) input.value = '';
		}
	}

	function remove() {
		// null (not undefined) so the upsert clears the server column.
		photo = null;
		error = null;
	}
</script>

<div>
	<input
		bind:this={input}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={onFile}
	/>

	{#if photo}
		<div class="border-hairline bg-surface relative overflow-hidden rounded-2xl border">
			<!-- svelte-ignore a11y_img_redundant_alt -->
			<img src={photo} alt="{label} photo" class="max-h-[220px] w-full object-cover" />
			<div class="absolute right-2 top-2 flex gap-1.5">
				<button
					type="button"
					onclick={pick}
					class="bg-ink/55 text-paper hover:bg-ink/70 grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition-colors"
					aria-label="Replace {label.toLowerCase()}"
					title="Replace"
				>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
						<path d="M13.5 2.5V5H11" />
					</svg>
				</button>
				<button
					type="button"
					onclick={remove}
					class="bg-ink/55 text-paper hover:bg-danger grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition-colors"
					aria-label="Remove {label.toLowerCase()}"
					title="Remove"
				>
					<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 4l8 8M12 4l-8 8" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			onclick={pick}
			disabled={busy}
			class="border-rule text-muted hover:border-copper hover:text-copper-dk flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-6 transition-colors disabled:opacity-60"
		>
			{#if busy}
				<span class="font-mono text-[11px] tracking-[0.1em] uppercase">Processing…</span>
			{:else}
				<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<rect x="2.5" y="4.5" width="15" height="12" rx="2.5" />
					<circle cx="10" cy="10.5" r="3" />
					<path d="M6.5 4.5l1-1.8h5l1 1.8" />
				</svg>
				<span class="text-[13px] font-medium">Add {label.toLowerCase()}</span>
			{/if}
		</button>
	{/if}

	{#if error}
		<p class="text-danger mt-1.5 text-[11.5px]">{error}</p>
	{/if}
</div>
