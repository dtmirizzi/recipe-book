import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        404
      </div>
      <h1 className="t-h1 mt-2">Nothing on that shelf.</h1>
      <p className="t-body soft mt-2 max-w-sm">
        That page either moved, never existed, or belongs to someone else.
      </p>
      <Link href="/library" className="btn btn-primary mt-6">
        Back to library
      </Link>
    </div>
  );
}
