'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <span className="t-meta">Sure?</span>
      <button
        type="button"
        className="btn"
        onClick={() => setConfirming(false)}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        type="button"
        className="btn"
        style={{ background: 'var(--err)', color: '#fff', borderColor: 'var(--err)' }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
          router.push('/library');
        }}
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}
