'use client';

import { useState } from 'react';

export function StarButton({
  recipeId,
  initialStarred,
}: {
  recipeId: string;
  initialStarred: boolean;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !starred;
    setStarred(next);
    const method = next ? 'POST' : 'DELETE';
    const res = await fetch(`/api/recipes/${recipeId}/star`, { method });
    if (!res.ok) setStarred(!next); // revert
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={starred ? 'btn btn-primary' : 'btn'}
      onClick={toggle}
      disabled={busy}
    >
      {starred ? '★ Starred' : '☆ Star'}
    </button>
  );
}
