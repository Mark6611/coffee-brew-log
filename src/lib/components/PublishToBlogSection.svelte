<script lang="ts">
	// Variant B — Copper-tinted card. Appended to the brew edit form.
	// Self-contained: the parent binds the three editable fields and passes
	// `publishedAt` so we can show the PublishedStamp without owning the date.
	import LiveDot from './LiveDot.svelte';
	import PublishedStamp from './PublishedStamp.svelte';
	import WillUnpublishNote from './WillUnpublishNote.svelte';

	let {
		published = $bindable(false),
		blogTitle = $bindable(''),
		blogBody = $bindable(''),
		publishedAt,
		dirty = false
	}: {
		published?: boolean;
		blogTitle?: string;
		blogBody?: string;
		publishedAt: string | undefined;
		dirty?: boolean;
	} = $props();

	const wasPublished = $derived(!!publishedAt);
</script>

<div class="relative">
	{#if dirty}
		<div
			class="bg-copper absolute top-1 -left-2 bottom-1 w-1 rounded-full"
			aria-hidden="true"
		></div>
	{/if}
	<div
		class="rounded-[18px] border p-[18px] transition-[background-color,border-color] duration-200 {published
			? 'bg-copper-lt border-copper/20'
			: 'bg-surface border-hairline'}"
	>
		<!-- Header row: eyebrow + headline + toggle -->
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0">
				<div
					class="flex items-center gap-1.5 font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase {published
						? 'text-copper-dk'
						: 'text-muted'}"
				>
					<span>BLOG POST</span>
					{#if published && wasPublished}
						<LiveDot color="var(--color-success)" size={5} />
					{/if}
				</div>
				<div
					class="font-display mt-1.5 text-[19px] leading-[1.2] font-medium tracking-[-0.005em] {published
						? 'text-ink'
						: 'text-muted'}"
				>
					{published ? 'Visible on the public site' : 'Publish this brew'}
				</div>
				<div
					class="mt-1 text-[12.5px] leading-[1.45] {published ? 'text-copper-dk/85' : 'text-muted'}"
				>
					{published
						? 'Rebuilds on next deploy. Title and body below.'
						: 'Turn on to write the post.'}
				</div>
			</div>
			<!-- Toggle -->
			<button
				type="button"
				role="switch"
				aria-checked={published}
				aria-label={published ? 'Unpublish' : 'Publish to blog'}
				onclick={() => (published = !published)}
				class="relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 {published
					? 'bg-copper'
					: 'bg-ink/10'}"
			>
				<span
					class="absolute top-[3px] h-[26px] w-[26px] rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04)] transition-[left] duration-200"
					style="left: {published ? 23 : 3}px;"
				></span>
			</button>
		</div>

		{#if published}
			<div class="mt-[18px]" style="animation: brewSlide 0.22s ease;">
				<!-- POST TITLE -->
				<div>
					<div
						class="text-muted mb-2 flex items-center justify-between font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
					>
						<span>POST TITLE</span>
						<span class="text-faint text-[11.5px] font-normal normal-case tracking-normal"
							>separate from coffee name</span
						>
					</div>
					<input
						type="text"
						bind:value={blogTitle}
						placeholder="A morning at home with the Yirgacheffe"
						class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 font-display h-12 w-full rounded-[14px] border px-3.5 text-[17px] transition outline-none focus:ring-2"
					/>
				</div>

				<!-- BODY -->
				<div class="mt-[18px]">
					<div
						class="text-muted mb-2 flex items-center justify-between font-mono text-[10.5px] font-medium tracking-[0.14em] uppercase"
					>
						<span>BODY</span>
						<span class="text-faint text-[11.5px] font-normal normal-case tracking-normal"
							>Markdown supported</span
						>
					</div>
					<textarea
						bind:value={blogBody}
						rows="8"
						placeholder={"# The Yirgacheffe pulled like syrup on day 3…\n\nBloom went long. The bed never crusted.\n\n*Stone fruit on cool-down.*"}
						class="bg-surface border-hairline text-ink placeholder:text-faint focus:border-copper focus:ring-copper/25 w-full resize-none rounded-[14px] border px-3.5 py-3 text-[16px] leading-[1.55] transition outline-none focus:ring-2"
					></textarea>
				</div>

				<PublishedStamp {publishedAt} />
			</div>
		{:else if wasPublished}
			<WillUnpublishNote />
		{/if}
	</div>
</div>
