import { describe, it, expect } from 'vitest';
import { resolveOrigin } from './resolve';

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
