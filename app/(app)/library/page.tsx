import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listRecipes } from '@/lib/db/queries/recipes';
import { LibraryClient } from './library-client';

export const metadata = { title: 'Library' };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cuisine?: string; meal?: string; time?: string; tag?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const recipes = await listRecipes(user.id, params);

  return (
    <div className="container-rb py-6 sm:py-10">
      <div className="flex items-baseline justify-between gap-4 mb-6">
        <div>
          <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
            Your library
          </div>
          <h1 className="t-h1 mt-1">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </h1>
        </div>
        <Link href="/capture" className="btn btn-primary">
          + Add recipe
        </Link>
      </div>

      <LibraryClient initialRecipes={recipes} initialQuery={params} />
    </div>
  );
}
