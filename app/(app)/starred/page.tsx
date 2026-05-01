import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listStarredRecipes } from '@/lib/db/queries/stars';

export const metadata = { title: 'Starred' };

export default async function StarredPage() {
  const user = await requireUser();
  const rows = await listStarredRecipes(user.id);

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <h1 className="t-h1">Starred.</h1>
      <p className="t-body soft mt-2">
        Recipes you've starred. They live in their authors' kitchens — starring doesn't copy.
      </p>

      {rows.length === 0 ? (
        <p className="t-meta mt-8">Nothing starred yet. Star recipes from Discover or your roundtables.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map(({ recipe, authorName, authorEmail }) => (
            <Link
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="block card hover:shadow-md transition-shadow"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              {recipe.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.coverImageUrl}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: 140, background: 'var(--paper-soft)' }} />
              )}
              <div style={{ padding: 12 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.2 }}>
                  {recipe.title}
                </div>
                <div className="t-meta mt-1">
                  by {authorName ?? authorEmail.split('@')[0]}
                  {recipe.totalMinutes ? ` · ${recipe.totalMinutes} min` : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
