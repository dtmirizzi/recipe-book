import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { recipeDraftSchema } from '@/lib/validation/schemas';
import { getRecipe, softDeleteRecipe, updateRecipe } from '@/lib/db/queries/recipes';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const recipe = await getRecipe(session.user.id, id);
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ recipe });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = recipeDraftSchema.safeParse(json?.draft ?? json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid recipe' }, { status: 400 });
  await updateRecipe(session.user.id, id, parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await softDeleteRecipe(session.user.id, id);
  return NextResponse.json({ ok: true });
}
