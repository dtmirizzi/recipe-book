import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Add a recipe' };

const DOORS = [
  {
    href: '/capture/url',
    eyebrow: 'Paste a link',
    title: 'From a URL.',
    body: 'Cooking blogs, news sites, anywhere with a recipe page. We pull the structured data first, then read the page if needed.',
    accent: false,
  },
  {
    href: '/capture/photo',
    eyebrow: 'Snap or upload',
    title: 'From a photo.',
    body: 'A printed recipe card, a cookbook page, a screenshot from your camera roll, even handwriting (best-effort).',
    accent: true,
  },
  {
    href: '/capture/text',
    eyebrow: 'Paste the text',
    title: 'From text.',
    body: 'Copy and paste any recipe — from a chat, a note, an email — and we will structure it.',
    accent: false,
  },
];

export default async function CapturePage() {
  await requireUser();

  return (
    <div className="container-rb py-8 sm:py-12 max-w-3xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        New recipe
      </div>
      <h1 className="t-h1 mt-1">Save anything.</h1>
      <p className="t-body soft mt-2 max-w-xl">
        Three doors. Pick whichever fits what you have.
      </p>

      <div className="mt-8 grid gap-3">
        {DOORS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="card flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow"
            style={d.accent ? { borderColor: 'var(--tomato-300)', background: 'var(--tomato-50)' } : undefined}
          >
            <div className="flex-1">
              <div className="t-eyebrow" style={{ color: d.accent ? 'var(--tomato-700)' : undefined }}>
                {d.eyebrow}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, lineHeight: 1.2, marginTop: 4 }}>
                {d.title}
              </div>
              <p className="t-body soft mt-1">{d.body}</p>
            </div>
            <div className="t-eyebrow" style={{ color: d.accent ? 'var(--tomato-700)' : 'var(--ink-muted)' }}>
              →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
