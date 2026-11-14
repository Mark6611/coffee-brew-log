import type { Extraction } from '$lib/db/types';

/** The colour an espresso extraction verdict is drawn in, wherever it is a dot. */
export function extractionTone(e: Extraction | undefined): string {
	if (e === 'sour') return 'var(--color-warning)';
	if (e === 'balanced') return 'var(--color-success)';
	if (e === 'bitter') return 'var(--color-danger)';
	return 'var(--color-faint)';
}
