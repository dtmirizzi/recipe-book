import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { extractRecipe } from '@/lib/ai/extract';
import { db } from '@/lib/db/client';
import { captureJobs } from '@/db/schema';

const body = z.object({ text: z.string().min(1).max(50_000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  try {
    const draft = await extractRecipe({ kind: 'text', text: parsed.data.text });
    const [job] = await db
      .insert(captureJobs)
      .values({
        userId: session.user.id,
        kind: 'text',
        status: 'review',
        input: { text: parsed.data.text },
        output: draft as unknown as Record<string, unknown>,
      })
      .returning({ id: captureJobs.id });
    return NextResponse.json({ jobId: job.id, draft });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
