// Render-time origin → country resolver.
// Free-text origin is looked up against known coffee-producing countries and
// common region/locality aliases. Returns null when nothing matches, when the
// origin is empty, or when the string is an unambiguous multi-country blend
// (separated by "/" or "+").

export type ResolvedOrigin = { code: string; country: string };

const LOOKUP: Record<string, ResolvedOrigin> = {
	// direct country names
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
	// Americas
	honduras: { code: 'HN', country: 'Honduras' },
	el_salvador: { code: 'SV', country: 'El Salvador' },
	nicaragua: { code: 'NI', country: 'Nicaragua' },
	mexico: { code: 'MX', country: 'Mexico' },
	peru: { code: 'PE', country: 'Peru' },
	bolivia: { code: 'BO', country: 'Bolivia' },
	ecuador: { code: 'EC', country: 'Ecuador' },
	// Africa
	tanzania: { code: 'TZ', country: 'Tanzania' },
	uganda: { code: 'UG', country: 'Uganda' },
	yemen: { code: 'YE', country: 'Yemen' },
	congo: { code: 'CD', country: 'DR Congo' },
	drc: { code: 'CD', country: 'DR Congo' },
	// Asia / Pacific
	india: { code: 'IN', country: 'India' },
	china: { code: 'CN', country: 'China' },
	philippines: { code: 'PH', country: 'Philippines' },
	east_timor: { code: 'TL', country: 'East Timor' },
	timor_leste: { code: 'TL', country: 'East Timor' },
	papua_new_guinea: { code: 'PG', country: 'Papua New Guinea' },
	// Caribbean
	jamaica: { code: 'JM', country: 'Jamaica' },
	dominican_republic: { code: 'DO', country: 'Dominican Republic' },
	haiti: { code: 'HT', country: 'Haiti' },

	// common region / locality aliases
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
	// iconic single-origin region aliases
	blue_mountain: { code: 'JM', country: 'Jamaica' },
	marcala: { code: 'HN', country: 'Honduras' }
};

function lookupTokens(text: string): ResolvedOrigin | null {
	// Strip diacritics so native spellings resolve too — "México"/"Perú"/"Panamá",
	// as printed on many bags, previously returned null (no flag/chip) while the
	// ASCII "Mexico"/"Peru"/"Panama" resolved fine. LOOKUP keys are ASCII.
	const norm = text.normalize('NFD').replace(/\p{M}/gu, '');
	const tokens = [
		norm.toLowerCase().replace(/\s+/g, '_'),
		...norm
			.toLowerCase()
			.split(/[,\s]+/)
			.map((t) => t.trim().replace(/\s/g, '_'))
			.filter(Boolean)
	];
	for (const t of tokens) if (LOOKUP[t]) return LOOKUP[t];
	return null;
}

// Blend component separators. A comma is deliberately NOT one — "Yirgacheffe,
// Ethiopia" is a single origin (locality + country), not a two-country blend.
const BLEND_SPLIT = /\s*[/+&]\s*/;

/** Resolve a single origin token/phrase (no blend handling). Exposed so the
 *  origin input can test whether a specific chip's country is already present. */
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

/** Whether the origin names more than one component (a blend), regardless of
 *  whether every component resolves to a known country. */
export function isBlend(text: string | null | undefined): boolean {
	if (!text) return false;
	return (
		text
			.split(BLEND_SPLIT)
			.map((p) => p.trim())
			.filter(Boolean).length > 1
	);
}

/** Every distinct country a (possibly blended) origin resolves to, in the order
 *  written. Unknown components are simply skipped, so an all-unknown blend
 *  yields []. This is the multi-flag counterpart to resolveOrigin. */
export function resolveOrigins(text: string | null | undefined): ResolvedOrigin[] {
	if (!text) return [];
	const parts = text
		.split(BLEND_SPLIT)
		.map((p) => p.trim())
		.filter(Boolean);
	// Single component: run the whole string through the token matcher (so
	// "Brazil Cerrado" or "Huila, Colombia" still resolves). Multi: per part.
	const sources = parts.length > 1 ? parts : [text];
	const out: ResolvedOrigin[] = [];
	const seen = new Set<string>();
	for (const s of sources) {
		const r = lookupTokens(s);
		if (r && !seen.has(r.code)) {
			seen.add(r.code);
			out.push(r);
		}
	}
	return out;
}

/** Human label to sit beside the flag(s): the tidy country name for a single
 *  resolved origin (so "Yirgacheffe" reads as "Ethiopia"), else the raw text
 *  as written (blends and unrecognized origins keep the user's own wording). */
export function originLabel(text: string | null | undefined): string {
	const flags = resolveOrigins(text);
	if (flags.length === 1) return flags[0].country;
	return text?.trim() ?? '';
}

// Curated quick-pick set for the origin chip row — the most-logged producing
// countries, ordered by rough specialty prevalence (Thailand kept high; it's
// local). Each already exists in LOOKUP; this only fixes their order + subset.
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
