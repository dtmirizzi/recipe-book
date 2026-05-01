'use client';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="t-eyebrow" style={{ color: 'var(--err)' }}>
        Something burned.
      </div>
      <h1 className="t-h1 mt-2">Try that again?</h1>
      <p className="t-body soft mt-2 max-w-sm">
        {error.message || 'An unexpected error happened.'}
      </p>
      <button onClick={reset} className="btn btn-primary mt-6">
        Reload
      </button>
    </div>
  );
}
