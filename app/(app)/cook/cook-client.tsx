'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoredRecipe } from '@/lib/search/score';
import type { ParsedQuery } from '@/lib/search/parse-query';

const SUGGESTIONS = [
  'Quick weeknight dinner',
  'Use what’s about to expire',
  'Vegetarian, under 30 min',
  'Comforting and one pan',
];

export function CookClient({ pantryCount }: { pantryCount: number }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ScoredRecipe[] | null>(null);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/cook/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Search failed');
      }
      const data = await res.json();
      setResults(data.results);
      setParsed(data.parsed);
      setQuery(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          className="input input--lg flex-1"
          placeholder={pantryCount > 0 ? 'What can I make…?' : 'Add a few pantry items first, then ask away…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={busy}
          aria-label="Cooking query"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !query.trim()}
        >
          {busy ? 'Thinking…' : 'Cook'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="chip chip-accent"
            onClick={() => search(s)}
            disabled={busy}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <div className="card" style={{ borderColor: 'var(--err)' }}>
          <p className="t-body" style={{ color: 'var(--err)' }}>{error}</p>
        </div>
      ) : null}

      {parsed ? <ParsedSummary parsed={parsed} /> : null}

      {busy ? <ResultsSkeleton /> : null}

      {results !== null && !busy ? (
        results.length === 0 ? (
          <NoMatches pantryCount={pantryCount} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r) => (
              <li key={r.recipe.id}>
                <ResultCard r={r} />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function ParsedSummary({ parsed }: { parsed: ParsedQuery }) {
  const bits: string[] = [];
  if (parsed.timeMaxMinutes) bits.push(`≤ ${parsed.timeMaxMinutes} min`);
  if (parsed.mood) bits.push(parsed.mood.replace('_', ' '));
  for (const d of parsed.dietaryRequired) bits.push(d);
  if (parsed.prioritizeExpiring) bits.push('expiring first');
  for (const m of parsed.mustUseIngredients) bits.push(`uses ${m}`);
  if (bits.length === 0) return null;
  return (
    <div className="t-meta flex flex-wrap gap-2 items-center">
      <span>looking for:</span>
      {bits.map((b) => (
        <span key={b} className="chip" style={{ fontSize: 11 }}>
          {b}
        </span>
      ))}
    </div>
  );
}

function ResultCard({ r }: { r: ScoredRecipe }) {
  const accent = r.matchPct >= 80;
  const expiring = r.expiringIngredients.length > 0;

  return (
    <Link
      href={`/recipes/${r.recipe.id}`}
      className="block card hover:shadow-md transition-shadow"
      style={{ padding: 'var(--s-4)' }}
    >
      <div className="flex justify-between gap-3 items-start">
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.2 }}>
            {r.recipe.title}
          </div>
          <div className="t-meta mt-1">
            {r.recipe.totalMinutes ? `${r.recipe.totalMinutes} min` : '—'}
            {r.recipe.cuisine ? ` · ${r.recipe.cuisine}` : ''}
          </div>
        </div>
        <span
          className={accent ? 'chip chip-accent' : 'chip'}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          {r.matchPct}% match
        </span>
      </div>

      {expiring ? (
        <div className="mt-3">
          <span className="chip chip-saffron" style={{ fontSize: 11, padding: '2px 8px' }}>
            uses {r.expiringIngredients.slice(0, 2).join(', ')}{' ⚠'}
          </span>
        </div>
      ) : null}

      {r.missingIngredients.length > 0 ? (
        <div className="t-meta mt-2">
          Need: {r.missingIngredients.slice(0, 4).join(', ')}
          {r.missingIngredients.length > 4 ? `, +${r.missingIngredients.length - 4} more` : ''}
        </div>
      ) : (
        <div className="t-meta mt-2" style={{ color: 'var(--ok)' }}>
          You have everything.
        </div>
      )}
    </Link>
  );
}

function ResultsSkeleton() {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="card" style={{ padding: 'var(--s-4)' }}>
          <div className="skeleton" style={{ height: 22, width: '70%' }} />
          <div className="skeleton mt-2" style={{ height: 14, width: '40%' }} />
          <div className="skeleton mt-3" style={{ height: 14, width: '90%' }} />
        </li>
      ))}
    </ul>
  );
}

function NoMatches({ pantryCount }: { pantryCount: number }) {
  return (
    <div className="card text-center py-12">
      <h3 className="t-h3" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24 }}>
        No close matches.
      </h3>
      <p className="t-body soft mt-2">
        {pantryCount === 0
          ? "Try adding some pantry items first — we use them to rank recipes."
          : 'Try widening your search or clearing constraints.'}
      </p>
      {pantryCount === 0 ? (
        <Link href="/pantry" className="btn btn-primary mt-4 inline-block">
          Set up your pantry
        </Link>
      ) : null}
    </div>
  );
}
