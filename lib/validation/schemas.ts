import { z } from 'zod';

export const ingredientSchema = z.object({
  rawText: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const stepSchema = z.object({
  body: z.string().min(1),
});

export const recipeDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  baseServings: z.number().int().min(1).max(99).default(4),
  prepMinutes: z.number().int().min(0).nullable().optional(),
  cookMinutes: z.number().int().min(0).nullable().optional(),
  cuisine: z.string().nullable().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side', 'sauce']).nullable().optional(),
  dietaryTags: z.array(z.string()).default([]),
  ingredients: z.array(ingredientSchema),
  steps: z.array(stepSchema),
  sourceUrl: z.string().url().nullable().optional(),
  sourcePhotoUrl: z.string().url().nullable().optional(),
  sourceText: z.string().nullable().optional(),
});

export type RecipeDraft = z.infer<typeof recipeDraftSchema>;

export const cookQuerySchema = z.object({
  query: z.string().min(1).max(500),
});
