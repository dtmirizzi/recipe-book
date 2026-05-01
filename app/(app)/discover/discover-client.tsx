'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DiscoverResult } from '@/lib/db/queries/discover';

export function DiscoverClient({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: DiscoverResult[];
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<DiscoverResult[]>(initialResults);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const url = q.trim() ? `/api/discover?q=${encodeURIComponent(q)}` : '/api/discover';
      const res = await fetch(url);
      const json = await res.json();
      setResults(json.results ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={search} className="mt-6 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Search by title or ingredient…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {results.length === 0 ? (
          <p className="t-meta">No public recipes match.</p>
        ) : (
          results.map((r) => <DiscoverCard key={r.id} r={r} />)
        )}
      </div>
    </>
  );
}

function DiscoverCard({ r }: { r: DiscoverResult }) {
  const author = r.authorName ?? r.authorEmail.split('@')[0];
  return (
    <Link
      href={`/recipes/${r.id}`}
      className="block card hover:shadow-md transition-shadow"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      {r.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.coverImageUrl}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 160,
            background: 'var(--paper-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-serif)',
            fontSize: 56,
            color: 'var(--ink-muted)',
          }}
        >
          {r.title[0]?.toUpperCase() ?? '?'}
        </div>
      )}
      <div style={{ padding: 'var(--s-4)' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.2 }}>
          {r.title}
        </div>
        <div className="t-meta mt-1">
          by {author}
          {r.cuisine ? ` · ${r.cuisine}` : ''}
          {r.totalMinutes ? ` · ${r.totalMinutes} min` : ''}
        </div>
        {r.starCount > 0 ? (
          <div className="t-meta mt-1">★ {r.starCount}</div>
        ) : null}
      </div>
    </Link>
  );
}
