import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { joinRoundtable } from '@/lib/db/queries/roundtables';

export const metadata = { title: 'Join roundtable' };

export default async function JoinRoundtablePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const rt = await joinRoundtable(user.id, code);

  if (!rt) {
    return (
      <div className="container-rb py-12 max-w-md text-center">
        <h1 className="t-h1">Invite not found</h1>
        <p className="t-body soft mt-4">
          That invite link is invalid or has been revoked.
        </p>
      </div>
    );
  }

  redirect(`/roundtables/${rt.id}`);
}
