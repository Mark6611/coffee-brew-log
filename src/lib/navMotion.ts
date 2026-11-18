// Which way a screen change moves, how the incoming screen arrives, and which
// taps get a light haptic. Plain functions so the root layout stays declarative
// and each rule is unit-tested. Ported from sibling Buffy (`30e365c`), with two
// deliberate differences: how the direction is decided (navDirection) and how the
// screen is moved (navMotion).

export type NavDirection = 'forward' | 'back';

/** How deep a path sits in the app: `/` is 0, `/brews` 1, `/brews/<id>/edit` 3. */
function depth(path: string): number {
	return path.split('/').filter(Boolean).length;
}

/**
 * Which way a screen change travels.
 *
 * Buffy asks the browser history, and that is not enough here: nothing in this
 * app calls history.back(). Every "‹ Brews", every Cancel and every return after
 * a save or a delete is a plain link or a goto(), and the native shell has no
 * back button or back gesture at all — so by history alone every one of them
 * would arrive from the right, as if going deeper. The route tree is the real
 * hierarchy (home › a list › an item › its edit form), so a move to a SHALLOWER
 * path is "back" and anything else is "forward".
 *
 * A genuine history step (the browser's own buttons, on the web) keeps the
 * direction it actually took. `delta` is SvelteKit's navigation.delta, which is
 * only present for popstate.
 */
export function navDirection(
	type: string,
	delta: number | undefined,
	fromPath: string | null | undefined,
	toPath: string | null | undefined
): NavDirection {
	if (type === 'popstate') return (delta ?? 0) < 0 ? 'back' : 'forward';
	if (fromPath == null || toPath == null) return 'forward';
	return depth(toPath) < depth(fromPath) ? 'back' : 'forward';
}

/**
 * The root layout rebuilds the page whenever the PATHNAME changes (its {#key}),
 * so that is also when the new screen should arrive. A query-only change — the
 * brew form swapping method or bag — is the same screen and must not move.
 */
export function shouldAnimateNav(
	fromPath: string | null | undefined,
	toPath: string | null | undefined
): boolean {
	if (toPath == null) return false; // leaving the app
	return fromPath !== toPath;
}

/** How far the incoming screen travels, in px. */
export const NAV_TRAVEL = 24;

/**
 * How the incoming screen arrives: a short ease from the side it came from — the
 * right going forward, the left going back — with a fade. Returns null with
 * Reduce Motion on: this app's rule ($lib/motion) is that every JS-driven
 * transition collapses to nothing, and the old page is already gone by the time
 * the new one mounts, so a fade here would be a blink, not a cross-fade.
 *
 * It is a Web Animation on the page wrapper, started in afterNavigate — after the
 * new page is in the DOM, before it paints.
 *
 * The offset is `left` on a position:relative box, NOT `transform`, and that is
 * the whole point. Buffy translates its app container, which is a fixed 100dvh
 * box. Here the DOCUMENT scrolls and the wrapper is as tall as the page, and any
 * transform (or `translate`, `filter`, `will-change: transform`) on it makes it
 * the containing block for every position:fixed descendant: for the length of the
 * animation the + buttons on Brews and Bags would sit at the bottom of the page
 * instead of the screen, the edit bar would double its top inset, and a sheet
 * opened mid-move would anchor to the page. `left` moves the same pixels without
 * that side effect, so fixed chrome stays put and simply fades in with the page.
 * The cost is that `left` animates on the main thread (opacity still runs on the
 * compositor); at 24px over a quarter second a dropped frame is not visible.
 *
 * No `fill`: nothing outlives the animation. Keep it that way, and never swap
 * `left` for a transform without moving every fixed element out of the wrapper
 * first — `verify:duo` pins this by pausing the animation mid-flight.
 */
export function navMotion(
	direction: NavDirection,
	reduceMotion: boolean
): { keyframes: Keyframe[]; options: KeyframeAnimationOptions } | null {
	if (reduceMotion) return null;
	const from = direction === 'back' ? -NAV_TRAVEL : NAV_TRAVEL;
	return {
		keyframes: [
			{ opacity: 0, left: `${from}px` },
			{ opacity: 1, left: '0px' }
		],
		options: { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
	};
}

// Controls that a native app confirms with a tick: switches, and everything that
// toggles or selects in place — the segmented controls (method, taste, balance,
// theme) and the chips (roast, origin, process). In this app those are exactly
// the elements carrying role="switch" or aria-pressed.
const LIGHT_HAPTIC = '[role="switch"], [aria-pressed]';

type Tappable = {
	closest?: (selector: string) => unknown;
};
type Control = {
	getAttribute?: (name: string) => string | null;
	disabled?: boolean;
};

/** Does a tap on `target` land on a control that should tick? */
export function wantsLightHaptic(target: EventTarget | null): boolean {
	if (!target) return false;
	const el = target as Tappable;
	if (typeof el.closest !== 'function') return false;
	const control = el.closest(LIGHT_HAPTIC) as Control | null;
	if (control == null) return false;
	// A read-only scale (brew detail) keeps its segments as inert buttons hidden
	// from assistive tech; tapping one changes nothing, so it must not tick.
	if (control.disabled) return false;
	if (control.getAttribute?.('aria-hidden') === 'true') return false;
	return true;
}
