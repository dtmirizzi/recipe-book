import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipes, recipeStars, users } from '@/db/schema';

export async function starRecipe(userId: string, recipeId: string): Promise<void> {
  await db
    .insert(recipeStars)
    .values({ userId, recipeId })
    .onConflictDoNothing();
}

export async function unstarRecipe(userId: string, recipeId: string): Promise<void> {
  await db
    .delete(recipeStars)
    .where(and(eq(recipeStars.userId, userId), eq(recipeStars.recipeId, recipeId)));
}

export async function isStarred(userId: string, recipeId: string): Promise<boolean> {
  const row = await db
    .select({ recipeId: recipeStars.recipeId })
    .from(recipeStars)
    .where(and(eq(recipeStars.userId, userId), eq(recipeStars.recipeId, recipeId)))
    .limit(1);
  return row.length > 0;
}

export async function starCounts(recipeIds: string[]): Promise<Map<string, number>> {
  if (recipeIds.length === 0) return new Map();
  const rows = await db
    .select({
      recipeId: recipeStars.recipeId,
      count: sql<number>`count(*)::int`,
    })
    .from(recipeStars)
    .where(inArray(recipeStars.recipeId, recipeIds))
    .groupBy(recipeStars.recipeId);
  return new Map(rows.map((r) => [r.recipeId, Number(r.count)]));
}

export async function listStarredRecipes(userId: string) {
  const rows = await db
    .select({
      recipe: recipes,
      starredAt: recipeStars.createdAt,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(recipeStars)
    .innerJoin(recipes, eq(recipes.id, recipeStars.recipeId))
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(eq(recipeStars.userId, userId))
    .orderBy(desc(recipeStars.createdAt))
    .limit(200);
  return rows;
}
