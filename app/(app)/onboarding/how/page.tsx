import Link from 'next/link';

export const metadata = { title: 'How it works' };

const STEPS = [
  {
    eyebrow: 'Save',
    title: 'Capture from anywhere.',
    body: 'A URL, a photo, or pasted text — we structure the recipe so it lives in one place.',
  },
  {
    eyebrow: 'Browse',
    title: 'Find what you saved.',
    body: 'Search by title or ingredient. Filter by cuisine, time, or dietary tag. Scale servings without doing math.',
  },
  {
    eyebrow: 'Cook',
    title: '“What can I make?”',
    body: 'Ask in plain English. We rank your recipes by what fits the pantry — and prioritize anything about to expire.',
  },
];

export default function OnboardingHowPage() {
  return (
    <div className="container-rb py-8 max-w-3xl">
      <Link href="/onboarding" className="t-meta">
        ← Back
      </Link>
      <div className="t-eyebrow mt-3" style={{ color: 'var(--tomato-700)' }}>
        Step 01 · How it works
      </div>
      <h1 className="t-h1 mt-1">A 30-second tour.</h1>

      <div className="mt-8 grid gap-4">
        {STEPS.map((s, i) => (
          <div key={i} className="card flex gap-4 items-start">
            <div
              className="flex items-center justify-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: 'var(--tomato-50)',
                color: 'var(--tomato-700)',
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                fontWeight: 600,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {i + 1}
            </div>
            <div>
              <div className="t-eyebrow">{s.eyebrow}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, lineHeight: 1.2, marginTop: 4 }}>
                {s.title}
              </div>
              <p className="t-body soft mt-2">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/onboarding/pantry" className="btn btn-primary">
          Next: seed your pantry
        </Link>
        <Link href="/library" className="btn">
          Skip
        </Link>
      </div>
    </div>
  );
}
