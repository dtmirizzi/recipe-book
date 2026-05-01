import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { flags } from '@/lib/env';
import { SignInForm } from './sign-in-form';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="card w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size={36} />
        </div>
        <h1 className="t-h1" style={{ fontSize: 28, textAlign: 'center' }}>
          Welcome back.
        </h1>
        <p className="t-meta mt-1 text-center">
          {flags.hasResendKey
            ? 'Enter your email — we’ll send a magic link.'
            : 'Local dev mode — any email signs you in.'}
        </p>

        <Suspense fallback={<div className="skeleton h-12 mt-6" />}>
          <SignInForm hasResend={flags.hasResendKey} />
        </Suspense>

        <p className="t-meta mt-6 text-center">
          By continuing you agree to keep your recipes to yourself. We don’t share them.
        </p>
      </div>
    </div>
  );
}
