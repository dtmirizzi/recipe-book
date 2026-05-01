import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { users } from '@/db/schema';

const patchBody = z.object({
  name: z.string().nullable().optional(),
  unitPreference: z.enum(['us', 'metric']).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  await db
    .update(users)
    .set({
      name: parsed.data.name ?? undefined,
      unitPreference: parsed.data.unitPreference ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Cascading FK deletes drop recipes/pantry/etc.
  await db.delete(users).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
