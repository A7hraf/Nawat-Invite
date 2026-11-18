"use server";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/errors";
import { getDb, schema } from "@/server/db";
import { decrypt, encrypt, ipHash, sha256 } from "@/server/crypto";
import { clientIp } from "@/server/request";
import { rateLimit } from "@/server/ratelimit";
import { audit } from "@/server/audit";
import { dummyVerify, hashPassword, NewPasswordSchema, verifyPassword } from "@/server/auth/password";
import { createSession, destroyAllSessions, destroySession, getSession, isStaffRole, updateSession } from "@/server/auth/session";
import { checkTotp, newRecoveryCodes } from "@/server/auth/totp";
import { str } from "@/server/action";

const GENERIC = "The username or password is not correct.";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const username = str(fd, "username").trim().toLowerCase().slice(0, 60);
  const password = str(fd, "password").slice(0, 200);
  if (!username || !password) return { error: "Enter your username and password." };
  const ipKey = ipHash(await clientIp()) ?? "unknown";
  const allowed = (await rateLimit(`login:ip:${ipKey}`, 30, 900)) && (await rateLimit(`login:user:${username}`, 10, 900));
  if (!allowed) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  const db = await getDb();
  const user = await db.query.users.findFirst({ where: sql`lower(${schema.users.username}) = ${username}` });
  if (!user) { await dummyVerify(password); return { error: GENERIC }; }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: "This account is locked for a few minutes after several failed attempts." };

  if (!(await verifyPassword(user.passwordHash, password))) {
    const failed = user.failedLogins + 1;
    await db.update(schema.users).set(failed >= 5 ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) } : { failedLogins: failed }).where(eq(schema.users.id, user.id));
    await audit({ id: user.id, name: user.displayName }, failed >= 5 ? "login.locked" : "login.failed", "user", user.id);
    return { error: GENERIC };
  }
  if (user.status !== "ACTIVE" || (user.expiresAt && user.expiresAt < new Date())) return { error: "This account is not active. Please contact Nawat." };

  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  const needsMfa = isStaffRole(user.role) || user.totpEnabled;
  await createSession(user, !needsMfa);
  await audit({ id: user.id, name: user.displayName }, "login.success", "user", user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function verifyTwoFactorAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const { user, session } = s;
  if (!user.totpEnabled || !user.totpSecretEnc) redirect("/two-factor/setup");
  if (!(await rateLimit(`mfa:${user.id}`, 8, 600))) return { error: "Too many attempts. Please wait 10 minutes." };
  const code = str(fd, "code").replace(/\s/g, "").toLowerCase();
  const db = await getDb();
  const counter = checkTotp(decrypt(user.totpSecretEnc), code, user.totpLastCounter);
  if (counter !== null) {
    await db.update(schema.users).set({ totpLastCounter: counter }).where(eq(schema.users.id, user.id));
  } else {
    const h = sha256(code);
    if (!user.recoveryCodeHashes.includes(h)) {
      await audit({ id: user.id, name: user.displayName }, "mfa.failed", "user", user.id);
      return { error: "That code is not correct." };
    }
    await db.update(schema.users).set({ recoveryCodeHashes: user.recoveryCodeHashes.filter((x) => x !== h) }).where(eq(schema.users.id, user.id));
    await audit({ id: user.id, name: user.displayName }, "mfa.recovery_code_used", "user", user.id);
  }
  await updateSession(session.id, { mfaPassed: true });
  redirect(user.mustChangePassword ? "/change-password" : "/");
}

export async function confirmTwoFactorSetupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const { user, session } = s;
  let payload: { u: string; s: string; t: number };
  try { payload = JSON.parse(decrypt(str(fd, "token"))); } catch { return { error: "This setup expired. Reload the page." }; }
  if (payload.u !== user.id || Date.now() - payload.t > 10 * 60_000) return { error: "This setup expired. Reload the page." };
  const counter = checkTotp(payload.s, str(fd, "code").replace(/\s/g, ""), null);
  if (counter === null) return { error: "That code is not correct. Check the time on your phone and try again." };
  const codes = newRecoveryCodes();
  const db = await getDb();
  await db.update(schema.users).set({ totpSecretEnc: encrypt(payload.s), totpEnabled: true, totpLastCounter: counter, recoveryCodeHashes: codes.hashes }).where(eq(schema.users.id, user.id));
  await updateSession(session.id, { mfaPassed: true });
  await audit({ id: user.id, name: user.displayName }, "mfa.enabled", "user", user.id);
  return { ok: "2-step sign-in is on.", data: { codes: codes.plain } };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const { user, session } = s;
  if (!(await rateLimit(`pwchange:${user.id}`, 10, 900))) return { error: "Too many attempts. Please wait a few minutes." };
  const current = str(fd, "current"), next = str(fd, "next"), confirm = str(fd, "confirm");
  if (!(await verifyPassword(user.passwordHash, current))) return { error: "Your current password is not correct." };
  const parsed = NewPasswordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." };
  if (next !== confirm) return { error: "The two new passwords do not match." };
  if (next === current) return { error: "Choose a password you have not used here before." };
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(schema.users.id, user.id));
  await destroyAllSessions(user.id, session.id);
  await audit({ id: user.id, name: user.displayName }, "user.password_changed", "user", user.id);
  redirect("/");
}
