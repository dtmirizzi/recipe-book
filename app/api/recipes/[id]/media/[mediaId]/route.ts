import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { deleteMedia, updateMedia } from '@/lib/db/queries/media';

const patchSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
  stepId: z.string().uuid().nullable().optional(),
  ordinal: z.number().int().min(0).optional(),
  posterUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, mediaId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid patch' }, { status: 400 });
  const row = await updateMedia(session.user.id, id, mediaId, parsed.data);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ media: row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, mediaId } = await params;
  const ok = await deleteMedia(session.user.id, id, mediaId);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
