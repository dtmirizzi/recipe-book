import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipeMedia, recipes } from '@/db/schema';
import type { RecipeMedia, RecipeMediaInsert } from '@/db/schema';

async function ensureOwner(userId: string, recipeId: string): Promise<boolean> {
  const r = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.userId, userId)),
    columns: { id: true },
  });
  return !!r;
}

export async function listMedia(userId: string, recipeId: string): Promise<RecipeMedia[]> {
  if (!(await ensureOwner(userId, recipeId))) return [];
  return db
    .select()
    .from(recipeMedia)
    .where(eq(recipeMedia.recipeId, recipeId))
    .orderBy(asc(recipeMedia.ordinal), asc(recipeMedia.createdAt));
}

export async function listMediaForRecipe(recipeId: string): Promise<RecipeMedia[]> {
  return db
    .select()
    .from(recipeMedia)
    .where(eq(recipeMedia.recipeId, recipeId))
    .orderBy(asc(recipeMedia.ordinal), asc(recipeMedia.createdAt));
}

export async function createMedia(
  userId: string,
  recipeId: string,
  values: Omit<RecipeMediaInsert, 'recipeId' | 'id' | 'createdAt'>,
): Promise<RecipeMedia | null> {
  if (!(await ensureOwner(userId, recipeId))) return null;
  const [row] = await db
    .insert(recipeMedia)
    .values({ ...values, recipeId })
    .returning();
  return row;
}

export async function updateMedia(
  userId: string,
  recipeId: string,
  mediaId: string,
  patch: Partial<Pick<RecipeMediaInsert, 'caption' | 'stepId' | 'ordinal' | 'posterUrl'>>,
): Promise<RecipeMedia | null> {
  if (!(await ensureOwner(userId, recipeId))) return null;
  const [row] = await db
    .update(recipeMedia)
    .set(patch)
    .where(and(eq(recipeMedia.id, mediaId), eq(recipeMedia.recipeId, recipeId)))
    .returning();
  return row ?? null;
}

export async function deleteMedia(
  userId: string,
  recipeId: string,
  mediaId: string,
): Promise<boolean> {
  if (!(await ensureOwner(userId, recipeId))) return false;
  const rows = await db
    .delete(recipeMedia)
    .where(and(eq(recipeMedia.id, mediaId), eq(recipeMedia.recipeId, recipeId)))
    .returning({ id: recipeMedia.id });
  return rows.length > 0;
}

export async function setCoverImage(
  userId: string,
  recipeId: string,
  url: string | null,
): Promise<boolean> {
  const rows = await db
    .update(recipes)
    .set({ coverImageUrl: url, updatedAt: new Date() })
    .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
    .returning({ id: recipes.id });
  return rows.length > 0;
}
