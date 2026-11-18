import "server-only";
import { UserError } from "@/lib/errors";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { resolveEntitlements, type Entitlements } from "@/lib/entitlements";
import { getDb, schema } from "../db";
import { getSession, isStaffRole, type Session, type User } from "./session";

export type Account = typeof schema.clientAccounts.$inferSelect;
export type Plan = typeof schema.plans.$inferSelect;

export type UserCtx = { user: User; session: Session; isStaff: boolean };
export type StudioCtx = UserCtx & {
  account: Account;
  plan: Plan;
  ent: Entitlements;
  /** Staff member working inside a client's studio ("Manage as client"). */
  actingAs: boolean;
  /** Concierge clients see numbers and reports but cannot change anything. */
  readOnly: boolean;
};

export const actorOf = (c: UserCtx) => ({
  id: c.user.id, name: c.user.displayName,
  actingAsAccountId: c.session.actingAsAccountId,
});

/**
 * Any signed-in user who completed the security steps.
 * Order: session → second factor → forced password change.
 */
export const requireUser = cache(async (opts: { pendingMfaOk?: boolean; mustChangeOk?: boolean } = {}): Promise<UserCtx> => {
  const s = await getSession();
  if (!s) redirect("/login");
  const { user, session } = s;
  const isStaff = isStaffRole(user.role);
  const needsMfa = isStaff || user.totpEnabled;
  if (needsMfa && !session.mfaPassed && !opts.pendingMfaOk) redirect(user.totpEnabled ? "/two-factor" : "/two-factor/setup");
  if (user.mustChangePassword && !opts.mustChangeOk && !(needsMfa && !session.mfaPassed)) redirect("/change-password");
  return { user, session, isStaff };
});

export async function requireStaff(): Promise<UserCtx> {
  const c = await requireUser();
  if (!c.isStaff) redirect("/");
  return c;
}

export async function requireSuperAdmin(): Promise<UserCtx> {
  const c = await requireStaff();
  if (c.user.role !== "SUPER_ADMIN") redirect("/admin");
  return c;
}

export async function loadAccount(accountId: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.clientAccounts)
    .innerJoin(schema.plans, eq(schema.clientAccounts.planId, schema.plans.id))
    .where(eq(schema.clientAccounts.id, accountId)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return { account: r.client_accounts, plan: r.plans, ent: resolveEntitlements(r.plans.entitlements, r.client_accounts.entitlementOverrides) };
}

/** The client studio: a client in their own account, or staff acting as that client. */
export const requireStudio = cache(async (): Promise<StudioCtx> => {
  const c = await requireUser();
  let accountId: string | null = null;
  let actingAs = false;
  if (c.isStaff) {
    const until = c.session.actingUntil;
    if (!c.session.actingAsAccountId || !until || until < new Date()) redirect("/admin");
    accountId = c.session.actingAsAccountId;
    actingAs = true;
  } else if (c.user.role === "CLIENT" && c.user.accountId) {
    accountId = c.user.accountId;
  } else {
    redirect("/gate");
  }
  const loaded = await loadAccount(accountId);
  if (!loaded) redirect("/login");
  if (!actingAs) {
    const expired = loaded.account.validUntil && loaded.account.validUntil < new Date();
    if (loaded.account.status !== "ACTIVE" || expired || loaded.ent.studio.access === "NONE") redirect("/account-unavailable");
  }
  return { ...c, ...loaded, actingAs, readOnly: !actingAs && loaded.ent.studio.access === "READ_ONLY" };
});

/** Throws for read-only studios: every studio mutation must call this first. */
export function assertWritable(c: StudioCtx) {
  if (c.readOnly) throw new UserError("Your package lets Nawat manage this invitation for you. Contact us for changes.");
}

/**
 * Who may operate the entrance of an event: staff, the owning client, or an assigned,
 * unexpired gatekeeper.
 */
export async function canOperateGate(c: UserCtx, eventId: string): Promise<boolean> {
  const db = await getDb();
  if (c.isStaff) return true;
  const ev = await db.query.events.findFirst({ where: eq(schema.events.id, eventId), columns: { accountId: true } });
  if (!ev) return false;
  if (c.user.role === "CLIENT") return c.user.accountId === ev.accountId;
  if (c.user.role === "GATEKEEPER") {
    const link = await db.select().from(schema.eventGatekeepers)
      .where(and(eq(schema.eventGatekeepers.eventId, eventId), eq(schema.eventGatekeepers.userId, c.user.id))).limit(1);
    return link.length > 0 && (!c.user.expiresAt || c.user.expiresAt > new Date());
  }
  return false;
}

