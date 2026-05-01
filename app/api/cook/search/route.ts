import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { smartSearch } from '@/lib/db/queries/cook';
import { db } from '@/lib/db/client';
import { cookQueries } from '@/db/schema';

const body = z.object({ query: z.string().min(1).max(500) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 });

  const { results, parsed: structured } = await smartSearch(session.user.id, parsed.data.query);

  // Best-effort log of the query history
  await db
    .insert(cookQueries)
    .values({
      userId: session.user.id,
      query: parsed.data.query,
      parsed: structured as unknown as Record<string, unknown>,
      resultRecipeIds: results.map((r) => r.recipe.id),
    })
    .catch(() => undefined);

  return NextResponse.json({ parsed: structured, results });
}
