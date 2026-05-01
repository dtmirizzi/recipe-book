import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { joinRoundtable } from '@/lib/db/queries/roundtables';

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { code } = await params;
  const rt = await joinRoundtable(session.user.id, code);
  if (!rt) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 });
  return NextResponse.json({ roundtable: rt });
}
