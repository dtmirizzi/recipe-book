'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Roundtable } from '@/db/schema';

type Item = Roundtable & { role: 'owner' | 'member'; memberCount: number };

export function RoundtablesClient({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/roundtables', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Could not create');
      const { roundtable } = await res.json();
      router.push(`/roundtables/${roundtable.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={create} className="card mt-6 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Roundtable name (e.g. Sunday cooks)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          + Create
        </button>
      </form>

      {error ? <p className="t-meta mt-3" style={{ color: 'var(--err)' }}>{error}</p> : null}

      <div className="mt-8 flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="t-meta">You're not in any roundtables yet.</p>
        ) : (
          items.map((rt) => (
            <Link
              key={rt.id}
              href={`/roundtables/${rt.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22 }}>{rt.name}</div>
              <div className="t-meta mt-1">
                {rt.memberCount} {rt.memberCount === 1 ? 'member' : 'members'} · you are{' '}
                {rt.role}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
