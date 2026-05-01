import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { createRoundtable, listMyRoundtables } from '@/lib/db/queries/roundtables';

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await listMyRoundtables(session.user.id);
  return NextResponse.json({ roundtables: list });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  const rt = await createRoundtable(session.user.id, parsed.data.name);
  return NextResponse.json({ roundtable: rt }, { status: 201 });
}
