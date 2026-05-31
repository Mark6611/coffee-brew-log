import type { RoastLevel } from '$lib/db/types';

// Tonal roast palette — shared by the RoastChips picker and the read-only
// chip on the bag detail page. Lightness carries the meaning (colour-blind
// safe); these are absolute colours, not theme tokens, so a dark roast reads
// dark in either theme.
export const ROAST_LEVELS: { key: RoastLevel; label: string; bg: string; fg: string }[] = [
	{ key: 'light', label: 'Light', bg: '#C9A36B', fg: '#5A4424' },
	{ key: 'medium', label: 'Medium', bg: '#A6743D', fg: '#3D2811' },
	{ key: 'medium-dark', label: 'Medium-Dark', bg: '#6F4423', fg: '#F0E2D0' },
	{ key: 'dark', label: 'Dark', bg: '#3E2415', fg: '#E8D6C2' }
];

export function roastMeta(level: RoastLevel) {
	return ROAST_LEVELS.find((l) => l.key === level)!;
}
