import { describe, expect, it } from 'vitest';
import { parseIngredient } from '@/lib/parsing/ingredients';

describe('parseIngredient', () => {
  it('parses simple "2 tbsp olive oil"', () => {
    expect(parseIngredient('2 tbsp olive oil')).toMatchObject({
      quantity: 2,
      unit: 'tbsp',
      name: 'olive oil',
    });
  });
  it('parses fractions like "1/2 cup milk"', () => {
    expect(parseIngredient('1/2 cup milk')).toMatchObject({
      quantity: 0.5,
      unit: 'cup',
      name: 'milk',
    });
  });
  it('parses mixed numbers like "1 1/2 cups flour"', () => {
    expect(parseIngredient('1 1/2 cups flour')).toMatchObject({
      quantity: 1.5,
      unit: 'cups',
      name: 'flour',
    });
  });
  it('captures trailing notes after a comma', () => {
    expect(parseIngredient('2 cloves garlic, minced')).toMatchObject({
      quantity: 2,
      unit: 'cloves',
      name: 'garlic',
      note: 'minced',
    });
  });
  it('handles unitless ingredients', () => {
    expect(parseIngredient('1 lemon, juiced')).toMatchObject({
      quantity: 1,
      unit: null,
      name: 'lemon',
      note: 'juiced',
    });
  });
});
