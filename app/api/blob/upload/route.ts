import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { saveMedia } from '@/lib/blob/upload';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = (file.type || 'application/octet-stream').toLowerCase();
  try {
    const { url, kind } = await saveMedia({ buffer, contentType });
    // For local fallback URLs, prefix with origin so they validate as URLs in callers.
    const origin = new URL(req.url).origin;
    const absoluteUrl = url.startsWith('http') ? url : `${origin}${url}`;
    return NextResponse.json({
      url: absoluteUrl,
      kind,
      mimeType: contentType,
      sizeBytes: buffer.byteLength,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 400 },
    );
  }
}

export const config = {
  api: { bodyParser: false },
};
