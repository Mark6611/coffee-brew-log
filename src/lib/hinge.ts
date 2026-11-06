// The iPhone Duo's hinge, as ios/App/App/HingePlugin.swift reports it. Ported from
// sibling Buffy, which measured all of this on the iOS 27.2 Duo simulator.
//
// Why the layout needs it: unfolded, the Duo's inner display is 951×669pt LANDSCAPE
// with the hinge down the middle. Every page here is a `mx-auto max-w-2xl` column
// (672px), so by width alone the unfolded Duo would get a centred 672px column with
// ~140pt of paper either side — the phone-in-a-window look the iOS 27 SDK build is
// meant to get rid of. CSS cannot tell the Duo from an iPad (WebKit on 27.2 has no
// viewport-segments or device-posture support), so the native shell tells us, and
// `data-foldable` on <html> lets the column fill (layout.css).
//
// The switch means "this device has a hinge", not "it is open right now": every Duo
// pose should fill (466, 669 and 951pt), and the hinge status changes a beat before
// or after the window resizes while folding — keying the layout to it flashed the
// centred column for a frame mid-fold in Buffy. So it is set on the first hinge
// report and never cleared: a device does not lose its hinge, even when a scene
// transition briefly reports none.

// Must match the strings HingePlugin.name(for:) sends — rename both together, or an
// unrecognised string parses as 'none' and the Duo falls back to the centred column.
export type HingeState = 'none' | 'unknown' | 'closed' | 'partial' | 'open';

const STATES: ReadonlySet<string> = new Set<HingeState>([
	'none',
	'unknown',
	'closed',
	'partial',
	'open'
]);

/** Anything the bridge hands us that is not a known state counts as "no hinge". */
export function parseHingeState(value: unknown): HingeState {
	return typeof value === 'string' && STATES.has(value) ? (value as HingeState) : 'none';
}

/** Any report of a hinge object at all — open, closed, part-way, or status unknown. */
export function isFoldable(state: HingeState): boolean {
	return state !== 'none';
}

/** Mark <html> once the device turns out to have a hinge. Sticky: 'none' never clears
 *  it. Takes the element so tests need no DOM. */
export function applyHingeState(root: { dataset: DOMStringMap }, state: HingeState): void {
	if (isFoldable(state)) root.dataset.foldable = '';
}
