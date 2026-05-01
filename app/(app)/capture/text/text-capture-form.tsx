'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SAMPLE = `Lemon Chicken & Spinach
Serves 4. About 30 minutes.

Ingredients
- 2 tbsp olive oil
- 1 lb chicken thighs
- 4 cloves garlic, minced
- 1 lemon, juiced
- 6 oz baby spinach
- salt and pepper, to taste

Steps
1. Heat the olive oil in a skillet over medium heat. Brown the chicken on both sides, 4–5 minutes per side.
2. Add the garlic and cook until fragrant, about 30 seconds.
3. Pour in the lemon juice. Toss in the spinach and cover until wilted, 2 minutes.
4. Season with salt and pepper. Serve warm.`;

export function TextCaptureForm() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/capture/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
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
      <textarea
        className="input"
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your recipe here…"
        aria-label="Recipe text"
        disabled={busy}
        style={{ fontFamily: 'var(--font-mono)' }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? 'Reading…' : 'Extract recipe'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setText(SAMPLE)}
          disabled={busy}
        >
          Use a sample
        </button>
        {error ? <span className="t-meta" style={{ color: 'var(--err)' }}>{error}</span> : null}
      </div>
    </form>
  );
}
