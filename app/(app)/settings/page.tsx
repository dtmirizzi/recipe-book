import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { users } from '@/db/schema';
import { SettingsClient } from './settings-client';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const u = await db.query.users.findFirst({ where: eq(users.id, user.id) });

  return (
    <div className="container-rb py-6 sm:py-10 max-w-2xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        Settings
      </div>
      <h1 className="t-h1 mt-1">Your account.</h1>
      <div className="mt-6">
        <SettingsClient
          email={u?.email ?? user.email}
          name={u?.name ?? null}
          unitPreference={u?.unitPreference ?? 'us'}
        />
      </div>
    </div>
  );
}
