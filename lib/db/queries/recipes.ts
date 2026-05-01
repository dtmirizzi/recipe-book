import 'server-only';
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipes, recipeIngredients, recipeSteps } from '@/db/schema';
import type { Recipe } from '@/db/schema';

export type LibraryFilters = {
  q?: string;
  cuisine?: string;
  meal?: string;
  time?: string;
  tag?: string;
};

export type RecipeListItem = Recipe & { ingredientNames: string[] };

const TIME_BUCKETS: Record<string, [number, number]> = {
  '15': [0, 15],
  '30': [16, 30],
  '60': [31, 60],
  '60+': [61, 99999],
};

export async function listRecipes(userId: string, filters: LibraryFilters = {}): Promise<RecipeListItem[]> {
  const conds = [eq(recipes.userId, userId), isNull(recipes.deletedAt)];

  if (filters.cuisine) conds.push(eq(recipes.cuisine, filters.cuisine));
  if (filters.meal) conds.push(eq(recipes.mealType, filters.meal as never));

  if (filters.time && TIME_BUCKETS[filters.time]) {
    const [lo, hi] = TIME_BUCKETS[filters.time];
    conds.push(sql`coalesce(${recipes.totalMinutes}, 0) between ${lo} and ${hi}`);
  }

  if (filters.tag) {
    conds.push(sql`${filters.tag} = any(${recipes.dietaryTags})`);
  }

  if (filters.q) {
    const pattern = `%${filters.q.toLowerCase()}%`;
    conds.push(
      sql`(lower(${recipes.title}) like ${pattern}
           or exists (
             select 1 from ${recipeIngredients} ri
             where ri.recipe_id = ${recipes.id}
             and lower(ri.name) like ${pattern}
           ))`,
    );
  }

  const rows = await db
    .select()
    .from(recipes)
    .where(and(...conds))
    .orderBy(desc(recipes.createdAt))
    .limit(200);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const ings = await db
    .select({ recipeId: recipeIngredients.recipeId, name: recipeIngredients.name })
    .from(recipeIngredients)
    .where(inArray(recipeIngredients.recipeId, ids));

  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.id, []);
  for (const i of ings) map.get(i.recipeId)?.push(i.name);

  return rows.map((r) => ({ ...r, ingredientNames: map.get(r.id) ?? [] }));
}

export async function getRecipe(userId: string, id: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), eq(recipes.userId, userId), isNull(recipes.deletedAt)),
  });
  if (!recipe) return null;
  const [ings, steps] = await Promise.all([
    db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(recipeIngredients.ordinal),
    db
      .select()
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.ordinal),
  ]);
  return { ...recipe, ingredients: ings, steps };
}

export type RecipeDraftInput = {
  title: string;
  description?: string | null;
  baseServings: number;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  cuisine?: string | null;
  mealType?: string | null;
  dietaryTags?: string[];
  sourceUrl?: string | null;
  sourcePhotoUrl?: string | null;
  sourceText?: string | null;
  ingredients: Array<{
    rawText: string;
    name: string;
    quantity?: number | null;
    unit?: string | null;
    note?: string | null;
  }>;
  steps: Array<{ body: string }>;
};

export async function createRecipe(userId: string, draft: RecipeDraftInput): Promise<string> {
  const totalMinutes =
    (draft.prepMinutes ?? 0) + (draft.cookMinutes ?? 0) || null;

  return await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(recipes)
      .values({
        userId,
        title: draft.title,
        description: draft.description ?? null,
        baseServings: draft.baseServings,
        prepMinutes: draft.prepMinutes ?? null,
        cookMinutes: draft.cookMinutes ?? null,
        totalMinutes,
        cuisine: draft.cuisine ?? null,
        mealType: (draft.mealType as never) ?? null,
        dietaryTags: draft.dietaryTags ?? [],
        sourceUrl: draft.sourceUrl ?? null,
        sourcePhotoUrl: draft.sourcePhotoUrl ?? null,
        sourceText: draft.sourceText ?? null,
      })
      .returning({ id: recipes.id });

    if (draft.ingredients.length) {
      await tx.insert(recipeIngredients).values(
        draft.ingredients.map((ing, idx) => ({
          recipeId: row.id,
          ordinal: idx,
          rawText: ing.rawText,
          name: ing.name,
          quantity: ing.quantity != null ? String(ing.quantity) : null,
          unit: ing.unit ?? null,
          note: ing.note ?? null,
        })),
      );
    }

    if (draft.steps.length) {
      await tx.insert(recipeSteps).values(
        draft.steps.map((s, idx) => ({
          recipeId: row.id,
          ordinal: idx,
          body: s.body,
        })),
      );
    }

    return row.id;
  });
}

export async function updateRecipe(userId: string, id: string, draft: RecipeDraftInput): Promise<void> {
  const totalMinutes =
    (draft.prepMinutes ?? 0) + (draft.cookMinutes ?? 0) || null;

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(recipes)
      .set({
        title: draft.title,
        description: draft.description ?? null,
        baseServings: draft.baseServings,
        prepMinutes: draft.prepMinutes ?? null,
        cookMinutes: draft.cookMinutes ?? null,
        totalMinutes,
        cuisine: draft.cuisine ?? null,
        mealType: (draft.mealType as never) ?? null,
        dietaryTags: draft.dietaryTags ?? [],
        sourceUrl: draft.sourceUrl ?? null,
        sourcePhotoUrl: draft.sourcePhotoUrl ?? null,
        sourceText: draft.sourceText ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
      .returning({ id: recipes.id });

    if (!updated) throw new Error('Recipe not found');

    await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    if (draft.ingredients.length) {
      await tx.insert(recipeIngredients).values(
        draft.ingredients.map((ing, idx) => ({
          recipeId: id,
          ordinal: idx,
          rawText: ing.rawText,
          name: ing.name,
          quantity: ing.quantity != null ? String(ing.quantity) : null,
          unit: ing.unit ?? null,
          note: ing.note ?? null,
        })),
      );
    }

    await tx.delete(recipeSteps).where(eq(recipeSteps.recipeId, id));
    if (draft.steps.length) {
      await tx.insert(recipeSteps).values(
        draft.steps.map((s, idx) => ({
          recipeId: id,
          ordinal: idx,
          body: s.body,
        })),
      );
    }
  });
}

export async function softDeleteRecipe(userId: string, id: string) {
  await db
    .update(recipes)
    .set({ deletedAt: new Date() })
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));
}

export async function listFacets(userId: string) {
  const rows = await db
    .select({
      cuisine: recipes.cuisine,
      mealType: recipes.mealType,
      dietaryTags: recipes.dietaryTags,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, userId), isNull(recipes.deletedAt)));

  const cuisines = new Set<string>();
  const meals = new Set<string>();
  const tags = new Set<string>();
  for (const r of rows) {
    if (r.cuisine) cuisines.add(r.cuisine);
    if (r.mealType) meals.add(r.mealType);
    for (const t of r.dietaryTags ?? []) tags.add(t);
  }
  return {
    cuisines: [...cuisines].sort(),
    meals: [...meals].sort(),
    tags: [...tags].sort(),
  };
}
