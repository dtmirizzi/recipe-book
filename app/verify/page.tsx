import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Check your email' };

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="card w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Logo size={36} />
        </div>
        <h1 className="t-h1" style={{ fontSize: 28 }}>
          Check your email.
        </h1>
        <p className="t-meta mt-2">
          We just sent a magic link. Open it on this device to sign in.
        </p>
        <Link href="/sign-in" className="btn mt-6">
          Use a different email
        </Link>
      </div>
    </div>
  );
}
