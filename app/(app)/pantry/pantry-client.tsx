'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type PantryRow = {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  expiresAt: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  protein: 'Proteins',
  grain: 'Grains',
  dairy: 'Dairy',
  pantry: 'Pantry',
  spice: 'Spices',
  condiment: 'Condiments',
  beverage: 'Beverages',
  other: 'Other',
};

const CATEGORY_ORDER = ['produce', 'protein', 'grain', 'dairy', 'pantry', 'spice', 'condiment', 'beverage', 'other'];

export function PantryClient({ initial }: { initial: PantryRow[] }) {
  const [items, setItems] = useState<PantryRow[]>(initial);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; category: string }[]>([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, PantryRow[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    }
    return CATEGORY_ORDER.filter((cat) => (map.get(cat)?.length ?? 0) > 0).map((cat) => ({
      category: cat,
      items: (map.get(cat) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [items]);

  // Type-ahead search
  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ingredients?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSuggestions(data.items ?? []);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  async function add(name: string, ingredientId?: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(ingredientId ? { ingredientId } : { name }),
      });
      if (res.ok) {
        const data = await res.json();
        // Reload from server to get the canonical ingredient row.
        const list = await fetch('/api/pantry').then((r) => r.json());
        setItems(
          (list.items ?? []).map((i: { id: string; ingredientId: string; expiresAt: string | null; ingredient: { name: string; category: string } }) => ({
            id: i.id,
            ingredientId: i.ingredientId,
            name: i.ingredient.name,
            category: i.ingredient.category,
            expiresAt: i.expiresAt ? String(i.expiresAt) : null,
          })),
        );
      }
      setQuery('');
      setSuggestions([]);
      setOpenSuggestions(false);
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function remove(ingredientId: string) {
    setItems((prev) => prev.filter((p) => p.ingredientId !== ingredientId));
    await fetch('/api/pantry', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ingredientId }),
    });
    setActiveId(null);
  }

  async function setExpiry(ingredientId: string, expiresAt: string | null) {
    setItems((prev) =>
      prev.map((p) => (p.ingredientId === ingredientId ? { ...p, expiresAt } : p)),
    );
    await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ingredientId, expiresAt }),
    });
  }

  function isSoonToExpire(dateStr: string | null) {
    if (!dateStr) return false;
    const ts = new Date(dateStr).getTime();
    const now = Date.now();
    return ts - now <= 3 * 24 * 60 * 60 * 1000;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="t-h1">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </h1>
      {/* Add input + type-ahead */}
      <div className="card">
        <div className="t-eyebrow mb-2">Add an ingredient</div>
        <div className="relative">
          <input
            ref={inputRef}
            className="input input--lg"
            value={query}
            placeholder="e.g. lemon, basil, chicken thighs…"
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpenSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions[0]) add(suggestions[0].name, suggestions[0].id);
                else if (query.trim()) add(query.trim());
              }
            }}
            disabled={busy}
          />
          {openSuggestions && suggestions.length > 0 ? (
            <div
              className="card absolute left-0 right-0 mt-1 z-20"
              style={{ padding: 0, maxHeight: 240, overflow: 'auto', boxShadow: 'var(--shadow-md)' }}
              role="listbox"
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-paper-warm flex justify-between items-center"
                  onClick={() => add(s.name, s.id)}
                  role="option"
                  aria-selected={false}
                >
                  <span>{s.name}</span>
                  <span className="t-meta">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Pantry by category */}
      {items.length === 0 ? (
        <EmptyPantry onSeed={add} />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ category, items: catItems }) => (
            <section key={category}>
              <div className="t-eyebrow mb-2">{CATEGORY_LABELS[category] ?? category}</div>
              <div className="flex flex-wrap gap-2">
                {catItems.map((it) => {
                  const expSoon = isSoonToExpire(it.expiresAt);
                  return (
                    <div key={it.id} className="relative">
                      <button
                        type="button"
                        className={expSoon ? 'chip chip-saffron' : 'chip'}
                        onClick={() => setActiveId(activeId === it.ingredientId ? null : it.ingredientId)}
                        aria-expanded={activeId === it.ingredientId}
                      >
                        {it.name}
                        {expSoon ? <span aria-label="Expires soon">⚠</span> : null}
                      </button>
                      {activeId === it.ingredientId ? (
                        <div
                          className="card absolute z-30 mt-2 left-0"
                          style={{ minWidth: 260, padding: 'var(--s-3)', boxShadow: 'var(--shadow-md)' }}
                        >
                          <div className="t-eyebrow mb-2">Expires</div>
                          <input
                            type="date"
                            className="input"
                            value={it.expiresAt ?? ''}
                            onChange={(e) => setExpiry(it.ingredientId, e.target.value || null)}
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => setExpiry(it.ingredientId, null)}
                            >
                              Clear date
                            </button>
                            <button
                              type="button"
                              className="btn"
                              style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
                              onClick={() => remove(it.ingredientId)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const STARTER_KIT = [
  'olive oil', 'salt', 'pepper', 'garlic', 'onion', 'lemon', 'butter', 'flour', 'eggs',
  'rice', 'pasta', 'tomato paste', 'soy sauce', 'parmesan', 'parsley',
];

function EmptyPantry({ onSeed }: { onSeed: (name: string) => void }) {
  return (
    <div className="card text-center py-10">
      <h3 className="t-h3" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24 }}>
        Your pantry is empty.
      </h3>
      <p className="t-body soft mt-2">Start with a few staples — tap any to add.</p>
      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {STARTER_KIT.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => onSeed(s)}>
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
