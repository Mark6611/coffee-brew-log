import { z } from 'zod';

export const ProcessSchema = z.enum(['washed', 'natural', 'honey', 'anaerobic']);
export type Process = z.infer<typeof ProcessSchema>;

export const RoastLevelSchema = z.enum(['light', 'medium', 'medium-dark', 'dark']);
export type RoastLevel = z.infer<typeof RoastLevelSchema>;

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
	createdAt: z.string().datetime(),
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
	yieldGrams: z.number().positive()
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
