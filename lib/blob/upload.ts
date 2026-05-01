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

export type MediaKind = 'image' | 'video';

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function saveImage(input: UploadInput): Promise<{ url: string }> {
  return saveMedia(input);
}

export async function saveMedia(input: UploadInput): Promise<{ url: string; kind: MediaKind }> {
  const ct = input.contentType.toLowerCase();
  let kind: MediaKind;
  if (ALLOWED_IMAGE.has(ct)) {
    kind = 'image';
    if (input.buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Image too large (max 10 MB)');
    }
  } else if (ALLOWED_VIDEO.has(ct)) {
    kind = 'video';
    if (input.buffer.byteLength > MAX_VIDEO_BYTES) {
      throw new Error('Video too large (max 100 MB)');
    }
  } else {
    throw new Error(`Unsupported content type: ${input.contentType}`);
  }

  const ext = pickExtension(ct);
  const folder = kind === 'image' ? 'recipes' : 'recipe-videos';

  if (flags.hasBlobToken) {
    const { put } = await import('@vercel/blob');
    const result = await put(`${folder}/${randomUUID()}.${ext}`, input.buffer, {
      access: 'public',
      contentType: ct,
    });
    return { url: result.url, kind };
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
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), input.buffer);
  return { url: `/uploads/${filename}`, kind };
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
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
}
