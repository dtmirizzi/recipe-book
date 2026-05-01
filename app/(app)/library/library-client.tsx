'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { RecipeListItem, LibraryFilters } from '@/lib/db/queries/recipes';

const TIME_BUCKETS = [
  { id: '15', label: '≤ 15 min' },
  { id: '30', label: '≤ 30 min' },
  { id: '60', label: '≤ 60 min' },
  { id: '60+', label: '> 60 min' },
];

const MEALS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
  { id: 'dessert', label: 'Dessert' },
  { id: 'side', label: 'Side' },
  { id: 'sauce', label: 'Sauce' },
];

export function LibraryClient({
  initialRecipes,
  initialQuery,
}: {
  initialRecipes: RecipeListItem[];
  initialQuery: LibraryFilters;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialQuery.q ?? '');

  const cuisines = useMemo(() => {
    const set = new Set<string>();
    for (const r of initialRecipes) if (r.cuisine) set.add(r.cuisine);
    return [...set].sort();
  }, [initialRecipes]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const r of initialRecipes) for (const t of r.dietaryTags ?? []) set.add(t);
    return [...set].sort();
  }, [initialRecipes]);

  function update(next: Partial<LibraryFilters>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === null || v === '') sp.delete(k);
      else sp.set(k, String(v));
    }
    router.push(`/library?${sp.toString()}`);
  }

  function active(key: keyof LibraryFilters, val: string) {
    return params.get(key) === val;
  }

  if (initialRecipes.length === 0 && !params.toString()) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <input
            className="input input--lg"
            placeholder={`Search ${initialRecipes.length} recipes…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') update({ q: q || undefined });
            }}
            aria-label="Search recipes"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <FilterGroup
            label="Time"
            options={TIME_BUCKETS}
            active={(o) => active('time', o.id)}
            onPick={(o) => update({ time: active('time', o.id) ? undefined : o.id })}
          />
          <FilterGroup
            label="Meal"
            options={MEALS}
            active={(o) => active('meal', o.id)}
            onPick={(o) => update({ meal: active('meal', o.id) ? undefined : o.id })}
          />
          {cuisines.length > 0 && (
            <FilterGroup
              label="Cuisine"
              options={cuisines.map((c) => ({ id: c, label: c }))}
              active={(o) => active('cuisine', o.id)}
              onPick={(o) => update({ cuisine: active('cuisine', o.id) ? undefined : o.id })}
            />
          )}
          {tags.length > 0 && (
            <FilterGroup
              label="Tag"
              options={tags.map((t) => ({ id: t, label: t }))}
              active={(o) => active('tag', o.id)}
              onPick={(o) => update({ tag: active('tag', o.id) ? undefined : o.id })}
            />
          )}
          {params.toString() ? (
            <button
              className="btn btn-ghost"
              onClick={() => router.push('/library')}
              aria-label="Clear filters"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {initialRecipes.length === 0 ? (
        <NoMatches />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialRecipes.map((r) => (
            <li key={r.id}>
              <RecipeCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterGroup<T extends { id: string; label: string }>({
  label,
  options,
  active,
  onPick,
}: {
  label: string;
  options: T[];
  active: (o: T) => boolean;
  onPick: (o: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="t-eyebrow mr-1">{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="chip"
          aria-pressed={active(o)}
          onClick={() => onPick(o)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RecipeCard({ r }: { r: RecipeListItem }) {
  return (
    <Link
      href={`/recipes/${r.id}`}
      className="block card hover:shadow-md transition-shadow"
      style={{ padding: 'var(--s-4)' }}
    >
      <div className="flex gap-3">
        <div
          className="rounded-md flex-shrink-0 flex items-center justify-center"
          style={{ width: 64, height: 64, background: 'var(--paper-soft)', color: 'var(--ink-muted)' }}
        >
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>{r.title[0]?.toUpperCase() ?? '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, lineHeight: 1.2 }}>
            {r.title}
          </div>
          <div className="t-meta mt-1">
            {r.totalMinutes ? `${r.totalMinutes} min · ` : ''}
            {r.baseServings} servings
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {r.dietaryTags.slice(0, 2).map((t) => (
              <span key={t} className="chip" style={{ fontSize: 11, padding: '2px 8px' }}>
                {t}
              </span>
            ))}
            {r.cuisine ? (
              <span className="chip chip-accent" style={{ fontSize: 11, padding: '2px 8px' }}>
                {r.cuisine}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center text-center py-16">
      <div
        className="rounded-full flex items-center justify-center mb-4"
        style={{ width: 64, height: 64, background: 'var(--tomato-50)' }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--tomato-700)' }}>+</span>
      </div>
      <h2 className="t-h2" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28 }}>
        Your box is empty.
      </h2>
      <p className="t-body soft mt-2 max-w-sm">
        Add the first recipe — paste a URL, snap a photo, or paste the text. We'll pull out the
        ingredients, steps, and time.
      </p>
      <Link href="/capture" className="btn btn-primary mt-6">
        Add a recipe
      </Link>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="card text-center py-12">
      <h3 className="t-h3">No matches.</h3>
      <p className="t-meta mt-1">Try clearing a filter or widening your search.</p>
    </div>
  );
}
