import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb, schema } from "../db";
import { ipHash, randomToken, sha256 } from "../crypto";
import { isProd } from "../env";
import { clientIp, userAgent } from "../request";

export const COOKIE = () => (isProd() ? "__Host-nawat_session" : "nawat_session");
const STAFF_TTL_H = 12;
const USER_TTL_H = 24 * 7;

export type User = typeof schema.users.$inferSelect;
export type Session = typeof schema.sessions.$inferSelect;

const isStaffRole = (r: User["role"]) => r === "SUPER_ADMIN" || r === "STAFF";
export const ttlHours = (u: User) => (isStaffRole(u.role) ? STAFF_TTL_H : USER_TTL_H);

export async function createSession(user: User, mfaPassed: boolean) {
  const db = await getDb();
  const token = randomToken(32);
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId: user.id,
    mfaPassed,
    expiresAt: new Date(Date.now() + ttlHours(user) * 3600_000),
    ipHash: ipHash(await clientIp()),
    userAgent: await userAgent(),
  });
  // Clean up this user's expired sessions opportunistically.
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, user.id), lt(schema.sessions.expiresAt, new Date())));
  (await cookies()).set(COOKIE(), token, {
    httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600,
  });
}

/** Current session + user, or null. Memoised per request. */
export const getSession = cache(async (): Promise<{ session: Session; user: User } | null> => {
  const token = (await cookies()).get(COOKIE())?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const rows = await db.select().from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sha256(token))).limit(1);
  const row = rows[0];
  if (!row) return null;
  const { sessions: session, users: user } = row;
  const now = new Date();
  if (session.expiresAt < now || user.status !== "ACTIVE" || (user.expiresAt && user.expiresAt < now)) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, session.id));
    return null;
  }
  // Sliding expiry, written at most every 10 minutes.
  const fresh = new Date(Date.now() + ttlHours(user) * 3600_000);
  if (fresh.getTime() - session.expiresAt.getTime() > 10 * 60_000) {
    await db.update(schema.sessions).set({ expiresAt: fresh }).where(eq(schema.sessions.id, session.id));
  }
  return { session, user };
});

export async function updateSession(id: string, patch: Partial<Pick<Session, "mfaPassed" | "actingAsAccountId" | "actingUntil">>) {
  const db = await getDb();
  await db.update(schema.sessions).set(patch).where(eq(schema.sessions.id, id));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE())?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  }
  jar.delete(COOKIE());
}

/** Log out everywhere: used after password changes and suspensions. */
export async function destroyAllSessions(userId: string, exceptId?: string) {
  const db = await getDb();
  const all = await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.userId, userId));
  for (const s of all) if (s.id !== exceptId) await db.delete(schema.sessions).where(eq(schema.sessions.id, s.id));
}

export { isStaffRole };
