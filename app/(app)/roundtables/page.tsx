import { requireUser } from '@/lib/auth/session';
import { listMyRoundtables } from '@/lib/db/queries/roundtables';
import { RoundtablesClient } from './roundtables-client';

export const metadata = { title: 'Roundtables' };

export default async function RoundtablesPage() {
  const user = await requireUser();
  const list = await listMyRoundtables(user.id);

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <h1 className="t-h1">Roundtables.</h1>
      <p className="t-body soft mt-2">
        Private sharing groups. Members automatically see each other's recipes.
      </p>
      <RoundtablesClient initial={list} />
    </div>
  );
}
