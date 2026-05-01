import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  await requireUser();
  return (
    <div className="container-rb py-8 sm:py-14 max-w-3xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        Welcome
      </div>
      <h1 className="t-h1 mt-1">Three quick steps.</h1>
      <p className="t-body soft mt-2 max-w-xl">
        Skip any of these and come back anytime. You can always change your mind.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mt-8">
        <StepCard
          number="01"
          title="How it works."
          body="A short tour of capture, library, and the cook page. About 30 seconds."
          href="/onboarding/how"
          cta="Take the tour"
        />
        <StepCard
          number="02"
          title="Seed your pantry."
          body="Tap the staples you usually have. We'll use them to rank recipes."
          href="/onboarding/pantry"
          cta="Pick staples"
          accent
        />
        <StepCard
          number="03"
          title="Add a recipe."
          body="Paste a URL, snap a photo, or paste any recipe text."
          href="/capture"
          cta="Save your first recipe"
        />
      </div>

      <div className="mt-8">
        <Link href="/library" className="btn">
          Skip — I'll explore first
        </Link>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  body,
  href,
  cta,
  accent = false,
}: {
  number: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="card flex flex-col gap-2"
      style={accent ? { borderColor: 'var(--tomato-300)', background: 'var(--tomato-50)' } : undefined}
    >
      <div className="t-eyebrow" style={{ color: accent ? 'var(--tomato-700)' : undefined }}>
        Step {number}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.2 }}>{title}</div>
      <p className="t-body soft">{body}</p>
      <span className="t-eyebrow mt-auto" style={{ color: 'var(--tomato-700)' }}>
        {cta} →
      </span>
    </Link>
  );
}
