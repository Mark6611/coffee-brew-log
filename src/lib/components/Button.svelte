<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';

	// Button system modelled on the Apple iOS 27 UI Kit, which organises every
	// button as a size crossed with a style rather than as a one-off recipe.
	// Sizes come from the kit's Large/Medium/Regular/Small ladder; variants from
	// its Bordered Prominent / Bordered / Default / Destructive / Glass / Glass
	// Prominent set, renamed to what they mean here.
	//
	// Shape is a capsule at every size — the kit uses full corner radius on
	// standalone buttons, and mixing pills with rounded rects was the main
	// inconsistency in the old hand-rolled classes.
	//
	// Renders an <a> when `href` is set, a <button> otherwise, so callers don't
	// have to duplicate the class list to get a link that looks like a button.

	type Size = 'large' | 'medium' | 'regular' | 'small';
	type Variant =
		| 'prominent'
		| 'glass'
		| 'glassProminent'
		| 'glassScrim'
		| 'bordered'
		| 'plain'
		| 'destructive';

	let {
		size = 'regular',
		variant = 'prominent',
		href,
		type = 'button',
		disabled = false,
		full = false,
		iconOnly = false,
		label,
		title,
		onclick,
		class: cls = '',
		children,
		...rest
	}: {
		size?: Size;
		variant?: Variant;
		/** Renders an <a>. Must come from `resolve()` — the caller owns the path. */
		href?: ResolvedPathname;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Stretch to the container width (form CTAs, empty-state actions). */
		full?: boolean;
		/** Square footprint — renders a circle instead of a capsule. */
		iconOnly?: boolean;
		/** Accessible name; required when iconOnly, since there's no text. */
		label?: string;
		title?: string;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	// Heights track the kit's ladder (Large 50, Medium 44, Regular 36, Small 30)
	// nudged to the app's existing rhythm. Every size clears the 44pt touch
	// target either by its own height or by the negative margin callers add.
	const SIZES: Record<Size, { box: string; text: string; pad: string; gap: string }> = {
		large: { box: 'h-[52px]', text: 'text-[15px]', pad: 'px-5', gap: 'gap-2.5' },
		medium: { box: 'h-11', text: 'text-[14px]', pad: 'px-4', gap: 'gap-2' },
		regular: { box: 'h-9', text: 'text-[13px]', pad: 'px-3.5', gap: 'gap-1.5' },
		small: { box: 'h-7', text: 'text-[12px]', pad: 'px-3', gap: 'gap-1.5' }
	};

	// The glass material scales with the control (see .glass-lg/md/sm).
	const GLASS_SCALE: Record<Size, string> = {
		large: 'glass-lg',
		medium: 'glass-md',
		regular: 'glass-md',
		small: 'glass-sm'
	};

	const VARIANTS: Record<Variant, string> = {
		// Filled accent — the kit's Bordered Prominent. One per screen.
		prominent: 'glass-cta bg-copper text-paper hover:bg-copper-dk',
		// Neutral Liquid Glass over whatever it floats on.
		glass: 'glass text-ink hover:brightness-[0.97]',
		// Accent-tinted glass — secondary emphasis without a second filled CTA.
		// copper-dk is the darker copper, so it only works as text on light
		// surfaces; dark theme has to step up to the lighter --color-copper.
		glassProminent: 'glass glass-tinted text-copper-dk dark:text-copper hover:brightness-[0.97]',
		// Dark vibrancy for controls sitting ON a user photo, where the
		// card-tinted material can't hold contrast. Label colour comes from
		// .glass-scrim itself, so no text utility here to fight it.
		glassScrim: 'glass glass-scrim hover:brightness-110',
		// Hairline outline on the page surface — the kit's Bordered.
		bordered: 'border border-hairline bg-surface text-ink hover:bg-paper',
		// Text-only; still gets press physics and a hit box.
		plain: 'text-copper-dk dark:text-copper hover:text-copper hover:bg-copper-lt',
		// Red label, no outline — the kit renders destructive actions as a tinted
		// label (see its Action Sheets), and an outlined pill reads far heavier
		// than the quiet row action these usually are. Pass
		// `class="border border-danger/35"` for the rare standalone case.
		destructive: 'text-danger hover:bg-danger/10'
	};

	const s = $derived(SIZES[size]);
	const shape = $derived(
		iconOnly ? `${s.box} aspect-square rounded-full` : `${s.box} rounded-full ${s.pad}`
	);
	// glassScrim deliberately omitted: it carries its own opacity/blur/specular
	// (it sits on a photo, not on the page), so adding a size scale here would
	// leave the result depending on CSS source order.
	const glassScale = $derived(
		variant === 'glass' || variant === 'glassProminent' ? GLASS_SCALE[size] : ''
	);
	// Small controls read better with the deeper compress (.press-sm).
	const physics = $derived(size === 'small' || iconOnly ? 'press-sm' : 'press');

	const classes = $derived(
		[
			physics,
			'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
			'disabled:pointer-events-none disabled:opacity-50',
			s.text,
			s.gap,
			shape,
			VARIANTS[variant],
			glassScale,
			full ? 'w-full' : '',
			cls
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href != null && href !== ''}
	<!-- `disabled` is not a thing on an anchor: the :disabled selector can never
	     match, so the opacity/pointer-events utilities silently do nothing and a
	     "disabled" link stays fully clickable. Reproduce the state explicitly. -->
	<a
		href={disabled ? undefined : href}
		class="{classes}{disabled ? ' pointer-events-none opacity-50' : ''}"
		aria-label={label}
		{title}
		aria-disabled={disabled || undefined}
		tabindex={disabled ? -1 : undefined}
		{onclick}
		{...rest}>{@render children()}</a
	>
{:else}
	<button {type} {disabled} class={classes} aria-label={label} {title} {onclick} {...rest}
		>{@render children()}</button
	>
{/if}
