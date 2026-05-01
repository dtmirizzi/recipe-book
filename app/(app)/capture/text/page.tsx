import Link from 'next/link';
import { TextCaptureForm } from './text-capture-form';

export const metadata = { title: 'Capture from text' };

export default function CaptureTextPage() {
  return (
    <div className="container-rb py-8 sm:py-12 max-w-2xl">
      <Link href="/capture" className="t-meta">
        ← Back
      </Link>
      <h1 className="t-h1 mt-3">Paste your recipe.</h1>
      <p className="t-body soft mt-2">
        Paste anything that looks like a recipe — title, ingredients, steps. We'll do our best to
        structure it. You can clean it up on the next screen.
      </p>
      <div className="mt-6">
        <TextCaptureForm />
      </div>
    </div>
  );
}
