import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getRecipe } from '@/lib/db/queries/recipes';
import { recipeDraftSchema } from '@/lib/validation/schemas';
import { EditForm } from './edit-form';

export const metadata = { title: 'Edit recipe' };

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await getRecipe(user.id, id);
  if (!recipe) notFound();

  const draft = recipeDraftSchema.parse({
    title: recipe.title,
    description: recipe.description,
    baseServings: recipe.baseServings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    cuisine: recipe.cuisine,
    mealType: recipe.mealType,
    dietaryTags: recipe.dietaryTags ?? [],
    sourceUrl: recipe.sourceUrl,
    sourcePhotoUrl: recipe.sourcePhotoUrl,
    sourceText: recipe.sourceText,
    ingredients: recipe.ingredients.map((ing) => ({
      rawText: ing.rawText,
      name: ing.name,
      quantity: ing.quantity != null ? Number(ing.quantity) : null,
      unit: ing.unit,
      note: ing.note,
      confidence: 1,
    })),
    steps: recipe.steps.map((s) => ({ body: s.body })),
  });

  return (
    <div className="container-rb py-8 max-w-3xl">
      <Link href={`/recipes/${recipe.id}`} className="t-meta">
        ← Back to recipe
      </Link>
      <h1 className="t-h1 mt-3">Edit.</h1>
      <div className="mt-6">
        <EditForm
          id={recipe.id}
          draft={draft}
          coverImageUrl={recipe.coverImageUrl}
          stepRefs={recipe.steps.map((s, i) => ({ id: s.id, label: `Step ${i + 1}` }))}
          initialMedia={recipe.media}
        />
      </div>
    </div>
  );
}
