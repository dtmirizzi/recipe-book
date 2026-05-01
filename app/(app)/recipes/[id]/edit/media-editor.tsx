'use client';

import { useRef, useState } from 'react';
import type { RecipeMedia } from '@/db/schema';
import type { StepRef } from './edit-form';

export function MediaEditor({
  recipeId,
  initialCover,
  initialMedia,
  stepRefs,
}: {
  recipeId: string;
  initialCover: string | null;
  initialMedia: RecipeMedia[];
  stepRefs: StepRef[];
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCover);
  const [media, setMedia] = useState<RecipeMedia[]>(initialMedia);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embedDraft, setEmbedDraft] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<{ url: string; kind: 'image' | 'video'; mimeType: string; sizeBytes: number }> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/blob/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Upload failed');
    }
    return res.json();
  }

  async function onCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadFile(file);
      const r = await fetch(`/api/recipes/${recipeId}/cover`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) throw new Error('Could not save cover');
      setCoverUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed');
    } finally {
      setBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function clearCover() {
    setBusy(true);
    try {
      await fetch(`/api/recipes/${recipeId}/cover`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: null }),
      });
      setCoverUrl(null);
    } finally {
      setBusy(false);
    }
  }

  async function onMediaPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of files) {
        await uploadAndAttach(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (mediaInputRef.current) mediaInputRef.current.value = '';
    }
  }

  async function uploadAndAttach(file: File) {
    const isVideo = file.type.startsWith('video/');
    let posterUrl: string | null = null;
    let videoMeta: { width?: number; height?: number; durationSeconds?: number } = {};

    if (isVideo) {
      try {
        const poster = await capturePoster(file);
        if (poster) {
          const upload = await uploadFile(poster.file);
          posterUrl = upload.url;
          videoMeta = { width: poster.width, height: poster.height, durationSeconds: poster.duration };
        }
      } catch {
        // poster optional — proceed without
      }
    }

    const upload = await uploadFile(file);
    const payload: Record<string, unknown> = {
      kind: upload.kind,
      url: upload.url,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
    };
    if (upload.kind === 'video') {
      payload.posterUrl = posterUrl;
      if (videoMeta.width) payload.width = videoMeta.width;
      if (videoMeta.height) payload.height = videoMeta.height;
      if (videoMeta.durationSeconds != null) payload.durationSeconds = videoMeta.durationSeconds;
    }
    const r = await fetch(`/api/recipes/${recipeId}/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error ?? 'Could not save media');
    }
    const { media: row } = await r.json();
    setMedia((prev) => [...prev, row as RecipeMedia]);
  }

  async function attachEmbed() {
    const url = embedDraft.trim();
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/recipes/${recipeId}/media`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'embed', embedUrl: url }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? 'Could not attach embed');
      }
      const { media: row } = await r.json();
      setMedia((prev) => [...prev, row as RecipeMedia]);
      setEmbedDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Embed failed');
    } finally {
      setBusy(false);
    }
  }

  async function patchMedia(mediaId: string, patch: Record<string, unknown>) {
    const optimistic = media.map((m) => (m.id === mediaId ? { ...m, ...patch } : m));
    setMedia(optimistic);
    const r = await fetch(`/api/recipes/${recipeId}/media/${mediaId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!r.ok) setError('Could not update media');
  }

  async function removeMedia(mediaId: string) {
    if (!confirm('Remove this media?')) return;
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    await fetch(`/api/recipes/${recipeId}/media/${mediaId}`, { method: 'DELETE' });
  }

  return (
    <div className="card flex flex-col gap-5">
      <div>
        <div className="t-eyebrow mb-2">Cover photo</div>
        {coverUrl ? (
          <div className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt="Cover"
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 12,
                display: 'block',
              }}
            />
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => coverInputRef.current?.click()} disabled={busy}>
                Replace
              </button>
              <button type="button" className="btn btn-ghost" onClick={clearCover} disabled={busy}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => coverInputRef.current?.click()} disabled={busy}>
            Upload cover image
          </button>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onCoverPick}
        />
      </div>

      <div>
        <div className="t-eyebrow mb-2">Photos & videos</div>
        <div className="flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn" onClick={() => mediaInputRef.current?.click()} disabled={busy}>
            + Upload photo or video
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={onMediaPick}
          />
        </div>
        <div className="flex gap-2 mb-3">
          <input
            className="input flex-1"
            placeholder="Paste a YouTube or Vimeo URL"
            value={embedDraft}
            onChange={(e) => setEmbedDraft(e.target.value)}
          />
          <button type="button" className="btn" onClick={attachEmbed} disabled={busy || !embedDraft.trim()}>
            Attach
          </button>
        </div>

        {media.length === 0 ? (
          <p className="t-meta">No photos or videos yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {media.map((m) => (
              <li key={m.id} className="flex gap-3 items-start" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <MediaThumb media={m} />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    className="input"
                    placeholder="Caption (optional)"
                    defaultValue={m.caption ?? ''}
                    onBlur={(e) => {
                      const next = e.target.value || null;
                      if (next !== (m.caption ?? null)) patchMedia(m.id, { caption: next });
                    }}
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      className="input"
                      value={m.stepId ?? ''}
                      onChange={(e) => patchMedia(m.id, { stepId: e.target.value || null })}
                      style={{ maxWidth: 220 }}
                    >
                      <option value="">No step (gallery)</option>
                      {stepRefs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <span className="t-meta">{m.kind}</span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeMedia(m.id)}
                      style={{ marginLeft: 'auto' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="t-meta" style={{ color: 'var(--err)' }}>{error}</p> : null}
    </div>
  );
}

function MediaThumb({ media }: { media: RecipeMedia }) {
  const style = { width: '100%', borderRadius: 8, display: 'block' as const };
  if (media.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.url} alt="" style={style} />;
  }
  if (media.kind === 'video') {
    return media.posterUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media.posterUrl} alt="" style={style} />
    ) : (
      <video src={media.url} muted preload="metadata" style={{ ...style, background: '#000' }} />
    );
  }
  return media.posterUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={media.posterUrl} alt="" style={style} />
  ) : (
    <div className="t-meta" style={{ ...style, padding: 8 }}>
      Embed
    </div>
  );
}

async function capturePoster(file: File): Promise<
  { file: File; width: number; height: number; duration: number } | null
> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.crossOrigin = 'anonymous';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };

    video.addEventListener('loadeddata', () => {
      // Seek a bit in to skip black frames.
      const target = Math.min(0.5, (video.duration || 1) * 0.1);
      video.currentTime = target;
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              cleanup();
              resolve(null);
              return;
            }
            const posterFile = new File([blob], `poster-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const result = {
              file: posterFile,
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration || 0,
            };
            cleanup();
            resolve(result);
          },
          'image/jpeg',
          0.85,
        );
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener('error', () => {
      cleanup();
      resolve(null);
    });
  });
}
