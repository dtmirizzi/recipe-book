import 'server-only';
import { and, desc, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipes, recipeIngredients, recipeSteps, recipeMedia, roundtableMembers, users } from '@/db/schema';
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
  // Owner-only fast path; preserves the existing semantic for write/edit callers.
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), eq(recipes.userId, userId), isNull(recipes.deletedAt)),
  });
  if (!recipe) return null;
  const [ings, steps, media] = await Promise.all([
    db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, id)).orderBy(recipeIngredients.ordinal),
    db.select().from(recipeSteps).where(eq(recipeSteps.recipeId, id)).orderBy(recipeSteps.ordinal),
    db.select().from(recipeMedia).where(eq(recipeMedia.recipeId, id)).orderBy(recipeMedia.ordinal),
  ]);
  return { ...recipe, ingredients: ings, steps, media };
}

/**
 * Fetch a recipe a viewer is allowed to see: they own it, OR it's public,
 * OR they share a roundtable with the owner. Returns the recipe + author info
 * + an `isOwner` flag.
 */
export async function getViewableRecipe(viewerId: string, id: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), isNull(recipes.deletedAt)),
  });
  if (!recipe) return null;

  const isOwner = recipe.userId === viewerId;
  let allowed = isOwner || recipe.visibility === 'public';
  if (!allowed) {
    // Shared via roundtable: do viewer + owner share any roundtable?
    const shared = await db
      .select({ rt: roundtableMembers.roundtableId })
      .from(roundtableMembers)
      .where(eq(roundtableMembers.userId, viewerId));
    if (shared.length > 0) {
      const ownerRows = await db
        .select({ rt: roundtableMembers.roundtableId })
        .from(roundtableMembers)
        .where(
          and(
            eq(roundtableMembers.userId, recipe.userId),
            inArray(
              roundtableMembers.roundtableId,
              shared.map((s) => s.rt),
            ),
          ),
        );
      allowed = ownerRows.length > 0;
    }
  }
  if (!allowed) return null;

  const [ings, steps, media, author] = await Promise.all([
    db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, id)).orderBy(recipeIngredients.ordinal),
    db.select().from(recipeSteps).where(eq(recipeSteps.recipeId, id)).orderBy(recipeSteps.ordinal),
    db.select().from(recipeMedia).where(eq(recipeMedia.recipeId, id)).orderBy(recipeMedia.ordinal),
    db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, recipe.userId))
      .limit(1),
  ]);
  return {
    ...recipe,
    ingredients: ings,
    steps,
    media,
    author: author[0] ?? null,
    isOwner,
  };
}

export async function setVisibility(
  userId: string,
  id: string,
  visibility: 'public' | 'private',
): Promise<boolean> {
  const rows = await db
    .update(recipes)
    .set({ visibility, updatedAt: new Date() })
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .returning({ id: recipes.id });
  return rows.length > 0;
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

    // Preserve step IDs by ordinal so media attached to a step survives edits.
    // Update existing rows in place where possible; insert new; delete extras.
    const existingStepRows = await tx
      .select({ id: recipeSteps.id, ordinal: recipeSteps.ordinal })
      .from(recipeSteps)
      .where(eq(recipeSteps.recipeId, id))
      .orderBy(recipeSteps.ordinal);
    const existingByOrdinal = new Map(existingStepRows.map((r) => [r.ordinal, r.id]));

    for (let idx = 0; idx < draft.steps.length; idx++) {
      const stepBody = draft.steps[idx].body;
      const existingId = existingByOrdinal.get(idx);
      if (existingId) {
        await tx
          .update(recipeSteps)
          .set({ body: stepBody })
          .where(eq(recipeSteps.id, existingId));
        existingByOrdinal.delete(idx);
      } else {
        await tx.insert(recipeSteps).values({ recipeId: id, ordinal: idx, body: stepBody });
      }
    }
    for (const leftoverId of existingByOrdinal.values()) {
      await tx.delete(recipeSteps).where(eq(recipeSteps.id, leftoverId));
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
