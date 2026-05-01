import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { captureJobs } from '@/db/schema';
import { recipeDraftSchema } from '@/lib/validation/schemas';
import { ReviewForm } from './review-form';

export const metadata = { title: 'Review recipe' };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireUser();
  const { jobId } = await params;

  const job = await db.query.captureJobs.findFirst({
    where: and(eq(captureJobs.id, jobId), eq(captureJobs.userId, user.id)),
  });

  if (!job || !job.output) notFound();

  const parsed = recipeDraftSchema.safeParse(job.output);
  if (!parsed.success) notFound();

  return (
    <div className="container-rb py-8 max-w-3xl">
      <div className="t-eyebrow" style={{ color: 'var(--tomato-700)' }}>
        Review
      </div>
      <h1 className="t-h1 mt-1">Anything to clean up?</h1>
      <p className="t-body soft mt-2">
        Edit anything that looks off, then save it to your library.
      </p>
      <div className="mt-6">
        <ReviewForm jobId={job.id} draft={parsed.data} />
      </div>
    </div>
  );
}
