import Link from 'next/link';
import { PhotoCaptureForm } from './photo-capture-form';

export const metadata = { title: 'Capture from photo' };

export default function CapturePhotoPage() {
  return (
    <div className="container-rb py-8 sm:py-12 max-w-2xl">
      <Link href="/capture" className="t-meta">
        ← Back
      </Link>
      <h1 className="t-h1 mt-3">Snap or upload.</h1>
      <p className="t-body soft mt-2">
        A printed card, a cookbook page, a screenshot. We'll do our best — fields we're unsure about
        will be highlighted on the next screen so you can double-check.
      </p>
      <div className="mt-6">
        <PhotoCaptureForm />
      </div>
    </div>
  );
}
