import { describe, it, expect } from 'vitest';
import { resolveOrigin, resolveOrigins, isBlend, originLabel, toggleOriginChip } from './resolve';

describe('resolveOrigin', () => {
	it('matches a direct country name, case-insensitively', () => {
		expect(resolveOrigin('Ethiopia')).toEqual({ code: 'ET', country: 'Ethiopia' });
		expect(resolveOrigin('ethiopia')).toEqual({ code: 'ET', country: 'Ethiopia' });
		expect(resolveOrigin('KENYA')).toEqual({ code: 'KE', country: 'Kenya' });
	});

	it('matches multi-word country names', () => {
		expect(resolveOrigin('Costa Rica')).toEqual({ code: 'CR', country: 'Costa Rica' });
		expect(resolveOrigin('Papua New Guinea')).toEqual({
			code: 'PG',
			country: 'Papua New Guinea'
		});
	});

	it('resolves a region/locality alias to its country', () => {
		expect(resolveOrigin('Yirgacheffe')).toEqual({ code: 'ET', country: 'Ethiopia' });
		expect(resolveOrigin('Cerrado')).toEqual({ code: 'BR', country: 'Brazil' });
		expect(resolveOrigin('Blue Mountain')).toEqual({ code: 'JM', country: 'Jamaica' });
		expect(resolveOrigin('Chiang Mai')).toEqual({ code: 'TH', country: 'Thailand' });
	});

	it('resolves "locality, Country" to the country (comma is not a blend)', () => {
		expect(resolveOrigin('Yirgacheffe, Ethiopia')).toEqual({
			code: 'ET',
			country: 'Ethiopia'
		});
		expect(resolveOrigin('Huila, Colombia')).toEqual({ code: 'CO', country: 'Colombia' });
	});

	it('returns null for a multi-country blend (slash or plus)', () => {
		expect(resolveOrigin('Ethiopia / Kenya')).toBeNull();
		expect(resolveOrigin('Brazil + Colombia')).toBeNull();
	});

	it('resolves a "blend" where both parts are the same country', () => {
		// Two Ethiopian regions joined by a slash should still resolve to ET,
		// because the country is unambiguous.
		expect(resolveOrigin('Yirgacheffe / Sidamo')).toEqual({
			code: 'ET',
			country: 'Ethiopia'
		});
	});

	it('returns null for empty, nullish, or unknown input', () => {
		expect(resolveOrigin('')).toBeNull();
		expect(resolveOrigin(null)).toBeNull();
		expect(resolveOrigin(undefined)).toBeNull();
		expect(resolveOrigin('Atlantis')).toBeNull();
	});

	it('finds the country token inside a longer free-text string', () => {
		expect(resolveOrigin('Brazil Cerrado')).toEqual({ code: 'BR', country: 'Brazil' });
		expect(resolveOrigin('Kenya AA')).toEqual({ code: 'KE', country: 'Kenya' });
	});
});

describe('resolveOrigins (blend-aware, plural)', () => {
	it('returns one flag for a single origin', () => {
		expect(resolveOrigins('Ethiopia')).toEqual([{ code: 'ET', country: 'Ethiopia' }]);
		expect(resolveOrigins('Brazil Cerrado')).toEqual([{ code: 'BR', country: 'Brazil' }]);
		expect(resolveOrigins('Yirgacheffe, Ethiopia')).toEqual([{ code: 'ET', country: 'Ethiopia' }]);
	});

	it('collapses a "locality, Country" comma pair to one flag', () => {
		// The comma here separates a region from its country — not two origins.
		expect(resolveOrigins('Huila, Colombia')).toEqual([{ code: 'CO', country: 'Colombia' }]);
		expect(resolveOrigins('Nyeri, Kenya')).toEqual([{ code: 'KE', country: 'Kenya' }]);
	});

	it('treats a comma list of distinct countries as a blend (Hayes Valley case)', () => {
		expect(resolveOrigins('Colombia, Ethiopia, Peru')).toEqual([
			{ code: 'CO', country: 'Colombia' },
			{ code: 'ET', country: 'Ethiopia' },
			{ code: 'PE', country: 'Peru' }
		]);
		expect(resolveOrigins('Brazil, Guatemala')).toEqual([
			{ code: 'BR', country: 'Brazil' },
			{ code: 'GT', country: 'Guatemala' }
		]);
	});

	it('does NOT let a farm/region alias fabricate a foreign country flag', () => {
		// "Esmeralda" is a Panama region alias but also an ordinary farm name; on a
		// Colombian bag it must stay subordinate — one CO flag, not CO + PA.
		expect(resolveOrigins('Colombia, Esmeralda')).toEqual([{ code: 'CO', country: 'Colombia' }]);
		expect(resolveOrigins('Costa Rica, Esmeralda')).toEqual([
			{ code: 'CR', country: 'Costa Rica' }
		]);
		expect(resolveOrigins('Finca La Esmeralda, Colombia')).toEqual([
			{ code: 'CO', country: 'Colombia' }
		]);
		// But a named country inside a part still counts ("Panama Esmeralda" = PA).
		expect(resolveOrigins('Panama Esmeralda')).toEqual([{ code: 'PA', country: 'Panama' }]);
	});

	it('returns every distinct country in a blend, in order', () => {
		expect(resolveOrigins('Brazil + Ethiopia')).toEqual([
			{ code: 'BR', country: 'Brazil' },
			{ code: 'ET', country: 'Ethiopia' }
		]);
		expect(resolveOrigins('Ethiopia / Kenya / Colombia')).toEqual([
			{ code: 'ET', country: 'Ethiopia' },
			{ code: 'KE', country: 'Kenya' },
			{ code: 'CO', country: 'Colombia' }
		]);
	});

	it('dedupes a blend whose parts share a country', () => {
		expect(resolveOrigins('Yirgacheffe / Sidamo')).toEqual([{ code: 'ET', country: 'Ethiopia' }]);
	});

	it('skips unknown components rather than failing the whole blend', () => {
		expect(resolveOrigins('Brazil + Atlantis')).toEqual([{ code: 'BR', country: 'Brazil' }]);
		expect(resolveOrigins('Atlantis + Narnia')).toEqual([]);
	});

	it('returns [] for empty or nullish input', () => {
		expect(resolveOrigins('')).toEqual([]);
		expect(resolveOrigins(null)).toEqual([]);
		expect(resolveOrigins(undefined)).toEqual([]);
	});
});

describe('isBlend', () => {
	it('is true for an explicit separator even if a part is unknown', () => {
		expect(isBlend('Brazil + Ethiopia')).toBe(true);
		expect(isBlend('Ethiopia / Kenya')).toBe(true);
		expect(isBlend('Guatemala & Colombia')).toBe(true);
		expect(isBlend('Brazil + Atlantis')).toBe(true); // intent is explicit
	});

	it('treats a comma list as a blend only when it names >1 distinct country', () => {
		expect(isBlend('Colombia, Ethiopia, Peru')).toBe(true);
		expect(isBlend('Brazil, Guatemala')).toBe(true);
		expect(isBlend('Yirgacheffe, Ethiopia')).toBe(false); // locality + country
		expect(isBlend('Huila, Colombia')).toBe(false);
		expect(isBlend('Colombia, Esmeralda')).toBe(false); // farm alias, not a country
	});

	it('stays consistent with the flag count for explicit same-country blends', () => {
		// One resolved country ⇒ not a blend, even written with a separator.
		expect(isBlend('Yirgacheffe / Sidamo')).toBe(false);
		expect(isBlend('Huila + Colombia')).toBe(false);
		// Nothing resolves but the user explicitly joined parts ⇒ still a blend.
		expect(isBlend('Foo + Bar')).toBe(true);
	});

	it('is false for a single origin or empty input', () => {
		expect(isBlend('Ethiopia')).toBe(false);
		expect(isBlend('Brazil Cerrado')).toBe(false);
		expect(isBlend('')).toBe(false);
		expect(isBlend(null)).toBe(false);
	});
});

describe('toggleOriginChip', () => {
	const C = (code: string, country: string) => ({ code, country });

	it('adds a country to an empty or existing value', () => {
		expect(toggleOriginChip('', C('ET', 'Ethiopia'))).toBe('Ethiopia');
		expect(toggleOriginChip('Colombia, Ethiopia', C('PE', 'Peru'))).toBe(
			'Colombia, Ethiopia, Peru'
		);
	});

	it('removes a country that is already present', () => {
		expect(toggleOriginChip('Colombia, Ethiopia, Peru', C('PE', 'Peru'))).toBe(
			'Colombia, Ethiopia'
		);
		expect(toggleOriginChip('Ethiopia', C('ET', 'Ethiopia'))).toBe('');
	});

	it("preserves the value's existing separator style", () => {
		expect(toggleOriginChip('Brazil + Ethiopia', C('CO', 'Colombia'))).toBe(
			'Brazil + Ethiopia + Colombia'
		);
		expect(toggleOriginChip('Brazil + Ethiopia', C('ET', 'Ethiopia'))).toBe('Brazil');
	});

	it('round-trips add then remove back to the original', () => {
		const start = 'Colombia, Ethiopia';
		const added = toggleOriginChip(start, C('BR', 'Brazil'));
		expect(added).toBe('Colombia, Ethiopia, Brazil');
		expect(toggleOriginChip(added, C('BR', 'Brazil'))).toBe(start);
	});
});

describe('originLabel', () => {
	it('tidies a single origin to its country name', () => {
		expect(originLabel('Yirgacheffe')).toBe('Ethiopia');
		expect(originLabel('Brazil Cerrado')).toBe('Brazil');
	});

	it('keeps the raw text for a blend or an unrecognized origin', () => {
		expect(originLabel('Brazil + Ethiopia')).toBe('Brazil + Ethiopia');
		expect(originLabel('Colombia, Ethiopia, Peru')).toBe('Colombia, Ethiopia, Peru');
		expect(originLabel('Atlantis')).toBe('Atlantis');
		expect(originLabel('  ')).toBe('');
	});

	it('still tidies a "locality, Country" pair to the country', () => {
		expect(originLabel('Huila, Colombia')).toBe('Colombia');
	});
});
