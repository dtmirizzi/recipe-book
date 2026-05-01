'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SettingsClient({
  email,
  name,
  unitPreference,
}: {
  email: string;
  name: string | null;
  unitPreference: 'us' | 'metric';
}) {
  const [displayName, setDisplayName] = useState(name ?? '');
  const [units, setUnits] = useState(unitPreference);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: displayName || null, unitPreference: units }),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    const res = await fetch('/api/account/export');
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recipe-box-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteAccount() {
    setSaving(true);
    await fetch('/api/account', { method: 'DELETE' });
    router.push('/');
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3">
        <div>
          <div className="t-eyebrow">Email</div>
          <div className="mt-1">{email}</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="t-eyebrow">Display name</span>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should we call you?"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="t-eyebrow">Units</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="chip"
              aria-pressed={units === 'us'}
              onClick={() => setUnits('us')}
            >
              US (cups, tbsp)
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={units === 'metric'}
              onClick={() => setUnits('metric')}
            >
              Metric (g, ml)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {savedAt ? <span className="t-meta">Saved.</span> : null}
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <div className="t-eyebrow">Your data</div>
        <p className="t-body soft">Download a JSON export of your recipes and pantry.</p>
        <div>
          <button type="button" className="btn" onClick={exportData}>
            Export data
          </button>
        </div>
      </section>

      <section className="card flex flex-col gap-3" style={{ borderColor: 'var(--err)' }}>
        <div className="t-eyebrow" style={{ color: 'var(--err)' }}>
          Danger zone
        </div>
        <p className="t-body soft">
          Delete your account and all your recipes. This cannot be undone.
        </p>
        {!confirming ? (
          <div>
            <button
              type="button"
              className="btn"
              style={{ color: 'var(--err)', borderColor: 'var(--err)' }}
              onClick={() => setConfirming(true)}
            >
              Delete my account
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="t-meta">This is permanent.</span>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--err)', borderColor: 'var(--err)', color: '#fff' }}
              onClick={deleteAccount}
              disabled={saving}
            >
              {saving ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
