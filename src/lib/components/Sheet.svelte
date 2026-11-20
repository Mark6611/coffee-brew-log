<script lang="ts">
	// A bottom sheet for reference content that can outgrow the screen: a title
	// bar that stays put and a body that scrolls. ConfirmSheet is the other
	// sheet — a question with two answers, driven by a store; this one is opened
	// by the page that owns it and only ever closes.
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { motion } from '$lib/motion.svelte';
	import Button from './Button.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import { FOCUS_RING_INSET } from './focus';
	import { lockScroll, trapFocus } from './modal';

	let {
		open = $bindable(false),
		eyebrow,
		title,
		children
	}: { open?: boolean; eyebrow?: string; title: string; children: Snippet } = $props();

	const uid = $props.id();
	let sheetEl = $state<HTMLElement | null>(null);
	let openedAt = 0;

	function close() {
		open = false;
	}
	// The scrim ignores its first beat, like ConfirmSheet: the second tap of a
	// double-tap on the trigger lands on the scrim and would close the sheet
	// before it had finished arriving.
	function onScrim() {
		if (performance.now() - openedAt >= 250) close();
	}

	// Scroll lock while presented; focus goes back to whatever opened it.
	$effect(() => {
		if (!open) return;
		openedAt = performance.now();
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const unlock = lockScroll();
		return () => {
			unlock();
			opener?.focus({ preventScroll: true });
		};
	});

	$effect(() => {
		if (!open || !sheetEl) return;
		return trapFocus(sheetEl, close);
	});
</script>

{#if open}
	<!-- Decorative dismiss surface, as in ConfirmSheet: keyboard users close
	     with Escape or the Close button, so no key handler here. -->
	<div
		class="fixed inset-0 z-[101] bg-ink/40"
		transition:fade={motion({ duration: 150 })}
		onclick={onScrim}
		aria-hidden="true"
	></div>
	<!-- Fixed to the viewport, so the body's safe-area padding never reaches it:
	     each inset is added to its own 12px gutter (CLAUDE.md, Layout). The cap
	     keeps it on the page column on iPad and desktop; the height leaves the
	     page's header row showing above it, so it reads as a sheet over the form. -->
	<div
		bind:this={sheetEl}
		role="dialog"
		aria-modal="true"
		aria-labelledby="{uid}-title"
		tabindex="-1"
		class="fixed z-[102] mx-auto flex max-w-[648px] flex-col overflow-hidden rounded-card-lg border border-hairline bg-surface shadow-[0_18px_50px_rgba(28,24,20,0.25)] outline-none"
		style="left: calc(12px + env(safe-area-inset-left, 0px)); right: calc(12px + env(safe-area-inset-right, 0px)); bottom: calc(12px + env(safe-area-inset-bottom, 0px)); max-height: calc(100dvh - 68px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))"
		transition:fly={motion({ y: 24, duration: 200 })}
	>
		<div class="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
			<div class="min-w-0">
				{#if eyebrow}<Eyebrow>{eyebrow}</Eyebrow>{/if}
				<h2
					id="{uid}-title"
					class="mt-1 font-display text-[calc(var(--dt-base)*20/17)] leading-[1.25] font-medium text-ink"
				>
					{title}
				</h2>
			</div>
			<Button size="regular" variant="bordered" iconOnly label="Close" onclick={close}>
				<svg
					width="14"
					height="14"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</Button>
		</div>
		<!-- Focusable so a keyboard can scroll it: Close was the only stop in the
		     sheet, the page behind is locked, and arrow / Page / Space keys never
		     reached this scroller. The focus trap picks it up as the last stop. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			tabindex="0"
			role="region"
			aria-label={title}
			class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 {FOCUS_RING_INSET}"
		>
			{@render children()}
		</div>
	</div>
{/if}
