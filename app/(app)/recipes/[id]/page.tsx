import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getViewableRecipe } from '@/lib/db/queries/recipes';
import { isStarred, starCounts } from '@/lib/db/queries/stars';
import { RecipeDetailClient } from './recipe-detail-client';
import { DeleteButton } from './delete-button';
import { StarButton } from './star-button';

export const metadata = { title: 'Recipe' };

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await getViewableRecipe(user.id, id);
  if (!recipe) notFound();

  const [starred, counts] = await Promise.all([
    isStarred(user.id, recipe.id),
    starCounts([recipe.id]),
  ]);
  const stars = counts.get(recipe.id) ?? 0;

  const author = recipe.author;
  const authorLabel = author ? author.name ?? author.email.split('@')[0] : null;

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <Link href={recipe.isOwner ? '/library' : '/discover'} className="t-meta">
        ← {recipe.isOwner ? 'Library' : 'Discover'}
      </Link>

      {recipe.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.coverImageUrl}
          alt={recipe.title}
          className="mt-4"
          style={{
            width: '100%',
            maxHeight: 420,
            objectFit: 'cover',
            borderRadius: 16,
            display: 'block',
          }}
        />
      ) : null}

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
          {recipe.visibility === 'public' ? (
            <span className="chip" style={{ fontSize: 11 }}>
              Public
            </span>
          ) : null}
        </div>
        <h1 className="t-h1" style={{ fontSize: 'clamp(28px, 6vw, 44px)' }}>
          {recipe.title}
        </h1>
        {!recipe.isOwner && authorLabel ? (
          <div className="t-meta mt-2">by {authorLabel}</div>
        ) : null}
        {recipe.description ? (
          <p className="t-body soft mt-3">{recipe.description}</p>
        ) : null}
        <div className="t-meta mt-3">
          {recipe.totalMinutes ? `${recipe.totalMinutes} minutes · ` : ''}
          {recipe.baseServings} servings (as written)
          {stars > 0 ? ` · ★ ${stars}` : ''}
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
        {recipe.isOwner ? (
          <>
            <Link href={`/recipes/${recipe.id}/edit`} className="btn">
              Edit
            </Link>
            <DeleteButton id={recipe.id} />
          </>
        ) : (
          <StarButton recipeId={recipe.id} initialStarred={starred} />
        )}
      </div>
    </div>
  );
}
