import { requireUser } from '@/lib/auth/session';
import { listPantry } from '@/lib/db/queries/pantry';
import { CookClient } from './cook-client';

export const metadata = { title: 'Cook' };

export default async function CookPage() {
  const user = await requireUser();
  const pantry = await listPantry(user.id);

  return (
    <div className="container-rb py-6 sm:py-10 max-w-4xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        Cook
      </div>
      <h1 className="t-h1 mt-1" style={{ fontSize: 'clamp(28px, 6vw, 44px)' }}>
        What's for dinner?
      </h1>
      <p className="t-body soft mt-2 max-w-xl">
        Ask in plain English. We'll rank your recipes by how well they fit what's in your pantry —
        and prioritize anything about to expire.
      </p>

      <div className="mt-6">
        <CookClient pantryCount={pantry.length} />
      </div>
    </div>
  );
}
