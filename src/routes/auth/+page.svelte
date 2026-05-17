<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { auth } from '$lib/auth.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	let email = $state('');
	let sent = $state(false);
	let sending = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		if (auth.user) goto('/');
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		sending = true;

		const { error: err } = await supabase.auth.signInWithOtp({
			email: email.trim(),
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`
			}
		});

		if (err) {
			error = err.message;
		} else {
			sent = true;
		}
		sending = false;
	}
</script>

<svelte:head>
	<title>Sign in</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-20">
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/"
			class="text-muted hover:text-ink flex h-9 items-center gap-1 text-[15px] transition-colors"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M10 3L4 8l6 5" />
			</svg>
			Home
		</a>
	</div>

	<div class="px-[22px]">
		<Eyebrow>ACCOUNT</Eyebrow>
		<h1
			class="font-display text-ink mt-1 text-[30px] font-medium leading-[1.05] tracking-[-0.015em]"
		>{sent ? 'Check your inbox.' : 'Sign in.'}</h1>

		{#if sent}
			<p class="text-muted font-display mt-3 text-[15px] leading-[1.5] italic">
				We sent a magic link to <strong class="text-ink not-italic">{email}</strong>. Open it on
				this device to sign in.
			</p>
			<button
				type="button"
				onclick={() => {
					sent = false;
					email = '';
				}}
				class="text-copper mt-6 font-mono text-[11px] font-medium tracking-[0.14em] uppercase hover:underline"
			>← Try a different email</button>
		{:else}
			<p class="text-muted font-display mt-3 text-[15px] leading-[1.5] italic">
				Sign in lets you sync brews across devices. Your existing brews on this device stay
				right here — they'll migrate to your account on first sign-in.
			</p>

			<form onsubmit={handleSubmit} class="mt-6 space-y-[18px]">
				<div>
					<Eyebrow class="mb-2">EMAIL</Eyebrow>
					<input
						type="email"
						bind:value={email}
						required
						placeholder="you@example.com"
						class="bg-paper border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 h-12 w-full rounded-[14px] border px-3.5 transition outline-none focus:ring-2"
					/>
				</div>

				{#if error}
					<div
						class="bg-danger/8 border-danger/20 text-danger rounded-[14px] border p-3 text-[13px]"
					>{error}</div>
				{/if}

				<button
					type="submit"
					disabled={sending || !email.trim()}
					class="bg-copper text-paper hover:bg-copper-dk flex h-14 w-full items-center justify-center rounded-2xl text-base font-medium transition-colors disabled:opacity-50"
				>{sending ? 'Sending…' : 'Send magic link'}</button>
			</form>
		{/if}
	</div>
</div>
