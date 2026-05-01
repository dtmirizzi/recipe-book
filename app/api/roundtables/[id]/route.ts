import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getRoundtable, leaveRoundtable, roundtableFeed } from '@/lib/db/queries/roundtables';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const rt = await getRoundtable(session.user.id, id);
  if (!rt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const feed = await roundtableFeed(session.user.id, id);
  return NextResponse.json({ roundtable: rt, feed });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await leaveRoundtable(session.user.id, id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
