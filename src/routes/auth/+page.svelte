<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { auth } from '$lib/auth.svelte';
	import { isNative } from '$lib/native';
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
			void goto('/settings', { replaceState: true });
			return;
		}
		if (auth.user) goto('/');
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
			await goto('/');
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
	<div class="flex items-center justify-between px-[18px] pt-[6px] pb-[10px]">
		<a
			href="/"
			class="flex h-9 items-center gap-1 text-[15px] text-muted transition-colors hover:text-ink"
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
			class="mt-1 font-display text-[30px] leading-[1.05] font-medium tracking-[-0.015em] text-ink"
		>
			{phase === 'email' ? 'Sign in.' : 'Enter the code.'}
		</h1>

		{#if phase === 'email'}
			<p class="mt-3 font-display text-[15px] leading-[1.5] text-muted italic">
				Sign in lets you sync brews across devices. Your existing brews on this device stay right
				here — they'll migrate to your account on first sign-in.
			</p>

			<form onsubmit={sendCode} class="mt-6 space-y-[18px]">
				<div>
					<Eyebrow class="mb-2">EMAIL</Eyebrow>
					<input
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						placeholder="you@example.com"
						class="h-12 w-full rounded-[14px] border border-hairline bg-paper px-3.5 text-ink transition outline-none placeholder:text-faint focus:border-copper focus:ring-2 focus:ring-copper/25"
					/>
				</div>

				{#if error}
					<div
						class="rounded-[14px] border border-danger/20 bg-danger/8 p-3 text-[13px] text-danger"
					>
						{error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={sending || !email.trim()}
					class="press glass-cta flex h-14 w-full items-center justify-center rounded-full bg-copper text-base font-medium text-paper hover:bg-copper-dk disabled:opacity-50"
					>{sending ? 'Sending…' : 'Send code'}</button
				>
			</form>
		{:else}
			<p class="mt-3 font-display text-[15px] leading-[1.5] text-muted italic">
				Sent a code to <strong class="text-ink not-italic">{email}</strong>. Open the email and type
				the code below — or tap the link to sign in this browser.
			</p>

			<form onsubmit={verifyCode} class="mt-6 space-y-[18px]">
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
						class="h-14 w-full rounded-[14px] border border-hairline bg-paper px-4 text-center font-mono text-[24px] font-medium tracking-[0.25em] text-ink transition outline-none placeholder:text-faint focus:border-copper focus:ring-2 focus:ring-copper/25"
					/>
				</div>

				{#if error}
					<div
						class="rounded-[14px] border border-danger/20 bg-danger/8 p-3 text-[13px] text-danger"
					>
						{error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={verifying || otpCode.trim().length < 6}
					class="press glass-cta flex h-14 w-full items-center justify-center rounded-full bg-copper text-base font-medium text-paper hover:bg-copper-dk disabled:opacity-50"
					>{verifying ? 'Verifying…' : 'Verify code'}</button
				>

				<button
					type="button"
					onclick={back}
					class="font-mono text-[11px] font-medium tracking-[0.14em] text-copper uppercase transition-colors hover:text-copper-dk"
					>← Use a different email</button
				>
			</form>
		{/if}
	</div>
</div>
