import { describe, expect, it } from 'vitest';
import { scoreRecipe, type RecipeForScoring, type PantryEntry } from '@/lib/search/score';

const baseRecipe: RecipeForScoring = {
  id: 'r1',
  title: 'Lemon Chicken',
  totalMinutes: 30,
  dietaryTags: ['quick'],
  ingredientNames: ['olive oil', 'chicken thighs', 'garlic', 'lemon'],
  cuisine: 'American',
};

const fullPantry: PantryEntry[] = [
  { ingredientId: '1', name: 'olive oil', expiresAt: null },
  { ingredientId: '2', name: 'chicken thighs', expiresAt: null },
  { ingredientId: '3', name: 'garlic', expiresAt: null },
  { ingredientId: '4', name: 'lemon', expiresAt: null },
];

describe('scoreRecipe', () => {
  it('returns null when a required diet tag is missing', () => {
    const out = scoreRecipe(baseRecipe, [], {
      dietaryRequired: ['vegan'],
      dietaryAvoid: [],
      mustUseIngredients: [],
      prioritizeExpiring: false,
      rawQuery: 'vegan something',
    });
    expect(out).toBeNull();
  });

  it('filters out recipes that exceed time budget', () => {
    const out = scoreRecipe(baseRecipe, [], {
      timeMaxMinutes: 15,
      dietaryRequired: [],
      dietaryAvoid: [],
      mustUseIngredients: [],
      prioritizeExpiring: false,
      rawQuery: 'fast',
    });
    expect(out).toBeNull();
  });

  it('scores 100% match when pantry has every ingredient', () => {
    const out = scoreRecipe(baseRecipe, fullPantry, {
      dietaryRequired: [],
      dietaryAvoid: [],
      mustUseIngredients: [],
      prioritizeExpiring: false,
      rawQuery: 'whatever',
    });
    expect(out).not.toBeNull();
    expect(out!.matchPct).toBe(100);
    expect(out!.missingIngredients).toEqual([]);
  });

  it('flags expiring pantry items in the result metadata', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const pantry: PantryEntry[] = [
      ...fullPantry.slice(0, 3),
      { ingredientId: '4', name: 'lemon', expiresAt: tomorrow },
    ];
    const out = scoreRecipe(baseRecipe, pantry, {
      dietaryRequired: [],
      dietaryAvoid: [],
      mustUseIngredients: [],
      prioritizeExpiring: true,
      rawQuery: 'use the lemons',
    });
    expect(out).not.toBeNull();
    expect(out!.expiringIngredients).toContain('lemon');
  });

  it('boosts score when must-use ingredient is present', () => {
    const withMust = scoreRecipe(baseRecipe, fullPantry, {
      dietaryRequired: [],
      dietaryAvoid: [],
      mustUseIngredients: ['chicken'],
      prioritizeExpiring: false,
      rawQuery: 'chicken',
    });
    const without = scoreRecipe(baseRecipe, fullPantry, {
      dietaryRequired: [],
      dietaryAvoid: [],
      mustUseIngredients: [],
      prioritizeExpiring: false,
      rawQuery: '',
    });
    expect(withMust!.score).toBeGreaterThan(without!.score);
  });
});
