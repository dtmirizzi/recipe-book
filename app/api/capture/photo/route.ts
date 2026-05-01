import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { extractRecipe } from '@/lib/ai/extract';
import { db } from '@/lib/db/client';
import { captureJobs } from '@/db/schema';

const body = z.object({ blobUrl: z.string().url() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  try {
    const draft = await extractRecipe({ kind: 'photo', blobUrl: parsed.data.blobUrl });
    const [job] = await db
      .insert(captureJobs)
      .values({
        userId: session.user.id,
        kind: 'photo',
        status: 'review',
        input: { blobUrl: parsed.data.blobUrl },
        output: draft as unknown as Record<string, unknown>,
      })
      .returning({ id: captureJobs.id });
    return NextResponse.json({ jobId: job.id, draft });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
  }
}
