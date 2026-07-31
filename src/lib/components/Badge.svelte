<script lang="ts">
	import type { Snippet } from 'svelte';
	type Tone = 'default' | 'success' | 'warning';
	let { children, tone = 'default' }: { children: Snippet; tone?: Tone } = $props();

	const styles: Record<Tone, string> = {
		default: 'bg-copper-lt text-copper-dk',
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/15 text-warning-dk'
	};
</script>

<span
	class="inline-flex h-[22px] items-center rounded-full px-3 font-mono text-eyebrow font-medium tracking-[0.12em] uppercase {styles[
		tone
	]}">{@render children()}</span
>
