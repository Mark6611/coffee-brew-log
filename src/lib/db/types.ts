import { z } from 'zod';

const BrewBase = z.object({
	id: z.string().uuid(),
	brewedAt: z.string().datetime(),
	coffeeName: z.string().min(1).optional(),
	roaster: z.string().min(1).optional(),
	doseGrams: z.number().positive(),
	brewTimeSeconds: z.number().positive(),
	grindSetting: z.string().min(1),
	notes: z.string().optional(),
	rating: z.number().min(1).max(5).optional(),
	balance: z.enum(['light', 'balanced', 'heavy']).optional(),
	isFavorite: z.boolean().optional()
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
