import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { recipeDraftSchema } from '@/lib/validation/schemas';
import { createRecipe, listRecipes } from '@/lib/db/queries/recipes';
import { db } from '@/lib/db/client';
import { captureJobs } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const recipes = await listRecipes(session.user.id, {
    q: url.searchParams.get('q') ?? undefined,
    cuisine: url.searchParams.get('cuisine') ?? undefined,
    meal: url.searchParams.get('meal') ?? undefined,
    time: url.searchParams.get('time') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
  });
  return NextResponse.json({ recipes });
}

const saveBody = z.object({
  jobId: z.string().uuid().optional(),
  draft: recipeDraftSchema,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = saveBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid recipe', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id = await createRecipe(session.user.id, parsed.data.draft);

  if (parsed.data.jobId) {
    await db
      .update(captureJobs)
      .set({ status: 'saved', updatedAt: new Date() })
      .where(and(eq(captureJobs.id, parsed.data.jobId), eq(captureJobs.userId, session.user.id)));
  }

  return NextResponse.json({ id });
}
