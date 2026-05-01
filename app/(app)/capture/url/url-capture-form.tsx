'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UrlCaptureForm() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl(url)) {
      setError('That doesn’t look like a URL.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/capture/url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Extraction failed');
      }
      const data = await res.json();
      router.push(`/capture/review/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        className="input input--lg"
        type="url"
        autoFocus
        autoComplete="url"
        placeholder="https://example.com/best-tomato-galette"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={busy}
        aria-label="Recipe URL"
      />
      {error ? <span className="t-meta" style={{ color: 'var(--err)' }}>{error}</span> : null}
      <div>
        <button type="submit" className="btn btn-primary" disabled={busy || !url.trim()}>
          {busy ? 'Fetching…' : 'Fetch recipe'}
        </button>
      </div>
    </form>
  );
}

function isValidUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
