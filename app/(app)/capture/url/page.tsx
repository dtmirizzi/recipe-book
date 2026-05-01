import Link from 'next/link';
import { UrlCaptureForm } from './url-capture-form';

export const metadata = { title: 'Capture from URL' };

export default function CaptureUrlPage() {
  return (
    <div className="container-rb py-8 sm:py-12 max-w-2xl">
      <Link href="/capture" className="t-meta">
        ← Back
      </Link>
      <h1 className="t-h1 mt-3">Paste a recipe link.</h1>
      <p className="t-body soft mt-2">
        Most cooking sites embed structured data — we'll grab the title, ingredients, and steps in
        seconds. If a site doesn't, we'll still try to read the page.
      </p>
      <div className="mt-6">
        <UrlCaptureForm />
      </div>
    </div>
  );
}
