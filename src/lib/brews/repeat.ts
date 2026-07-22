import type { Brew } from '$lib/db/types';

// "Brew again" — repeat a past brew's recipe as a fresh log. Shared by the
// brew detail page and the history card so both stage an identical prefill.
// The subjective fields (rating, balance, extraction) are cleared so the next
// cup is judged from scratch; the recipe (dose/yield/water/temp/time/grind) and
// notes carry over. The prefill rides the same sessionStorage draft the new-brew
// form already consumes.

export const BREW_DRAFT_KEY = 'brew-form-draft';

function localDatetimeNow(): string {
	const now = new Date();
	const tz = now.getTimezoneOffset() * 60_000;
	return new Date(now.getTime() - tz).toISOString().slice(0, 16);
}

/** The new-brew form draft that repeats `brew`, minus its taste verdicts. */
export function brewAgainDraft(brew: Brew) {
	return {
		method: brew.method,
		bagId: brew.bagId,
		doseGrams: brew.doseGrams,
		yieldGrams: brew.method === 'espresso' ? brew.yieldGrams : null,
		waterGrams: brew.method === 'pour-over' ? brew.waterGrams : null,
		waterTempC: brew.waterTempC ?? null,
		brewTimeSeconds: brew.method === 'espresso' ? brew.brewTimeSeconds : null,
		brewMinutes: brew.method === 'pour-over' ? Math.floor(brew.brewTimeSeconds / 60) : null,
		brewSecondsPart: brew.method === 'pour-over' ? brew.brewTimeSeconds % 60 : null,
		grindSetting: brew.grindSetting,
		notes: brew.notes ?? '',
		rating: null,
		balance: '',
		brewedAtLocal: localDatetimeNow(),
		// The new-brew form discards drafts without a fresh savedAt (staleness
		// gate) — omitting this silently blanked every "brew again" prefill.
		savedAt: Date.now()
	};
}

/**
 * Stage the prefill. The caller navigates to /brews/new itself.
 *
 * Deliberately does NOT import `$app/paths` to return a resolved path: this
 * directory is the pure-logic half of the app and every sibling has a unit
 * test, but vitest.config.ts only aliases `$lib`, so a `$app/*` runtime import
 * makes the whole module — brewAgainDraft included — unimportable under vitest.
 */
export function stageBrewAgain(brew: Brew): void {
	sessionStorage.setItem(BREW_DRAFT_KEY, JSON.stringify(brewAgainDraft(brew)));
}
