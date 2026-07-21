<script lang="ts">
	import { resolveOrigins } from '$lib/origin/resolve';
	import OriginFlag from './OriginFlag.svelte';

	// Renders every flag a (possibly blended) origin resolves to. Drop-in for the
	// old single <OriginFlag> at any display site — a single-origin bag shows one
	// flag exactly as before; a blend shows each country's flag in order.
	let { origin, max = 4 }: { origin: string | null | undefined; max?: number } = $props();

	const flags = $derived(resolveOrigins(origin));
</script>

{#each flags.slice(0, max) as f (f.code)}<OriginFlag code={f.code} country={f.country} />{/each}
