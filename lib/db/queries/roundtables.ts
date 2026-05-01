import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  recipes,
  roundtableMembers,
  roundtables,
  users,
  recipeStars,
} from '@/db/schema';
import type { Roundtable } from '@/db/schema';

function newInviteCode(): string {
  return randomBytes(9).toString('base64url');
}

export async function createRoundtable(userId: string, name: string): Promise<Roundtable> {
  const inviteCode = newInviteCode();
  return await db.transaction(async (tx) => {
    const [rt] = await tx
      .insert(roundtables)
      .values({ name, ownerId: userId, inviteCode })
      .returning();
    await tx.insert(roundtableMembers).values({
      roundtableId: rt.id,
      userId,
      role: 'owner',
    });
    return rt;
  });
}

export async function listMyRoundtables(userId: string) {
  const rows = await db
    .select({
      rt: roundtables,
      role: roundtableMembers.role,
      memberCount: sql<number>`(
        select count(*)::int from ${roundtableMembers}
        where ${roundtableMembers.roundtableId} = ${roundtables.id}
      )`,
    })
    .from(roundtableMembers)
    .innerJoin(roundtables, eq(roundtables.id, roundtableMembers.roundtableId))
    .where(eq(roundtableMembers.userId, userId))
    .orderBy(desc(roundtables.createdAt));
  return rows.map((r) => ({ ...r.rt, role: r.role, memberCount: Number(r.memberCount) }));
}

export async function getRoundtable(userId: string, id: string) {
  // verify membership
  const me = await db
    .select({ role: roundtableMembers.role })
    .from(roundtableMembers)
    .where(and(eq(roundtableMembers.roundtableId, id), eq(roundtableMembers.userId, userId)))
    .limit(1);
  if (me.length === 0) return null;

  const [rt] = await db.select().from(roundtables).where(eq(roundtables.id, id)).limit(1);
  if (!rt) return null;

  const members = await db
    .select({
      userId: roundtableMembers.userId,
      role: roundtableMembers.role,
      joinedAt: roundtableMembers.joinedAt,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(roundtableMembers)
    .innerJoin(users, eq(users.id, roundtableMembers.userId))
    .where(eq(roundtableMembers.roundtableId, id))
    .orderBy(roundtableMembers.joinedAt);

  return { ...rt, role: me[0].role, members };
}

export async function getRoundtableByInviteCode(code: string) {
  const [rt] = await db
    .select()
    .from(roundtables)
    .where(eq(roundtables.inviteCode, code))
    .limit(1);
  return rt ?? null;
}

export async function joinRoundtable(userId: string, code: string): Promise<Roundtable | null> {
  const rt = await getRoundtableByInviteCode(code);
  if (!rt) return null;
  await db
    .insert(roundtableMembers)
    .values({ roundtableId: rt.id, userId, role: 'member' })
    .onConflictDoNothing();
  return rt;
}

export async function leaveRoundtable(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(roundtableMembers)
    .where(
      and(
        eq(roundtableMembers.roundtableId, id),
        eq(roundtableMembers.userId, userId),
      ),
    )
    .returning({ userId: roundtableMembers.userId });
  return rows.length > 0;
}

/**
 * Feed for a roundtable: every non-deleted recipe owned by any member,
 * including the viewer's own recipes (so they see the same view as everyone).
 */
export async function roundtableFeed(userId: string, id: string) {
  // verify membership
  const me = await db
    .select({ userId: roundtableMembers.userId })
    .from(roundtableMembers)
    .where(and(eq(roundtableMembers.roundtableId, id), eq(roundtableMembers.userId, userId)))
    .limit(1);
  if (me.length === 0) return null;

  const memberRows = await db
    .select({ userId: roundtableMembers.userId })
    .from(roundtableMembers)
    .where(eq(roundtableMembers.roundtableId, id));
  const memberIds = memberRows.map((m) => m.userId);
  if (memberIds.length === 0) return [];

  const starCount = sql<number>`(
    select count(*)::int from ${recipeStars}
    where ${recipeStars.recipeId} = ${recipes.id}
  )`;

  const rows = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      description: recipes.description,
      cuisine: recipes.cuisine,
      totalMinutes: recipes.totalMinutes,
      baseServings: recipes.baseServings,
      coverImageUrl: recipes.coverImageUrl,
      authorId: recipes.userId,
      authorName: users.name,
      authorEmail: users.email,
      starCount,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .innerJoin(users, eq(users.id, recipes.userId))
    .where(and(inArray(recipes.userId, memberIds), isNull(recipes.deletedAt)))
    .orderBy(desc(recipes.createdAt))
    .limit(200);

  return rows;
}
