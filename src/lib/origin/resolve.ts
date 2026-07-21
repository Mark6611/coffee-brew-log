// Render-time origin → country resolver.
// Free-text origin is looked up against known coffee-producing countries and
// common region/locality aliases. A blend (multiple flags) is recognised from
// explicit separators ("/", "+", "&") or a comma list of distinct COUNTRIES —
// never from a region/farm alias, so "Colombia, Esmeralda" (a Colombian farm)
// stays one flag instead of gaining a spurious Panama one.

export type ResolvedOrigin = { code: string; country: string };

// Direct country names. A part that matches one of these asserts a country, and
// a comma/blend is defined by having more than one distinct such country.
const COUNTRIES: Record<string, ResolvedOrigin> = {
	ethiopia: { code: 'ET', country: 'Ethiopia' },
	kenya: { code: 'KE', country: 'Kenya' },
	colombia: { code: 'CO', country: 'Colombia' },
	brazil: { code: 'BR', country: 'Brazil' },
	guatemala: { code: 'GT', country: 'Guatemala' },
	panama: { code: 'PA', country: 'Panama' },
	indonesia: { code: 'ID', country: 'Indonesia' },
	rwanda: { code: 'RW', country: 'Rwanda' },
	burundi: { code: 'BI', country: 'Burundi' },
	costa_rica: { code: 'CR', country: 'Costa Rica' },
	thailand: { code: 'TH', country: 'Thailand' },
	vietnam: { code: 'VN', country: 'Vietnam' },
	laos: { code: 'LA', country: 'Laos' },
	myanmar: { code: 'MM', country: 'Myanmar' },
	honduras: { code: 'HN', country: 'Honduras' },
	el_salvador: { code: 'SV', country: 'El Salvador' },
	nicaragua: { code: 'NI', country: 'Nicaragua' },
	mexico: { code: 'MX', country: 'Mexico' },
	peru: { code: 'PE', country: 'Peru' },
	bolivia: { code: 'BO', country: 'Bolivia' },
	ecuador: { code: 'EC', country: 'Ecuador' },
	tanzania: { code: 'TZ', country: 'Tanzania' },
	uganda: { code: 'UG', country: 'Uganda' },
	yemen: { code: 'YE', country: 'Yemen' },
	congo: { code: 'CD', country: 'DR Congo' },
	drc: { code: 'CD', country: 'DR Congo' },
	india: { code: 'IN', country: 'India' },
	china: { code: 'CN', country: 'China' },
	philippines: { code: 'PH', country: 'Philippines' },
	east_timor: { code: 'TL', country: 'East Timor' },
	timor_leste: { code: 'TL', country: 'East Timor' },
	papua_new_guinea: { code: 'PG', country: 'Papua New Guinea' },
	jamaica: { code: 'JM', country: 'Jamaica' },
	dominican_republic: { code: 'DO', country: 'Dominican Republic' },
	haiti: { code: 'HT', country: 'Haiti' }
};

// Region / locality / farm aliases. These resolve to a country for the flag on
// a single-origin bag, but they are SUBORDINATE: in a multi-part origin they
// never add a country of their own when a country is already named. Several are
// ordinary Spanish/Portuguese words (esmeralda, santos, antigua, cerrado) that
// double as farm names in other countries — treating them as country assertions
// is exactly what produced wrong flags.
const REGIONS: Record<string, ResolvedOrigin> = {
	yirgacheffe: { code: 'ET', country: 'Ethiopia' },
	sidamo: { code: 'ET', country: 'Ethiopia' },
	guji: { code: 'ET', country: 'Ethiopia' },
	gedeb: { code: 'ET', country: 'Ethiopia' },
	cerrado: { code: 'BR', country: 'Brazil' },
	santos: { code: 'BR', country: 'Brazil' },
	huila: { code: 'CO', country: 'Colombia' },
	nyeri: { code: 'KE', country: 'Kenya' },
	antigua: { code: 'GT', country: 'Guatemala' },
	acatenango: { code: 'GT', country: 'Guatemala' },
	sumatra: { code: 'ID', country: 'Indonesia' },
	mandheling: { code: 'ID', country: 'Indonesia' },
	esmeralda: { code: 'PA', country: 'Panama' },
	chiang_mai: { code: 'TH', country: 'Thailand' },
	chiang_rai: { code: 'TH', country: 'Thailand' },
	doi_chaang: { code: 'TH', country: 'Thailand' },
	doi_chang: { code: 'TH', country: 'Thailand' },
	doi_tung: { code: 'TH', country: 'Thailand' },
	doi_inthanon: { code: 'TH', country: 'Thailand' },
	doi_pangkhon: { code: 'TH', country: 'Thailand' },
	doi_mae_salong: { code: 'TH', country: 'Thailand' },
	mae_salong: { code: 'TH', country: 'Thailand' },
	blue_mountain: { code: 'JM', country: 'Jamaica' },
	marcala: { code: 'HN', country: 'Honduras' }
};

// Combined map for the whole-string / single-origin matcher, which doesn't care
// whether a hit came from a country or a region.
const LOOKUP: Record<string, ResolvedOrigin> = { ...COUNTRIES, ...REGIONS };

// EXPLICIT blend separators. Writing "Brazil + Ethiopia" (or / or &) always
// signals a blend, even if a component doesn't resolve.
const BLEND_SPLIT = /\s*[/+&]\s*/;

// Every separator, INCLUDING the comma. The comma is ambiguous ("Yirgacheffe,
// Ethiopia" is one origin; "Colombia, Ethiopia, Peru" is a blend), so this
// wider split is only used where the country-vs-region logic below runs.
const ANY_SPLIT = /\s*[/+&,]\s*/;

// Diacritic-stripped tokens of a phrase: the whole thing underscored, then each
// word. "México" → mexico; "Costa Rica" → costa_rica + costa + rica.
function tokensOf(text: string): string[] {
	const norm = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	return [
		norm.replace(/\s+/g, '_'),
		...norm
			.split(/[,\s]+/)
			.map((t) => t.trim().replace(/\s/g, '_'))
			.filter(Boolean)
	];
}

function lookupTokens(text: string): ResolvedOrigin | null {
	for (const t of tokensOf(text)) if (LOOKUP[t]) return LOOKUP[t];
	return null;
}

// Resolve one component, distinguishing a country match from a region/farm one.
// A country token anywhere in the part wins over a region token (so "Panama
// Esmeralda" is a country, "Esmeralda" alone is a region).
type ResolvedPart = { origin: ResolvedOrigin; kind: 'country' | 'region' };
function resolvePart(part: string): ResolvedPart | null {
	const tokens = tokensOf(part);
	for (const t of tokens) if (COUNTRIES[t]) return { origin: COUNTRIES[t], kind: 'country' };
	for (const t of tokens) if (REGIONS[t]) return { origin: REGIONS[t], kind: 'region' };
	return null;
}

function dedupe(list: ResolvedOrigin[]): ResolvedOrigin[] {
	const out: ResolvedOrigin[] = [];
	const seen = new Set<string>();
	for (const o of list)
		if (!seen.has(o.code)) {
			seen.add(o.code);
			out.push(o);
		}
	return out;
}

/** Resolve a single origin token/phrase (no blend handling). Exposed so the
 *  origin input can test whether a specific chip's country is present. */
export function resolveOne(text: string | null | undefined): ResolvedOrigin | null {
	if (!text) return null;
	return lookupTokens(text);
}

export function resolveOrigin(text: string | null | undefined): ResolvedOrigin | null {
	if (!text) return null;

	// Blend: multiple parts separated by "/", "+", or "&". If they resolve to >1
	// distinct country code, return null — the separator carries the signal.
	const blendParts = text.split(BLEND_SPLIT);
	if (blendParts.length > 1) {
		const seen = new Set<string>();
		for (const p of blendParts) {
			const r = lookupTokens(p.trim());
			if (r) seen.add(r.code);
		}
		if (seen.size > 1) return null;
	}

	return lookupTokens(text);
}

/** Every distinct country a (possibly blended) origin resolves to, in the order
 *  written. A blend is defined by COUNTRY names; region/farm aliases stay
 *  subordinate so a farm called "Esmeralda" on a Colombian bag doesn't add a
 *  Panama flag. Unknown components are skipped; an all-unknown origin yields []. */
export function resolveOrigins(text: string | null | undefined): ResolvedOrigin[] {
	if (!text) return [];
	const parts = text
		.split(ANY_SPLIT)
		.map((p) => p.trim())
		.filter(Boolean);
	// One component: run the whole string through the matcher (so "Brazil
	// Cerrado" / "Kenya AA" / a lone "Yirgacheffe" still resolve).
	if (parts.length <= 1) {
		const r = lookupTokens(text);
		return r ? [r] : [];
	}
	const resolved = parts
		.map(resolvePart)
		.filter((p): p is ResolvedPart => p != null);
	const countries = dedupe(resolved.filter((p) => p.kind === 'country').map((p) => p.origin));
	if (countries.length) return countries;
	// No country named outright — fall back to the distinct regions' countries so
	// "Yirgacheffe / Sidamo" still reads as a single Ethiopia flag.
	return dedupe(resolved.map((p) => p.origin));
}

/** Whether the origin is a blend. More than one resolved country is always a
 *  blend. Otherwise an EXPLICIT separator ("+", "/", "&") joining several parts
 *  is a blend too — UNLESS every part resolves to the same single country, which
 *  is just one origin's regions ("Yirgacheffe / Sidamo", "Huila + Colombia").
 *  A comma alone never forces a blend; it's governed purely by the flag count,
 *  so "Colombia, Esmeralda" (a farm) and "Huila, Colombia" stay single. */
export function isBlend(text: string | null | undefined): boolean {
	if (!text) return false;
	const flags = resolveOrigins(text);
	if (flags.length > 1) return true;
	const explicitParts = text
		.split(BLEND_SPLIT)
		.map((p) => p.trim())
		.filter(Boolean);
	if (explicitParts.length <= 1) return false;
	const collapsesToOneCountry = flags.length === 1 && explicitParts.every((p) => resolveOne(p));
	return !collapsesToOneCountry;
}

/** Human label to sit beside the flag(s): the tidy country name for a single
 *  resolved origin (so "Yirgacheffe" reads as "Ethiopia"), else the raw text as
 *  written (blends and unrecognized origins keep the user's own wording). */
export function originLabel(text: string | null | undefined): string {
	const flags = resolveOrigins(text);
	if (flags.length === 1) return flags[0].country;
	return text?.trim() ?? '';
}

/** Add or remove a country from a free-text origin value — the origin chip
 *  picker's whole behaviour, extracted here so it's unit-testable (the input is
 *  a Svelte component). Preserves the separator the value already uses (comma
 *  vs " + "); removing drops every written part that resolves to the country. */
export function toggleOriginChip(value: string, country: ResolvedOrigin): string {
	const present = resolveOrigins(value).some((r) => r.code === country.code);
	const sep = /[/+&]/.test(value) ? ' + ' : value.includes(',') ? ', ' : ' + ';
	if (present) {
		const parts = value
			.split(ANY_SPLIT)
			.map((p) => p.trim())
			.filter(Boolean);
		return parts.filter((p) => resolveOne(p)?.code !== country.code).join(sep);
	}
	const t = value.trim();
	return t ? `${t}${sep}${country.country}` : country.country;
}

// Curated quick-pick set for the origin chip row — the most-logged producing
// countries, ordered by rough specialty prevalence (Thailand kept high; it's
// local). Each already exists in COUNTRIES; this only fixes their order + subset.
export const POPULAR_ORIGINS: ResolvedOrigin[] = [
	{ code: 'ET', country: 'Ethiopia' },
	{ code: 'CO', country: 'Colombia' },
	{ code: 'BR', country: 'Brazil' },
	{ code: 'GT', country: 'Guatemala' },
	{ code: 'KE', country: 'Kenya' },
	{ code: 'HN', country: 'Honduras' },
	{ code: 'CR', country: 'Costa Rica' },
	{ code: 'ID', country: 'Indonesia' },
	{ code: 'TH', country: 'Thailand' },
	{ code: 'PA', country: 'Panama' },
	{ code: 'PE', country: 'Peru' },
	{ code: 'MX', country: 'Mexico' }
];
