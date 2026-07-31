<script lang="ts">
	import { resolve } from '$app/paths';

	// Privacy policy — required by App Review 5.1.1 (a URL in App Store Connect
	// AND an in-app link, under Settings). Reachable at /privacy. Kept honest to
	// the split architecture: iOS = on-device + the user's private iCloud (no
	// accounts at all); web = optional email sign-in sync. Mirror any edits in
	// static/privacy-policy.html (the raw-fetchable App Store URL).
	const updated = 'July 2026';
	const CONTACT = 'kornkranmarwin@gmail.com';
</script>

<svelte:head><title>Coffee Brew Log — Privacy Policy</title></svelte:head>

<article class="policy mx-auto max-w-[680px] px-[22px] pt-7 pb-16">
	<a
		href={resolve('/settings')}
		class="mb-6 inline-flex items-center gap-1 text-[calc(var(--dt-base)*14/17)] text-muted transition-colors hover:text-ink"
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M10 3L4 8l6 5" /></svg
		>
		Back
	</a>

	<h1
		class="font-display text-[calc(var(--dt-base)*26/17)] font-medium tracking-[-0.01em] text-ink"
	>
		Coffee Brew Log — Privacy Policy
	</h1>
	<p class="mt-1 mb-6 font-mono text-[calc(var(--dt-base)*12/17)] tracking-[0.04em] text-muted">
		Last updated: {updated}
	</p>

	<p class="text-[calc(var(--dt-base)*15/17)] leading-[1.6] text-ink-70">
		Coffee Brew Log is a personal log for your coffee brewing. It is built to be private by default:
		your data lives on your device, and syncs only through your own private iCloud (on iPhone) or
		your own private account (optional, web). The developer of Coffee Brew Log cannot see your data.
	</p>

	<h2>What the app stores, and where</h2>
	<ul>
		<li>
			<strong>Your bags and brews</strong> — roaster, origin, roast level, process, grind, dose,
			yield, brew time, ratings, tasting notes, prices, and dates — and your app
			<strong>settings</strong> are stored on your device.
		</li>
		<li>
			<strong>Photos</strong> you attach to a bag or brew are downscaled and stored with that item. Photos
			sync along with the rest of your data (see below), so they are available on your other devices.
		</li>
		<li>
			<strong>iPhone app — iCloud sync:</strong> the iOS app has no accounts and no sign-in. If your device
			is signed into iCloud, your bags, brews, and photos sync between your own devices through your private
			iCloud (CloudKit) database. This uses your Apple ID; the developer has no access to it and runs
			no server for the iOS app.
		</li>
		<li>
			<strong>Web app — optional account sync:</strong> on the web version only, you can sign in to mirror
			your data to your own private database so browsers stay in sync. Access is scoped to your account
			by row-level security — other users cannot read it, and the developer does not access it.
		</li>
	</ul>

	<h2>Account &amp; email</h2>
	<p>
		The iPhone app has no accounts — it never asks for or collects your email. On the web app,
		signing in is optional and only needed for cross-browser sync; it uses a one-time code sent to
		your email address (magic-link sign-in), used solely to send that code and to identify your
		account — never for marketing, advertising, or profiling. If you never sign in, Coffee Brew Log
		collects no personal information at all.
	</p>

	<h2>Analytics &amp; tracking</h2>
	<p>
		Coffee Brew Log contains no third-party analytics, advertising, or tracking SDKs. It does not
		collect a device identifier, does not track you across apps or websites, and does not profile
		you.
	</p>

	<h2>Your control &amp; data deletion</h2>
	<ul>
		<li>
			Delete any bag or brew inside the app; deletions propagate to your other synced devices.
		</li>
		<li>
			On the web app, sign out at any time — this wipes the local copy of your data from that
			browser.
		</li>
		<li>Export a full backup (JSON) of your bags and brews from Settings whenever you like.</li>
		<li>
			To delete all of your synced account data, use the delete option in Settings or email us at
			the address below and we will remove it.
		</li>
		<li>Deleting the app removes all on-device data.</li>
	</ul>

	<h2>Children</h2>
	<p>
		Coffee Brew Log is not directed to children and does not knowingly collect information from
		children.
	</p>

	<h2>Changes</h2>
	<p>
		If this policy changes, the “last updated” date above will change with it. Material changes will
		be reflected here before they take effect.
	</p>

	<h2>Contact</h2>
	<p>Questions or data-deletion requests: <a href="mailto:{CONTACT}">{CONTACT}</a></p>
</article>

<style>
	.policy :global(h2) {
		font-size: 16px;
		font-weight: 600;
		margin: 26px 0 8px;
		color: var(--color-ink);
	}
	.policy :global(p),
	.policy :global(li) {
		font-size: 14.5px;
		line-height: 1.6;
		color: var(--color-ink-70);
	}
	.policy :global(ul) {
		padding-left: 20px;
		list-style: disc;
	}
	.policy :global(li) {
		margin-bottom: 6px;
	}
	.policy :global(strong) {
		color: var(--color-ink);
		font-weight: 600;
	}
	.policy :global(a[href^='mailto']) {
		color: var(--color-copper);
		text-decoration: underline;
	}
</style>
