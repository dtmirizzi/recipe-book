import { NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { recipes, recipeIngredients, recipeSteps, pantryItems, ingredients } from '@/db/schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipeRows = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.userId, session.user.id), isNull(recipes.deletedAt)));

  const recipeIds = recipeRows.map((r) => r.id);
  const [ingsRows, stepsRows] = recipeIds.length
    ? await Promise.all([
        db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeIds[0])).then(() =>
          db.select().from(recipeIngredients),
        ),
        db.select().from(recipeSteps),
      ])
    : [[], []];

  const ingsByRecipe = new Map<string, typeof ingsRows>();
  for (const r of recipeRows) ingsByRecipe.set(r.id, []);
  for (const i of ingsRows) ingsByRecipe.get(i.recipeId)?.push(i);
  const stepsByRecipe = new Map<string, typeof stepsRows>();
  for (const r of recipeRows) stepsByRecipe.set(r.id, []);
  for (const s of stepsRows) stepsByRecipe.get(s.recipeId)?.push(s);

  const pantryRows = await db
    .select({
      ingredientId: pantryItems.ingredientId,
      name: ingredients.name,
      category: ingredients.category,
      addedAt: pantryItems.addedAt,
      expiresAt: pantryItems.expiresAt,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(ingredients.id, pantryItems.ingredientId))
    .where(eq(pantryItems.userId, session.user.id));

  const payload = {
    exportedAt: new Date().toISOString(),
    recipes: recipeRows.map((r) => ({
      ...r,
      ingredients: (ingsByRecipe.get(r.id) ?? []).sort((a, b) => a.ordinal - b.ordinal),
      steps: (stepsByRecipe.get(r.id) ?? []).sort((a, b) => a.ordinal - b.ordinal),
    })),
    pantry: pantryRows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="recipe-box-export.json"',
    },
  });
}
