import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getRecipe } from '@/lib/db/queries/recipes';
import { RecipeDetailClient } from './recipe-detail-client';
import { DeleteButton } from './delete-button';

export const metadata = { title: 'Recipe' };

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await getRecipe(user.id, id);
  if (!recipe) notFound();

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <Link href="/library" className="t-meta">
        ← Library
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap gap-2 items-center mb-2">
          {recipe.cuisine ? (
            <span className="chip chip-accent" style={{ fontSize: 11 }}>
              {recipe.cuisine}
            </span>
          ) : null}
          {recipe.mealType ? (
            <span className="chip" style={{ fontSize: 11 }}>
              {recipe.mealType}
            </span>
          ) : null}
          {recipe.dietaryTags?.map((t) => (
            <span key={t} className="chip" style={{ fontSize: 11 }}>
              {t}
            </span>
          ))}
        </div>
        <h1 className="t-h1" style={{ fontSize: 'clamp(28px, 6vw, 44px)' }}>
          {recipe.title}
        </h1>
        {recipe.description ? (
          <p className="t-body soft mt-3">{recipe.description}</p>
        ) : null}
        <div className="t-meta mt-3">
          {recipe.totalMinutes ? `${recipe.totalMinutes} minutes · ` : ''}
          {recipe.baseServings} servings (as written)
          {recipe.sourceUrl ? (
            <>
              {' · '}
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                source
              </a>
            </>
          ) : null}
        </div>
      </header>

      <RecipeDetailClient recipe={recipe} />

      <div className="mt-12 flex gap-3 flex-wrap">
        <Link href={`/recipes/${recipe.id}/edit`} className="btn">
          Edit
        </Link>
        <DeleteButton id={recipe.id} />
      </div>
    </div>
  );
}
