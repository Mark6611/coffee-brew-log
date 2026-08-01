<script lang="ts">
	import '@fontsource-variable/newsreader/index.css';
	import '@fontsource-variable/newsreader/wght-italic.css';
	import '@fontsource-variable/geist/index.css';
	import '@fontsource-variable/geist-mono/index.css';
	import './layout.css';
	import '$lib/sync'; // side effect: registers auth listener for sync

	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { motion } from '$lib/motion.svelte';
	import { page } from '$app/state';
	import { hideSplash, isNative } from '$lib/native';
	import { theme } from '$lib/theme.svelte';
	import { runCloudSync } from '$lib/cloudSync';
	import SyncBanner from '$lib/components/SyncBanner.svelte';
	import ConfirmSheet from '$lib/components/ConfirmSheet.svelte';
	import PwaUpdatePrompt from '$lib/components/PwaUpdatePrompt.svelte';

	let { children } = $props();

	onMount(() => {
		// Applies the stored preference and starts following the OS in System
		// mode. Preference edits live in Settings → Appearance.
		const stopTheme = theme.init();
		// App has painted with the right theme — fade the native splash out.
		void hideSplash();

		// Native: sync with iCloud on launch and every return to the foreground
		// (visibilitychange covers app-switch in the WKWebView — no extra plugin).
		let onVisible: (() => void) | null = null;
		if (isNative) {
			void runCloudSync();
			onVisible = () => {
				if (document.visibilityState === 'visible') void runCloudSync();
			};
			document.addEventListener('visibilitychange', onVisible);
		}

		return () => {
			stopTheme();
			if (onVisible) document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<PwaUpdatePrompt />
<SyncBanner />
<ConfirmSheet />

{#key page.url.pathname}
	<div in:fade={motion({ duration: 120 })}>
		{@render children()}
	</div>
{/key}
