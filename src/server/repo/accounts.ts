import "server-only";
import { UserError } from "@/lib/errors";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { EntitlementsSchema, diffOverrides, resolveEntitlements, type Entitlements } from "@/lib/entitlements";
import { getDb, schema } from "../db";
import { encrypt, oneTimePassword } from "../crypto";
import { hashPassword } from "../auth/password";
import { destroyAllSessions } from "../auth/session";
import { audit, type AuditActor } from "../audit";

export const UsernameSchema = z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore");

export const NewClientSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  contactName: z.string().trim().max(80).optional().default(""),
  contactPhone: z.string().trim().max(20).optional().default(""),
  planId: z.string().min(1),
  validUntil: z.string().optional().default(""),
  username: UsernameSchema,
  notes: z.string().max(2000).optional().default(""),
});

export async function usernameTaken(username: string) {
  const db = await getDb();
  const r = await db.select({ id: schema.users.id }).from(schema.users).where(sql`lower(${schema.users.username}) = ${username.toLowerCase()}`).limit(1);
  return r.length > 0;
}

/** Creates the tenant and its login. Returns the one-time password (never stored in clear). */
export async function createClientAccount(actor: AuditActor, input: z.infer<typeof NewClientSchema>) {
  const db = await getDb();
  if (await usernameTaken(input.username)) throw new UserError("This username is already taken");
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, input.planId) });
  if (!plan) throw new UserError("Unknown plan");
  const password = oneTimePassword();
  const passwordHash = await hashPassword(password);
  const result = await db.transaction(async (tx) => {
    const [account] = await tx.insert(schema.clientAccounts).values({
      displayName: input.displayName,
      contactName: input.contactName || null,
      contactPhoneEnc: input.contactPhone ? encrypt(input.contactPhone) : null,
      planId: plan.id,
      validUntil: input.validUntil ? new Date(input.validUntil + "T23:59:59+04:00") : null,
      internalNotes: input.notes || null,
      createdById: actor?.id ?? null,
    }).returning();
    if (!account) throw new UserError("Could not create account");
    const [user] = await tx.insert(schema.users).values({
      username: input.username, displayName: input.displayName, passwordHash, role: "CLIENT", accountId: account.id, mustChangePassword: true,
    }).returning();
    return { account, user: user! };
  });
  await audit(actor, "account.create", "client_account", result.account.id, { plan: plan.code, username: input.username });
  return { ...result, password };
}

export async function resetUserPassword(actor: AuditActor, userId: string) {
  const db = await getDb();
  const password = oneTimePassword();
  await db.update(schema.users).set({ passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null })
    .where(eq(schema.users.id, userId));
  await destroyAllSessions(userId);
  await audit(actor, "user.password_reset", "user", userId);
  return password;
}

export async function updateAccount(actor: AuditActor, accountId: string, patch: { planId?: string; status?: "ACTIVE" | "SUSPENDED"; validUntil?: Date | null; displayName?: string; notes?: string | null }) {
  const db = await getDb();
  await db.update(schema.clientAccounts).set({
    ...(patch.planId ? { planId: patch.planId } : {}),
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.validUntil !== undefined ? { validUntil: patch.validUntil } : {}),
    ...(patch.displayName ? { displayName: patch.displayName } : {}),
    ...(patch.notes !== undefined ? { internalNotes: patch.notes } : {}),
  }).where(eq(schema.clientAccounts.id, accountId));
  if (patch.status === "SUSPENDED") {
    const us = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.accountId, accountId));
    for (const u of us) await destroyAllSessions(u.id);
  }
  await audit(actor, "account.update", "client_account", accountId, patch as Record<string, unknown>);
}

/** Stores only the values that differ from the plan. */
export async function setOverrides(actor: AuditActor, accountId: string, wanted: Entitlements) {
  const db = await getDb();
  const acc = await db.query.clientAccounts.findFirst({ where: eq(schema.clientAccounts.id, accountId) });
  if (!acc) throw new UserError("Unknown account");
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.id, acc.planId) });
  const valid = EntitlementsSchema.parse(wanted);
  const overrides = diffOverrides(plan!.entitlements, valid);
  await db.update(schema.clientAccounts).set({ entitlementOverrides: overrides }).where(eq(schema.clientAccounts.id, accountId));
  await audit(actor, "entitlement.update", "client_account", accountId, { overrides });
  return resolveEntitlements(plan!.entitlements, overrides);
}

export async function listAccounts(q?: string) {
  const db = await getDb();
  const where = q ? or(ilike(schema.clientAccounts.displayName, `%${q}%`), ilike(schema.users.username, `%${q}%`)) : undefined;
  const rows = await db.select({
    account: schema.clientAccounts, plan: schema.plans, username: schema.users.username, lastLoginAt: schema.users.lastLoginAt,
  }).from(schema.clientAccounts)
    .innerJoin(schema.plans, eq(schema.clientAccounts.planId, schema.plans.id))
    .leftJoin(schema.users, and(eq(schema.users.accountId, schema.clientAccounts.id), eq(schema.users.role, "CLIENT")))
    .where(where).orderBy(desc(schema.clientAccounts.createdAt)).limit(300);
  const ids = rows.map((r) => r.account.id);
  const evCounts = ids.length ? await db.select({ accountId: schema.events.accountId, n: count() }).from(schema.events)
    .where(inArray(schema.events.accountId, ids)).groupBy(schema.events.accountId) : [];
  const map = new Map(evCounts.map((e) => [e.accountId, e.n]));
  return rows.map((r) => ({ ...r, events: map.get(r.account.id) ?? 0 }));
}
