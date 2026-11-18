<script lang="ts">
	import '@fontsource-variable/newsreader/index.css';
	import '@fontsource-variable/newsreader/wght-italic.css';
	import '@fontsource-variable/geist/index.css';
	import '@fontsource-variable/geist-mono/index.css';
	import './layout.css';

	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { rm } from '$lib/motion.svelte';
	import { page } from '$app/state';
	import { hapticTick, hideSplash, isNative, watchHinge } from '$lib/native';
	import { applyHingeState } from '$lib/hinge';
	import { navDirection, navMotion, shouldAnimateNav, wantsLightHaptic } from '$lib/navMotion';
	import { theme } from '$lib/theme.svelte';
	import { storage } from '$lib/storage.svelte';
	import { runCloudSync } from '$lib/cloudSync';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import PwaUpdatePrompt from '$lib/components/PwaUpdatePrompt.svelte';

	let { children } = $props();

	// The incoming screen eases in from the direction of travel: from the right
	// going deeper, from the left going back up ($lib/navMotion has the rule, the
	// motion, and why it is `left`, not a transform). afterNavigate runs once the new page is
	// in the DOM and before it paints, so the screen is live from its first frame.
	let pageEl = $state<HTMLDivElement>();
	afterNavigate((navigation) => {
		if (navigation.type === 'enter') return; // first paint: the splash fade owns it
		const from = navigation.from?.url.pathname;
		const to = navigation.to?.url.pathname;
		if (!shouldAnimateNav(from, to)) return;
		const delta = navigation.type === 'popstate' ? navigation.delta : undefined;
		const move = navMotion(navDirection(navigation.type, delta, from, to), rm());
		if (move && typeof pageEl?.animate === 'function') {
			pageEl.animate(move.keyframes, move.options);
		}
	});

	onMount(() => {
		// Applies the stored preference and starts following the OS in System
		// mode. Preference edits live in Settings → Appearance.
		const stopTheme = theme.init();
		// App has painted with the right theme — fade the native splash out.
		void hideSplash();
		// iPhone Duo: the page column fills every display, unfolded too
		// (layout.css, html[data-foldable]; why: $lib/hinge).
		void watchHinge((state) => applyHingeState(document.documentElement, state));

		// Ask the browser to make IndexedDB persistent. On the web it is the only
		// copy of the data; native has iCloud behind it but eviction still costs
		// the local cache. The answer is recorded, not discarded — Settings warns
		// when it comes back false.
		void storage.requestPersistence();

		// Native: sync with iCloud on launch and every return to the foreground
		// (visibilitychange covers app-switch in the WKWebView — no extra plugin).
		let onVisible: (() => void) | null = null;
		// Native: a light tick for switches, segments and chips — one delegated
		// listener instead of a haptic call at every call site.
		const onTap = (e: MouseEvent) => {
			if (wantsLightHaptic(e.target)) void hapticTick();
		};
		if (isNative) {
			void runCloudSync();
			onVisible = () => {
				if (document.visibilityState === 'visible') void runCloudSync();
			};
			document.addEventListener('visibilitychange', onVisible);
			document.addEventListener('click', onTap);
		}

		return () => {
			stopTheme();
			if (onVisible) document.removeEventListener('visibilitychange', onVisible);
			document.removeEventListener('click', onTap);
		};
	});
</script>

<PwaUpdatePrompt />
<ConfirmSheet />

<!-- Keyed on the pathname so every screen change builds a fresh page (two brews
     share one route, and its state must not carry over). `relative` is what the
     arrival animation's `left` offset moves — see afterNavigate above.
     data-nav-stage is how `verify:duo` finds this element. -->
{#key page.url.pathname}
	<div bind:this={pageEl} class="relative" data-nav-stage>
		{@render children()}
	</div>
{/key}
