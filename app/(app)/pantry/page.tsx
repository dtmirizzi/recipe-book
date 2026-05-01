import { requireUser } from '@/lib/auth/session';
import { listPantry } from '@/lib/db/queries/pantry';
import { PantryClient } from './pantry-client';

export const metadata = { title: 'Pantry' };

export default async function PantryPage() {
  const user = await requireUser();
  const items = await listPantry(user.id);

  // serialize Date fields for the client component
  const initial = items.map((i) => ({
    id: i.id,
    ingredientId: i.ingredientId,
    name: i.ingredient.name,
    category: i.ingredient.category,
    expiresAt: i.expiresAt ? String(i.expiresAt) : null,
  }));

  return (
    <div className="container-rb py-6 sm:py-10 max-w-3xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        Your pantry
      </div>
      <p className="t-body soft mt-2">
        Add what you have. We'll use this to rank recipes — and remind you about anything about to
        expire.
      </p>
      <div className="mt-6">
        <PantryClient initial={initial} />
      </div>
    </div>
  );
}
