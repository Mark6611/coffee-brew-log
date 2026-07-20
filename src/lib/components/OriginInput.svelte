<script lang="ts">
	import { fade } from 'svelte/transition';
	import { resolveOrigin, type ResolvedOrigin } from '$lib/origin/resolve';
	import OriginFlag from './OriginFlag.svelte';

	let { value = $bindable('') }: { value?: string } = $props();
	let resolved = $state<ResolvedOrigin | null>(null);
	// Plain `let` (not `$state`) so it doesn't track in the effect — used only
	// to skip the 300ms debounce on the very first run. Without this guard, the
	// edit form flickers "no match" for ~300ms before showing the matched flag
	// when an existing bag with a known origin is opened.
	let firstRun = true;

	$effect(() => {
		const current = value;
		if (!current) {
			resolved = null;
			firstRun = false;
			return;
		}
		if (firstRun) {
			firstRun = false;
			resolved = resolveOrigin(current);
			return;
		}
		const timer = setTimeout(() => {
			resolved = resolveOrigin(current);
		}, 300);
		return () => clearTimeout(timer);
	});
</script>

<div
	class="flex h-12 w-full items-center rounded-[14px] border bg-paper transition-all duration-200 {resolved
		? 'border-copper ring-[3px] ring-copper/[0.18]'
		: 'border-hairline focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/25'}"
>
	{#if resolved}
		<div
			class="flex h-full items-center border-r border-hairline px-3"
			transition:fade={{ duration: 180 }}
		>
			<OriginFlag code={resolved.code} country={resolved.country} />
		</div>
	{/if}
	<input
		type="text"
		bind:value
		placeholder="e.g. Ethiopia"
		class="h-full min-w-0 flex-1 bg-transparent px-3.5 text-ink outline-none placeholder:text-faint"
	/>
	{#if resolved}
		<span
			class="pr-3.5 font-mono text-[12px] font-medium tracking-[0.14em] text-copper"
			transition:fade={{ duration: 180 }}>{resolved.code}</span
		>
	{/if}
</div>
<p class="mt-1.5 text-[12px] {resolved ? 'text-copper-dk' : 'text-faint'}" aria-live="polite">
	{#if resolved}
		Matched <strong class="font-medium">{resolved.country}</strong> for the flag indicator.
	{:else if value}
		Free text — no flag if origin isn't recognized.
	{:else}
		e.g. Ethiopia · Yirgacheffe · Brazil Cerrado
	{/if}
</p>
