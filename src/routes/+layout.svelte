<script lang="ts">
	import '@fontsource-variable/newsreader/index.css';
	import '@fontsource-variable/newsreader/wght-italic.css';
	import '@fontsource-variable/geist/index.css';
	import '@fontsource-variable/geist-mono/index.css';
	import './layout.css';
	import '$lib/sync'; // side effect: registers auth listener for sync

	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { hideSplash, setupNativeChrome, isNative } from '$lib/native';
	import { runCloudSync } from '$lib/cloudSync';
	import SyncBanner from '$lib/components/SyncBanner.svelte';
	import PwaUpdatePrompt from '$lib/components/PwaUpdatePrompt.svelte';

	let { children } = $props();

	type Theme = 'light' | 'dark' | 'system';
	let theme = $state<Theme>('system');

	function effective(t: Theme): 'light' | 'dark' {
		if (t !== 'system') return t;
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function apply(t: Theme) {
		const eff = effective(t);
		document.documentElement.setAttribute('data-theme', eff);
		// Keep the native status bar's text color in step with the theme.
		void setupNativeChrome(eff);
	}

	function cycle() {
		theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
		localStorage.setItem('theme', theme);
		apply(theme);
	}

	onMount(() => {
		const saved = (localStorage.getItem('theme') as Theme | null) ?? 'system';
		theme = saved;
		apply(saved);
		// App has painted with the right theme — fade the native splash out.
		void hideSplash();

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (theme === 'system') apply('system');
		};
		mq.addEventListener('change', handler);

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
			mq.removeEventListener('change', handler);
			if (onVisible) document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<button
	type="button"
	onclick={cycle}
	class="press-sm glass glass-sm fixed right-3 z-50 grid h-9 w-9 place-items-center rounded-full text-ink"
	style="top: calc(12px + env(safe-area-inset-top, 0px))"
	aria-label="Cycle theme (current: {theme})"
	title="Theme: {theme}"
>
	{#if theme === 'light'}
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		</svg>
	{:else if theme === 'dark'}
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	{:else}
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="3" y="4" width="18" height="13" rx="2" />
			<path d="M9 21h6M12 17v4" />
		</svg>
	{/if}
</button>

<PwaUpdatePrompt />
<SyncBanner />

{#key page.url.pathname}
	<div in:fade={{ duration: 120 }}>
		{@render children()}
	</div>
{/key}
