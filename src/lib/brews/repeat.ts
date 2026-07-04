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
		brewedAtLocal: localDatetimeNow()
	};
}

/** Stage the prefill and return the path the caller should navigate to. */
export function stageBrewAgain(brew: Brew): string {
	sessionStorage.setItem(BREW_DRAFT_KEY, JSON.stringify(brewAgainDraft(brew)));
	return '/brews/new';
}
