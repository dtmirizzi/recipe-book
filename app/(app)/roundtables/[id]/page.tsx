import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getRoundtable, roundtableFeed } from '@/lib/db/queries/roundtables';
import { RoundtableDetailClient } from './roundtable-detail-client';

export const metadata = { title: 'Roundtable' };

export default async function RoundtableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const rt = await getRoundtable(user.id, id);
  if (!rt) notFound();
  const feed = (await roundtableFeed(user.id, id)) ?? [];

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <Link href="/roundtables" className="t-meta">
        ← Roundtables
      </Link>
      <h1 className="t-h1 mt-2">{rt.name}</h1>
      <RoundtableDetailClient roundtable={rt} feed={feed} viewerId={user.id} />
    </div>
  );
}
