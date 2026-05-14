import type { Brew } from '$lib/db/types';

export function ratio(brew: Brew): number {
	const numerator = brew.method === 'espresso' ? brew.yieldGrams : brew.waterGrams;
	return numerator / brew.doseGrams;
}

export function formatRatio(brew: Brew): string {
	return `1:${ratio(brew).toFixed(1)}`;
}

export function formatBrewTime(brew: Brew): string {
	if (brew.method === 'pour-over') {
		const m = Math.floor(brew.brewTimeSeconds / 60);
		const s = Math.round(brew.brewTimeSeconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
	return `${brew.brewTimeSeconds}s`;
}
