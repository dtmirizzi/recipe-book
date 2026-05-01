'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function PhotoCaptureForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function pickFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      // 1. Upload to Blob (or local fallback)
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/blob/upload', { method: 'POST', body: fd });
      if (!up.ok) {
        const body = await up.json().catch(() => ({}));
        throw new Error(body.error ?? 'Upload failed');
      }
      const { url } = await up.json();

      // 2. Kick off extraction
      const ext = await fetch('/api/capture/photo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blobUrl: url }),
      });
      if (!ext.ok) {
        const body = await ext.json().catch(() => ({}));
        throw new Error(body.error ?? 'Extraction failed');
      }
      const data = await ext.json();
      router.push(`/capture/review/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
        }}
        className="hidden"
        aria-label="Choose recipe photo"
      />

      {preview ? (
        <div
          className="card"
          style={{ padding: 'var(--s-2)', display: 'flex', justifyContent: 'center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Recipe preview"
            style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 8 }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="card flex flex-col items-center justify-center text-center"
          style={{ minHeight: 240, borderStyle: 'dashed', borderColor: 'var(--tomato-300)', background: 'var(--tomato-50)', cursor: 'pointer' }}
          onClick={() => inputRef.current?.click()}
          aria-label="Choose or take a photo"
        >
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--tomato-700)' }}>
            +
          </div>
          <div className="t-body soft mt-2">Tap to take a photo or choose from your library.</div>
          <div className="t-meta mt-1">JPG, PNG, HEIC up to 10 MB.</div>
        </button>
      )}

      {error ? <span className="t-meta" style={{ color: 'var(--err)' }}>{error}</span> : null}

      <div className="flex gap-3 flex-wrap">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!file || busy}
        >
          {busy ? 'Extracting…' : 'Extract recipe'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {file ? 'Change photo' : 'Choose photo'}
        </button>
      </div>
    </form>
  );
}
