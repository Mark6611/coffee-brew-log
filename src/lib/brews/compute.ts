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

export function formatTimeAgo(iso: string, now: Date = new Date()): string {
	const past = new Date(iso);
	const time = past.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: false
	});

	const sameDay = past.toDateString() === now.toDateString();
	if (sameDay) return `TODAY · ${time}`;

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (past.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

	const diffDay = (now.getTime() - past.getTime()) / 86_400_000;
	if (diffDay < 7) {
		const weekday = past.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
		return `${weekday} · ${time}`;
	}

	return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export interface BrewGroup {
	dayKey: string;
	brews: Brew[];
}

export function groupBrewsByDay(brews: Brew[], now: Date = new Date()): BrewGroup[] {
	const groups = new Map<string, Brew[]>();
	for (const brew of brews) {
		const key = dayKey(brew.brewedAt, now);
		const bucket = groups.get(key);
		if (bucket) bucket.push(brew);
		else groups.set(key, [brew]);
	}
	return Array.from(groups, ([dayKey, brews]) => ({ dayKey, brews }));
}

function dayKey(iso: string, now: Date): string {
	const past = new Date(iso);
	const dateStr = past
		.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		.toUpperCase();

	if (past.toDateString() === now.toDateString()) return `TODAY · ${dateStr}`;

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (past.toDateString() === yesterday.toDateString()) return `YESTERDAY · ${dateStr}`;

	const diffDay = (now.getTime() - past.getTime()) / 86_400_000;
	if (diffDay < 7) {
		const weekday = past.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
		return `${weekday} · ${dateStr}`;
	}

	return dateStr;
}

export interface WeekStats {
	count: number;
	avgRatio: string | null;
	favoritesCount: number;
}

export function weekStats(brews: Brew[], now: Date = new Date()): WeekStats {
	const weekAgo = new Date(now);
	weekAgo.setDate(weekAgo.getDate() - 7);
	const recent = brews.filter((b) => new Date(b.brewedAt) >= weekAgo);

	const count = recent.length;
	const avgRatioNum =
		recent.length === 0
			? null
			: recent.reduce((sum, b) => sum + ratio(b), 0) / recent.length;
	const avgRatio = avgRatioNum === null ? null : `1:${avgRatioNum.toFixed(1)}`;
	const favoritesCount = recent.filter((b) => b.isFavorite).length;

	return { count, avgRatio, favoritesCount };
}
