import 'server-only';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { ingredients, pantryItems } from '@/db/schema';
import type { Ingredient, PantryItem } from '@/db/schema';

export type PantryRow = PantryItem & { ingredient: Ingredient };

export async function listPantry(userId: string): Promise<PantryRow[]> {
  const rows = await db
    .select({
      pantry: pantryItems,
      ingredient: ingredients,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(ingredients.id, pantryItems.ingredientId))
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(ingredients.name));
  return rows.map((r) => ({ ...r.pantry, ingredient: r.ingredient }));
}

export async function searchIngredients(q: string, limit = 12) {
  const term = q.trim();
  if (!term) return [] as Ingredient[];
  const lower = `%${term.toLowerCase()}%`;
  return await db
    .select()
    .from(ingredients)
    .where(or(ilike(ingredients.name, lower), sql`${term} = any(${ingredients.aliases})`))
    .orderBy(ingredients.name)
    .limit(limit);
}

export async function ensureIngredient(name: string, category?: string): Promise<Ingredient> {
  const lower = name.toLowerCase().trim();
  const existing = await db.query.ingredients.findFirst({
    where: eq(ingredients.name, lower),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(ingredients)
    .values({
      name: lower,
      category: ((category ?? 'other') as never),
      aliases: [],
    })
    .returning();
  return created;
}

export async function addPantryItem(userId: string, ingredientId: string, expiresAt?: string | null) {
  const [row] = await db
    .insert(pantryItems)
    .values({ userId, ingredientId, expiresAt: expiresAt ?? null })
    .onConflictDoUpdate({
      target: [pantryItems.userId, pantryItems.ingredientId],
      set: { expiresAt: expiresAt ?? null },
    })
    .returning();
  return row;
}

export async function removePantryItem(userId: string, ingredientId: string) {
  await db
    .delete(pantryItems)
    .where(and(eq(pantryItems.userId, userId), eq(pantryItems.ingredientId, ingredientId)));
}

export async function setPantryExpiry(userId: string, ingredientId: string, expiresAt: string | null) {
  await db
    .update(pantryItems)
    .set({ expiresAt })
    .where(and(eq(pantryItems.userId, userId), eq(pantryItems.ingredientId, ingredientId)));
}
