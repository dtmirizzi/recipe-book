import { redirect } from 'next/navigation';
import { auth } from './config';

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');
  return session.user as { id: string; email: string; name?: string | null };
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ? (session.user as { id: string; email: string; name?: string | null }) : null;
}
