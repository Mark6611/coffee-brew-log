// Unanswered age-rating questions — split out of asc-preflight.mjs so the rule
// can be tested without calling App Store Connect.
//
// Apple adds age-rating questions over time, and an existing app gets each new
// one as `null`. Nothing flags it until App Review submission: adding the
// version to a review submission 409s with
//   /v1/ageRatingDeclarations/<id>: You must provide a value for the attribute 'socialMedia'
// (1.6, 2026-11-06 — `socialMedia` and `socialMediaAgeRestricted` had arrived
// after 1.5 shipped). So: any null attribute is an unanswered question, except
// the ones below that are null by design.

/** Attributes whose null is a real answer, not a missing one. */
export const OPTIONAL_AGE_FIELDS = new Set([
	'kidsAgeBand', // null = not in the Kids category
	'gracRatingClassificationNumber', // Korea GRAC number, only for rated games
	'developerAgeRatingInfoUrl' // optional link
]);

/**
 * Names of the unanswered questions in an ageRatingDeclarations `attributes`
 * object. A `<parent>AgeRestricted` follow-up only needs an answer when its
 * parent is true (ASC accepted socialMedia:false with the follow-up left null).
 * @param {Record<string, unknown> | null | undefined} attrs
 * @returns {string[]}
 */
export function unansweredAgeRating(attrs) {
	if (!attrs) return [];
	return Object.entries(attrs)
		.filter(([key, value]) => {
			if (value !== null) return false;
			if (OPTIONAL_AGE_FIELDS.has(key)) return false;
			const parent = key.match(/^(.+)AgeRestricted$/)?.[1];
			if (parent && attrs[parent] === false) return false;
			return true;
		})
		.map(([key]) => key);
}
