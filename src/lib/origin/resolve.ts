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

export function resolveOrigin(text: string | null | undefined): ResolvedOrigin | null {
	if (!text) return null;

	// Blend: multiple parts separated by "/" or "+". If they resolve to >1
	// distinct country code, return null — the slash carries the signal.
	const blendParts = text.split(/\s*[/+]\s*/);
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
