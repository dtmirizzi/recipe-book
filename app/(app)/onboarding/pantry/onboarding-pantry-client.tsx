'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingPantryClient({ starters }: { starters: Record<string, string[]> }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  function toggle(name: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function save() {
    if (picked.size === 0) {
      router.push('/capture');
      return;
    }
    setBusy(true);
    try {
      // Add in series — a small dataset, no need to parallelize.
      for (const name of picked) {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      }
      router.push('/capture');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(starters).map(([cat, items]) => (
        <section key={cat}>
          <div className="t-eyebrow mb-2">{cat}</div>
          <div className="flex flex-wrap gap-2">
            {items.map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                aria-pressed={picked.has(name)}
                onClick={() => toggle(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="flex gap-3 mt-4 py-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={busy}
        >
          {busy ? 'Saving…' : `Add ${picked.size || ''} item${picked.size === 1 ? '' : 's'}`.trim() || 'Continue'}
        </button>
        <Link href="/capture" className="btn">
          Skip
        </Link>
      </div>
    </div>
  );
}
