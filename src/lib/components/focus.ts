// Shared :focus-visible rings. Keyboard and switch-control users get no visible
// focus anywhere in the app today except ListRow, which is a WCAG 2.4.7 gap.
//
// Three variants because the offset has to survive its container:
//  - FOCUS_RING       positive offset; for controls with room around them.
//  - FOCUS_RING_INSET negative offset; for controls inside an overflow-clipping
//                     or zero-padding parent (a scroll strip, a 4px segmented
//                     track, an overflow-hidden card) where a positive offset is
//                     cropped and the ring appears to vanish.
//  - FOCUS_RING_SCRIM paper-coloured; for controls sitting on a user photo,
//                     where copper cannot be relied on to hold contrast.
//
// :focus-visible (not :focus) so a pointer tap never paints a ring.
export const FOCUS_RING =
	'focus-visible:outline-2 focus-visible:outline-copper focus-visible:outline-offset-2';

export const FOCUS_RING_INSET =
	'focus-visible:outline-2 focus-visible:outline-copper focus-visible:[outline-offset:-3px]';

export const FOCUS_RING_SCRIM =
	'focus-visible:outline-2 focus-visible:outline-paper focus-visible:[outline-offset:-3px]';

// RoastChips' SELECTED state is already a copper double-ring, so a copper focus
// ring there would read as selection. Ink keeps the two states distinguishable.
export const FOCUS_RING_INK =
	'focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2';
