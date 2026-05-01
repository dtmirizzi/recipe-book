import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { createMedia, listMedia } from '@/lib/db/queries/media';
import { parseEmbedUrl } from '@/lib/media/embed';

const createSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('image'),
    url: z.string().url(),
    caption: z.string().max(500).nullable().optional(),
    stepId: z.string().uuid().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    sizeBytes: z.number().int().nullable().optional(),
    width: z.number().int().nullable().optional(),
    height: z.number().int().nullable().optional(),
  }),
  z.object({
    kind: z.literal('video'),
    url: z.string().url(),
    posterUrl: z.string().url().nullable().optional(),
    caption: z.string().max(500).nullable().optional(),
    stepId: z.string().uuid().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    sizeBytes: z.number().int().nullable().optional(),
    width: z.number().int().nullable().optional(),
    height: z.number().int().nullable().optional(),
    durationSeconds: z.number().nullable().optional(),
  }),
  z.object({
    kind: z.literal('embed'),
    embedUrl: z.string().url(),
    caption: z.string().max(500).nullable().optional(),
    stepId: z.string().uuid().nullable().optional(),
  }),
]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const media = await listMedia(session.user.id, id);
  return NextResponse.json({ media });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid media', detail: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  let row;
  if (data.kind === 'embed') {
    const info = parseEmbedUrl(data.embedUrl);
    if (!info) {
      return NextResponse.json({ error: 'Unsupported embed URL (YouTube or Vimeo only)' }, { status: 400 });
    }
    row = await createMedia(session.user.id, id, {
      kind: 'embed',
      url: info.url,
      posterUrl: info.posterUrl,
      provider: info.provider,
      embedId: info.embedId,
      caption: data.caption ?? null,
      stepId: data.stepId ?? null,
    });
  } else if (data.kind === 'image') {
    row = await createMedia(session.user.id, id, {
      kind: 'image',
      url: data.url,
      caption: data.caption ?? null,
      stepId: data.stepId ?? null,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
    });
  } else {
    row = await createMedia(session.user.id, id, {
      kind: 'video',
      url: data.url,
      posterUrl: data.posterUrl ?? null,
      caption: data.caption ?? null,
      stepId: data.stepId ?? null,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      durationSeconds: data.durationSeconds != null ? String(data.durationSeconds) : null,
    });
  }

  if (!row) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
  return NextResponse.json({ media: row }, { status: 201 });
}
