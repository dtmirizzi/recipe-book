import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { starRecipe, unstarRecipe } from '@/lib/db/queries/stars';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await starRecipe(session.user.id, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await unstarRecipe(session.user.id, id);
  return NextResponse.json({ ok: true });
}
