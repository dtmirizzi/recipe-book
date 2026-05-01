import 'server-only';
import { eq, isNull, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipes, recipeIngredients, pantryItems, ingredients } from '@/db/schema';
import { parseQuery, type ParsedQuery } from '@/lib/search/parse-query';
import { scoreRecipe, type RecipeForScoring, type PantryEntry, type ScoredRecipe } from '@/lib/search/score';

export async function smartSearch(userId: string, query: string): Promise<{
  parsed: ParsedQuery;
  results: ScoredRecipe[];
}> {
  // Pull the user's pantry
  const pantryRows = await db
    .select({
      ingredientId: pantryItems.ingredientId,
      name: ingredients.name,
      expiresAt: pantryItems.expiresAt,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(ingredients.id, pantryItems.ingredientId))
    .where(eq(pantryItems.userId, userId));

  const pantry: PantryEntry[] = pantryRows.map((p) => ({
    ingredientId: p.ingredientId,
    name: p.name,
    expiresAt: p.expiresAt ? String(p.expiresAt) : null,
  }));

  // Parse the query — pass known canonical ingredient names for must-use detection
  const allIngredientNames = await db.select({ name: ingredients.name }).from(ingredients);
  const parsed = await parseQuery(query, {
    knownIngredients: allIngredientNames.map((r) => r.name),
  });

  // Pull all of the user's non-deleted recipes
  const baseRecipes = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      totalMinutes: recipes.totalMinutes,
      dietaryTags: recipes.dietaryTags,
      cuisine: recipes.cuisine,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNull(recipes.deletedAt)));

  if (baseRecipes.length === 0) {
    return { parsed, results: [] };
  }

  const ids = baseRecipes.map((r) => r.id);
  const ingsRows = await db
    .select({ recipeId: recipeIngredients.recipeId, name: recipeIngredients.name })
    .from(recipeIngredients)
    .where(inArray(recipeIngredients.recipeId, ids));

  const ingMap = new Map<string, string[]>();
  for (const r of baseRecipes) ingMap.set(r.id, []);
  for (const i of ingsRows) ingMap.get(i.recipeId)?.push(i.name);

  const candidates: RecipeForScoring[] = baseRecipes.map((r) => ({
    id: r.id,
    title: r.title,
    totalMinutes: r.totalMinutes,
    dietaryTags: r.dietaryTags ?? [],
    cuisine: r.cuisine,
    ingredientNames: ingMap.get(r.id) ?? [],
  }));

  const scored: ScoredRecipe[] = [];
  for (const c of candidates) {
    const s = scoreRecipe(c, pantry, parsed);
    if (s) scored.push(s);
  }

  scored.sort((a, b) => b.score - a.score);
  return { parsed, results: scored.slice(0, 12) };
}
