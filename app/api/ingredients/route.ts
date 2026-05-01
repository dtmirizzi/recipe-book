import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { searchIngredients } from '@/lib/db/queries/pantry';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const items = await searchIngredients(q, 12);
  return NextResponse.json({ items });
}
