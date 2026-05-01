import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { flags } from '@/lib/env';

export type UploadInput = {
  buffer: Buffer;
  contentType: string;
  filename?: string;
};

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_BYTES = 10 * 1024 * 1024;

export async function saveImage(input: UploadInput): Promise<{ url: string }> {
  if (!ALLOWED.has(input.contentType)) {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }
  if (input.buffer.byteLength > MAX_BYTES) {
    throw new Error('File too large (max 10 MB)');
  }

  if (flags.hasBlobToken) {
    // Real Vercel Blob upload
    const { put } = await import('@vercel/blob');
    const ext = pickExtension(input.contentType);
    const result = await put(`recipes/${randomUUID()}.${ext}`, input.buffer, {
      access: 'public',
      contentType: input.contentType,
    });
    return { url: result.url };
  }

  // Production has a read-only filesystem on Vercel (only /tmp is writable,
  // and that's per-invocation). Fail loudly if we're in prod without Blob —
  // surfacing as ENOENT/EROFS otherwise, which is opaque.
  if (flags.isProd) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Provision Vercel Blob at ' +
        'https://vercel.com/<account>/<project>/stores and redeploy.',
    );
  }

  // Local dev fallback — writes to ./public/uploads (gitignored).
  const ext = pickExtension(input.contentType);
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), input.buffer);
  return { url: `/uploads/${filename}` };
}

function pickExtension(ct: string): string {
  switch (ct) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'bin';
  }
}
