<script lang="ts">
	// iOS-style bottom action sheet for destructive confirmations. Singleton,
	// mounted once in +layout.svelte, driven by confirm.svelte.ts. The browser's
	// window.confirm gave us focus trapping, Escape, and scroll lock for free —
	// an in-page sheet has to provide all three itself or it is a downgrade
	// wearing better clothes.
	import { afterNavigate } from '$app/navigation';
	import { confirmStore } from '$lib/confirm.svelte';
	import { motion } from '$lib/motion.svelte';
	import { fade, fly } from 'svelte/transition';
	import Button from './Button.svelte';

	const req = $derived(confirmStore.pending);
	let sheetEl = $state<HTMLElement | null>(null);

	// window.confirm could never outlive its page; this sheet can (it lives in
	// the layout, outside the routed content). Browser Back / iOS edge-swipe
	// while a sheet is up would otherwise leave a zombie destructive dialog —
	// with the body scroll lock — floating over the new page. Settling false
	// takes the stranded handler down its cancel path, restoring its guards.
	afterNavigate(() => confirmStore.settle(false));

	// The whole sheet ignores activation for its first beat, like a presenting
	// UIAlertController. A double-tap on the trigger otherwise lands its second
	// tap on whatever mounted under the finger — measured: the fly-in puts the
	// DESTRUCTIVE verb button right where the trigger was, so a double-tap
	// would instantly confirm the action it was meant to merely request (and a
	// tap that hit the scrim instead would self-cancel the sheet).
	function armed(): boolean {
		return !!req && performance.now() - req.openedAt >= 250;
	}
	function onVerb() {
		if (armed()) confirmStore.settle(true);
	}
	function onCancel() {
		if (armed()) confirmStore.settle(false);
	}

	// Body scroll lock while presented.
	$effect(() => {
		if (!req) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	});

	// Focus the sheet on present; trap Tab inside it; Escape cancels.
	$effect(() => {
		if (!req || !sheetEl) return;
		const el = sheetEl;
		el.focus();
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				confirmStore.settle(false);
				return;
			}
			if (e.key !== 'Tab') return;
			const focusables = el.querySelectorAll<HTMLElement>(
				'button, [href], [tabindex]:not([tabindex="-1"])'
			);
			if (!focusables.length) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			const active = document.activeElement;
			// `active === el` is the guaranteed initial state (el.focus() above;
			// the container's tabindex="-1" excludes it from the query). Without
			// these branches a first Shift+Tab walks backwards OUT of the modal
			// into the page behind the scrim, killing the trap and Escape with it.
			if (e.shiftKey && (active === first || active === el)) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && (active === last || active === el)) {
				e.preventDefault();
				first.focus();
			}
		}
		el.addEventListener('keydown', onKey);
		return () => el.removeEventListener('keydown', onKey);
	});
</script>

{#if req}
	<!-- Scrim above the copper edit-mode bar (z-[100]). Decorative dismiss
	     surface: keyboard users cancel via Escape (handled on the sheet), and
	     assistive tech interacts with the alertdialog — so no key handler here. -->
	<div
		class="fixed inset-0 z-[101] bg-ink/40"
		transition:fade={motion({ duration: 150 })}
		onclick={onCancel}
		aria-hidden="true"
	></div>
	<div
		bind:this={sheetEl}
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-body"
		tabindex="-1"
		class="fixed inset-x-3 z-[102] rounded-card-lg border border-hairline bg-surface p-5 shadow-[0_18px_50px_rgba(28,24,20,0.25)] outline-none"
		style="bottom: calc(12px + env(safe-area-inset-bottom, 0px))"
		transition:fly={motion({ y: 24, duration: 200 })}
	>
		<h2
			id="confirm-title"
			class="font-display text-[calc(var(--dt-base)*20/17)] leading-[1.25] font-medium text-ink"
		>
			{req.title}
		</h2>
		<p id="confirm-body" class="mt-2 text-[calc(var(--dt-base)*14/17)] leading-[1.5] text-muted">
			{req.body}
		</p>
		<div class="mt-5 flex flex-col gap-2">
			<Button
				size="large"
				variant={req.destructive ? 'destructive' : 'prominent'}
				full
				class={req.destructive ? 'border border-danger/35 bg-danger/8' : ''}
				onclick={onVerb}>{req.verb}</Button
			>
			<Button size="large" variant="bordered" full onclick={onCancel}>{req.cancelLabel}</Button>
		</div>
	</div>
{/if}
