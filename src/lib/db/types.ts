import { z } from 'zod';

export const ProcessSchema = z.enum(['washed', 'natural', 'honey', 'anaerobic']);
export type Process = z.infer<typeof ProcessSchema>;

export const RoastLevelSchema = z.enum(['light', 'medium', 'medium-dark', 'dark']);
export type RoastLevel = z.infer<typeof RoastLevelSchema>;

// Espresso extraction verdict (sour ↔ balanced ↔ bitter) — the actionable
// dial-in taste axis. Distinct from `balance` (light/balanced/heavy), which
// measures body: a shot can be heavy AND sour.
export const ExtractionSchema = z.enum(['sour', 'balanced', 'bitter']);
export type Extraction = z.infer<typeof ExtractionSchema>;

// A settled espresso recipe, snapshotted onto the bag when the user taps
// "Mark dialed". The one sanctioned exception to "computed at read time,
// never stored": it's a user declaration, not a computation.
export const DialedRecipeSchema = z.object({
	grind: z.string().min(1),
	doseG: z.number().positive(),
	yieldG: z.number().positive(),
	timeS: z.number().positive(),
	tempC: z.number().positive().optional(),
	declaredAt: z.string().datetime()
});
export type DialedRecipe = z.infer<typeof DialedRecipeSchema>;

export const BagSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1),
	roaster: z.string().min(1).optional(),
	origin: z.string().min(1).optional(),
	roastedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	process: ProcessSchema.optional(),
	roastLevel: RoastLevelSchema.optional(),
	weightGrams: z.number().positive().optional(),
	pricePaid: z.number().nonnegative().optional(),
	notes: z.string().optional(),
	archived: z.boolean().optional(),
	// Bag-label photo, stored inline as a downscaled JPEG data URL (see
	// $lib/photo/resize). nullish, not optional: clearing the photo must push an
	// explicit null through the upsert to blank the server column.
	photo: z.string().nullish(),
	createdAt: z.string().datetime(),
	// Settled espresso recipe (user-declared via "Mark dialed"; JSONB in Supabase).
	// nullish, not optional: RE-OPEN must push an explicit null through the
	// upsert to clear the server column — an absent key would leave it stale.
	dialedRecipe: DialedRecipeSchema.nullish(),
	// Tombstone marker. Set on soft-delete; null/absent means alive. Read paths
	// in repository.ts filter these out. Kept in the database for cross-device
	// delete propagation (without it, a delete on one device gets re-pulled
	// from the server on another).
	deletedAt: z.string().datetime().optional()
});

export type Bag = z.infer<typeof BagSchema>;

// Frozen subset of a bag, embedded into a published brew so the post is
// self-contained (editing/deleting the bag later doesn't rewrite history).
// See project_html_brew_handoff.md, "Architecture decisions" #5.
export const BagSnapshotSchema = z.object({
	name: z.string().min(1),
	roaster: z.string().min(1).optional(),
	origin: z.string().min(1).optional(),
	process: ProcessSchema.optional(),
	roastedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	weightGrams: z.number().positive().optional()
});

export type BagSnapshot = z.infer<typeof BagSnapshotSchema>;

const BrewBase = z.object({
	id: z.string().uuid(),
	brewedAt: z.string().datetime(),
	coffeeName: z.string().min(1).optional(),
	roaster: z.string().min(1).optional(),
	bagId: z.string().uuid().optional(),
	doseGrams: z.number().positive(),
	brewTimeSeconds: z.number().positive(),
	grindSetting: z.string().min(1),
	notes: z.string().optional(),
	rating: z.number().min(0.5).max(5).optional(),
	balance: z.enum(['light', 'balanced', 'heavy']).optional(),
	isFavorite: z.boolean().optional(),
	// Photo of the cup/setup, stored inline as a downscaled JPEG data URL. See
	// BagSchema.photo — nullish for the same clear-on-remove reason.
	photo: z.string().nullish(),
	// See BagSchema.deletedAt — same semantics.
	deletedAt: z.string().datetime().optional(),
	// Blog publishing (Phase A) — see project_html_brew_handoff.md.
	// All optional at the schema level: a brew is fine to exist without any
	// of these. They become meaningful when `published === true`.
	published: z.boolean().optional(),
	publishedAt: z.string().datetime().optional(),
	blogTitle: z.string().min(1).optional(),
	blogBody: z.string().min(1).optional(),
	bagSnapshot: BagSnapshotSchema.optional()
});

export const EspressoBrewSchema = BrewBase.extend({
	method: z.literal('espresso'),
	yieldGrams: z.number().positive(),
	// Dial-in taste axis (espresso-only; drives resolveNextShot()).
	extraction: ExtractionSchema.optional(),
	// Brew temp as set on the machine (Series 1 profiles) — optional, espresso
	// reuses the same column name pour-over already has.
	waterTempC: z.number().positive().optional()
});

export const PourOverBrewSchema = BrewBase.extend({
	method: z.literal('pour-over'),
	waterGrams: z.number().positive(),
	waterTempC: z.number().positive().optional()
});

export const BrewSchema = z.discriminatedUnion('method', [
	EspressoBrewSchema,
	PourOverBrewSchema
]);

export type EspressoBrew = z.infer<typeof EspressoBrewSchema>;
export type PourOverBrew = z.infer<typeof PourOverBrewSchema>;
export type Brew = z.infer<typeof BrewSchema>;
