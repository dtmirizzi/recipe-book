import { requireUser } from '@/lib/auth/session';
import { discoverPublicRecipes } from '@/lib/db/queries/discover';
import { DiscoverClient } from './discover-client';

export const metadata = { title: 'Discover' };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = sp.q ?? '';
  const results = await discoverPublicRecipes(q);

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <h1 className="t-h1">Discover.</h1>
      <p className="t-body soft mt-2">Public recipes from across Recipe Box.</p>
      <DiscoverClient initialQuery={q} initialResults={results} />
    </div>
  );
}
