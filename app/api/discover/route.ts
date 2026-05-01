import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { discoverPublicRecipes } from '@/lib/db/queries/discover';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = new URL(req.url).searchParams.get('q') ?? undefined;
  const results = await discoverPublicRecipes(q);
  return NextResponse.json({ results });
}
