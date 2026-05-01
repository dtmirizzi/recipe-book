import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth/config';
import { addPantryItem, ensureIngredient, listPantry, removePantryItem } from '@/lib/db/queries/pantry';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await listPantry(session.user.id);
  return NextResponse.json({ items });
}

const addBody = z.object({
  name: z.string().min(1).max(80).optional(),
  ingredientId: z.string().uuid().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = addBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  if (!parsed.data.name && !parsed.data.ingredientId) {
    return NextResponse.json({ error: 'name or ingredientId required' }, { status: 400 });
  }
  let ingredientId = parsed.data.ingredientId;
  if (!ingredientId) {
    const ing = await ensureIngredient(parsed.data.name!);
    ingredientId = ing.id;
  }
  const row = await addPantryItem(session.user.id, ingredientId, parsed.data.expiresAt ?? null);
  return NextResponse.json({ ok: true, item: row });
}

const removeBody = z.object({ ingredientId: z.string().uuid() });

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = removeBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  await removePantryItem(session.user.id, parsed.data.ingredientId);
  return NextResponse.json({ ok: true });
}
