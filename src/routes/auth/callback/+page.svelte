<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorMsg = $state<string | null>(null);

	onMount(() => {
		// An expired/used magic link comes back as #error=...&error_description=... in the
		// hash — known synchronously at load. Surface it immediately with its real message
		// instead of showing a 4-second "Confirming…" spinner and then a generic error.
		const hash = new URLSearchParams(window.location.hash.slice(1));
		if (hash.get('error')) {
			status = 'error';
			errorMsg =
				hash.get('error_description') /* URLSearchParams decodes + → space */ ??
				'Sign-in link is invalid or expired. Try again.';
			return;
		}

		// Supabase auto-detects the session in URL on init. Listen for the SIGNED_IN event
		// and redirect home. Fallback: if a session is already present (e.g. user revisited
		// the callback URL), redirect immediately.
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
				status = 'success';
				setTimeout(() => goto('/'), 400);
			}
		});

		supabase.auth.getSession().then(({ data, error }) => {
			if (error) {
				status = 'error';
				errorMsg = error.message;
				return;
			}
			if (data.session) {
				status = 'success';
				setTimeout(() => goto('/'), 400);
				return;
			}
			// No session yet — give Supabase a moment to process the URL hash.
			setTimeout(() => {
				if (status === 'loading') {
					status = 'error';
					errorMsg = 'Sign-in link is invalid or expired. Try again.';
				}
			}, 4000);
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Signing in…</title>
</svelte:head>

<div class="mx-auto max-w-md pt-20 text-center">
	{#if status === 'loading'}
		<div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-copper-lt text-copper">
			<svg width="32" height="32" viewBox="0 0 56 56" fill="none" class="animate-pulse">
				<g transform="translate(28 28) rotate(-18)">
					<ellipse
						cx="0"
						cy="0"
						rx="14"
						ry="19"
						fill="none"
						stroke="currentColor"
						stroke-width="2.4"
					/>
					<path
						d="M 0 -16.5 C 5.5 -10, -5.5 -1, 0 6.5 S 5.5 14, 0 16.5"
						fill="none"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
					/>
				</g>
			</svg>
		</div>
		<p class="mt-6 font-display text-[15px] text-muted italic">Confirming your sign-in…</p>
	{:else if status === 'success'}
		<p class="font-display text-[22px] font-medium tracking-[-0.005em] text-ink">Signed in.</p>
		<p class="mt-2 font-display text-[14px] text-muted italic">Heading home…</p>
	{:else}
		<p class="font-display text-[18px] font-medium text-danger">Sign-in link didn't work.</p>
		<p class="mt-2 font-display text-[14px] text-muted italic">{errorMsg}</p>
		<a
			href="/auth"
			class="mt-6 inline-block font-mono text-[11px] font-medium tracking-[0.14em] text-copper uppercase hover:underline"
			>← Try again</a
		>
	{/if}
</div>
