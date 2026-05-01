import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { HeroVideo } from '@/components/HeroVideo';
import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect('/library');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="topbar topbar--over-video">
        <div className="container-rb inner">
          <Logo size={32} />
          <nav className="flex items-center gap-3">
            <Link href="/sign-in" className="btn btn-ghost">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="hero">
          <HeroVideo />
          <div className="hero-content container-rb pt-12 sm:pt-20 pb-20 max-w-3xl">
            <div className="t-eyebrow mb-3" style={{ color: 'var(--tomato-700)' }}>
              v1 · personal recipe box
            </div>
            <h1 className="t-display">Tonight, something warm.</h1>
            <p className="t-body soft mt-4 max-w-xl">
              Save recipes from anywhere — a URL, a photo of a card, a screenshot, a paste. When
              5pm rolls around, ask what you can make with what's actually in the kitchen.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/sign-in" className="btn btn-primary">
                Start your box
              </Link>
              <Link href="/sign-in" className="btn">
                I already have one
              </Link>
            </div>
          </div>
        </section>

        <section className="container-rb py-12 sm:py-16 grid sm:grid-cols-3 gap-4 max-w-5xl">
          <FeatureCard
            eyebrow="01 · Capture"
            title="Save anything."
            body="URLs, photos of cards, pasted text. We pull out the title, ingredients, steps, time and tags."
          />
          <FeatureCard
            eyebrow="02 · Library"
            title="Your collection."
            body="Search and filter by cuisine, time, or tags. Scale servings up or down without doing math."
          />
          <FeatureCard
            eyebrow="03 · Cook"
            title="What's for dinner?"
            body="Ask in plain English. We'll rank recipes by how well they fit the pantry — and use the lemons before they turn."
            accent
          />
        </section>
      </main>

      <footer className="container-rb py-6 t-meta">
        Recipe Box · made for home cooks.
      </footer>
    </div>
  );
}

function FeatureCard({
  eyebrow,
  title,
  body,
  accent = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className="card"
      style={accent ? { borderColor: 'var(--tomato-300)', background: 'var(--tomato-50)' } : undefined}
    >
      <div className="t-eyebrow" style={{ color: accent ? 'var(--tomato-700)' : 'var(--ink-muted)' }}>
        {eyebrow}
      </div>
      <h3 className="t-h3 mt-2" style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22 }}>
        {title}
      </h3>
      <p className="t-body soft mt-2">{body}</p>
    </div>
  );
}
