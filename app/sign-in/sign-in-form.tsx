'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export function SignInForm({ hasResend }: { hasResend: boolean }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get('next') ?? '/library';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const provider = hasResend ? 'resend' : 'dev';
      // For Resend (magic link), let next-auth handle the redirect to /verify.
      // For dev credentials, do redirect:false and navigate manually so we
      // land on /library reliably.
      if (provider === 'dev') {
        const res = await signIn('dev', { email, redirect: false });
        if (res?.error) {
          setError('Could not sign in.');
          setBusy(false);
          return;
        }
        router.push(next);
        router.refresh();
      } else {
        await signIn('resend', { email, redirect: true, redirectTo: next });
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
      <label className="t-eyebrow" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        placeholder="you@example.com"
        className="input input--lg"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
      />
      {error ? <p className="t-meta" style={{ color: 'var(--err)' }}>{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={busy || !email.includes('@')}>
        {busy ? 'One moment…' : hasResend ? 'Send magic link' : 'Continue'}
      </button>
    </form>
  );
}
