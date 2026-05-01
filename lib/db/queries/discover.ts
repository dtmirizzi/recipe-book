import 'server-only';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { recipes, recipeIngredients, recipeStars, users } from '@/db/schema';

export type DiscoverResult = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  totalMinutes: number | null;
  baseServings: number;
  coverImageUrl: string | null;
  authorName: string | null;
  authorEmail: string;
  starCount: number;
  createdAt: Date;
};

export async function discoverPublicRecipes(q: string | undefined): Promise<DiscoverResult[]> {
  const conds = [eq(recipes.visibility, 'public'), isNull(recipes.deletedAt)];

  if (q && q.trim()) {
    const pattern = `%${q.toLowerCase()}%`;
    conds.push(
      sql`(lower(${recipes.title}) like ${pattern}
           or exists (
             select 1 from ${recipeIngredients} ri
             where ri.recipe_id = ${recipes.id}
             and lower(ri.name) like ${pattern}
           ))`,
    );
  }

  const starCount = sql<number>`(
    select count(*)::int from ${recipeStars}
    where ${recipeStars.recipeId} = ${recipes.id}
  )`;

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      cuisine: recipes.cuisine,
      totalMinutes: recipes.totalMinutes,
      baseServings: recipes.baseServings,
      coverImageUrl: recipes.coverImageUrl,
      authorName: users.name,
      authorEmail: users.email,
      starCount,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(and(...conds))
    .orderBy(desc(starCount), desc(recipes.createdAt))
    .limit(60);

  return rows;
}
