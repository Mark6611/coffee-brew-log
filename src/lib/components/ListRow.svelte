<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	// One row of a grouped inset list (see ListGroup). Modelled on the iOS 27 UI
	// Kit's list cells: a leading glyph well, a title with optional subtitle, a
	// trailing value, and a disclosure chevron when the row navigates.
	//
	// Renders <a> with href, <button> with onclick, and a plain <div> otherwise,
	// so a read-only "Brews … 8" row and a tappable "Privacy Policy ›" row are
	// the same component. Only the interactive forms get press physics and a
	// hover fill — a static row that lit up on hover would read as tappable.
	//
	// min-h-[52px] rather than the kit's 44pt floor: these rows carry a subtitle
	// often enough that 44 crowds them, and 52 keeps single-line rows comfortably
	// past the touch-target minimum.

	let {
		title,
		subtitle,
		value,
		href,
		onclick,
		chevron,
		tone = 'default',
		disabled = false,
		icon,
		trailing,
		class: cls = '',
		...rest
	}: {
		title: string;
		subtitle?: string;
		/** Right-aligned secondary text — counts, versions, current selection. */
		value?: string | number;
		/** Renders an <a>. Must come from `resolve()` — the caller owns the path. */
		href?: ResolvedPathname;
		onclick?: (e: MouseEvent) => void;
		/** Disclosure arrow. Defaults on for rows that navigate. */
		chevron?: boolean;
		/** `danger` tints the title for destructive rows (Wipe all data). */
		tone?: 'default' | 'danger' | 'accent';
		disabled?: boolean;
		/** Leading glyph, drawn inside a 28px well. */
		icon?: Snippet;
		/** Trailing control (switch, badge) — replaces `value` when both are set. */
		trailing?: Snippet;
		class?: string;
		[key: string]: unknown;
	} = $props();

	const interactive = $derived(!!href || !!onclick);
	const showChevron = $derived(chevron ?? !!href);

	const TONE: Record<'default' | 'danger' | 'accent', string> = {
		default: 'text-ink',
		danger: 'text-danger',
		accent: 'text-copper-dk dark:text-copper'
	};

	// The focus ring has to be drawn INSIDE the row. Rows are w-full, so their
	// border box coincides with ListGroup's `overflow-hidden` clip box — a
	// default outline sits outside that box and gets clipped away entirely on a
	// single-row group, leaving a keyboard user with no visible focus at all.
	const FOCUS =
		'focus-visible:outline-2 focus-visible:outline-copper focus-visible:[outline-offset:-3px]';
	const classes = $derived(
		[
			'flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left',
			interactive ? `press-sm hover:bg-paper/60 ${FOCUS}` : '',
			disabled ? 'pointer-events-none opacity-50' : '',
			cls
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#snippet body()}
	{#if icon}
		<!-- The glyph sits back from the title (muted, not ink) so the label stays
		     the thing you read first; a destructive row tints it to match. -->
		<span
			class="grid h-7 w-7 shrink-0 place-items-center {tone === 'default'
				? 'text-muted'
				: TONE[tone]}">{@render icon()}</span
		>
	{/if}
	<span class="min-w-0 flex-1">
		<span class="block truncate text-[15px] font-medium {TONE[tone]}">{title}</span>
		{#if subtitle}
			<span class="mt-0.5 block text-[12.5px] leading-[1.35] text-muted">{subtitle}</span>
		{/if}
	</span>
	{#if trailing}
		{@render trailing()}
	{:else if value != null && value !== ''}
		<span class="shrink-0 font-mono text-[13px] text-muted tabular-nums">{value}</span>
	{/if}
	{#if showChevron}
		<svg
			width="7"
			height="12"
			viewBox="0 0 7 12"
			fill="none"
			class="shrink-0 text-faint"
			aria-hidden="true"
		>
			<path
				d="M1.4 1.4L5.6 6L1.4 10.6"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{/if}
{/snippet}

{#if href}
	<a {href} class={classes} aria-disabled={disabled || undefined} {onclick} {...rest}
		>{@render body()}</a
	>
{:else if onclick}
	<button type="button" {disabled} class={classes} {onclick} {...rest}>{@render body()}</button>
{:else}
	<div class={classes} {...rest}>{@render body()}</div>
{/if}
