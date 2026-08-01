<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { supabase } from '$lib/supabase';
	import { auth } from '$lib/auth.svelte';
	import { isNative } from '$lib/native';
	import Button from '$lib/components/Button.svelte';
	import Eyebrow from '$lib/components/Eyebrow.svelte';

	type Phase = 'email' | 'otp';

	let email = $state('');
	let otpCode = $state('');
	let phase = $state<Phase>('email');
	let sending = $state(false);
	let verifying = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		// The native app has no accounts — data is local + the user's own iCloud.
		// Any stale link/route lands on Settings, where iCloud sync lives.
		if (isNative) {
			void goto(resolve('/settings'), { replaceState: true });
			return;
		}
		if (auth.user) goto(resolve('/'));
	});

	async function sendCode(e: SubmitEvent) {
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
			phase = 'otp';
			otpCode = '';
		}
		sending = false;
	}

	async function verifyCode(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		verifying = true;

		const { error: err } = await supabase.auth.verifyOtp({
			email: email.trim(),
			token: otpCode.trim(),
			type: 'email'
		});

		if (err) {
			error = err.message;
			verifying = false;
		} else {
			await goto(resolve('/'));
		}
	}

	function back() {
		phase = 'email';
		otpCode = '';
		error = null;
	}
</script>

<svelte:head>
	<title>Sign in</title>
</svelte:head>

<div class="mx-auto max-w-2xl pb-20">
	<div class="flex items-center justify-between gap-2 px-5 pe-16 pt-2 pb-2 sm:pe-5">
		<a
			href={resolve('/')}
			class="flex h-9 items-center gap-1 text-[calc(var(--dt-base)*15/17)] text-copper-dk transition-colors hover:text-copper dark:text-copper dark:hover:text-ink"
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

	<div class="px-5">
		<Eyebrow class="min-w-0 truncate">ACCOUNT</Eyebrow>
		<h1
			class="mt-1 font-display text-[calc(var(--dt-base)*30/17)] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			{phase === 'email' ? 'Sign in.' : 'Enter the code.'}
		</h1>

		{#if phase === 'email'}
			<p
				class="mt-3 font-display text-[calc(var(--dt-base)*15/17)] leading-[1.5] text-muted italic"
			>
				Sign in lets you sync brews across devices. Your existing brews on this device stay right
				here — they'll migrate to your account on first sign-in.
			</p>

			<form onsubmit={sendCode} class="mt-6 space-y-5">
				<div>
					<Eyebrow class="mb-2">EMAIL</Eyebrow>
					<input
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="you@example.com"
						class="min-h-12 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
					/>
				</div>

				{#if error}
					<div
						class="rounded-input border border-danger/20 bg-danger/8 p-3 text-[calc(var(--dt-base)*13/17)] text-danger"
					>
						{error}
					</div>
				{/if}

				<Button
					size="large"
					variant="prominent"
					full
					type="submit"
					disabled={sending || !email.trim()}>{sending ? 'Sending…' : 'Send code'}</Button
				>
			</form>
		{:else}
			<p
				class="mt-3 font-display text-[calc(var(--dt-base)*15/17)] leading-[1.5] text-muted italic"
			>
				Sent a code to <strong class="text-ink not-italic">{email}</strong>. Open the email and type
				the code below — or tap the link to sign in this browser.
			</p>

			<form onsubmit={verifyCode} class="mt-6 space-y-5">
				<div>
					<Eyebrow class="mb-2">CODE FROM EMAIL</Eyebrow>
					<input
						type="text"
						bind:value={otpCode}
						required
						inputmode="numeric"
						autocomplete="one-time-code"
						pattern="[0-9]*"
						maxlength="10"
						placeholder="00000000"
						class="min-h-14 w-full rounded-input border border-hairline bg-paper px-4 py-2 text-center font-mono text-[calc(var(--dt-base)*24/17)] font-medium tracking-[0.25em] text-ink transition outline-none placeholder:text-muted focus:border-copper focus:ring-2 focus:ring-copper/25"
					/>
				</div>

				{#if error}
					<div
						class="rounded-input border border-danger/20 bg-danger/8 p-3 text-[calc(var(--dt-base)*13/17)] text-danger"
					>
						{error}
					</div>
				{/if}

				<Button
					size="large"
					variant="prominent"
					full
					type="submit"
					disabled={verifying || otpCode.trim().length < 6}
					>{verifying ? 'Verifying…' : 'Verify code'}</Button
				>

				<button
					type="button"
					onclick={back}
					class="font-mono text-[calc(var(--dt-base)*11/17)] font-medium tracking-[0.14em] text-copper uppercase transition-colors hover:text-copper-dk"
					>← Use a different email</button
				>
			</form>
		{/if}
	</div>
</div>
