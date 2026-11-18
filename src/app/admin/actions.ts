"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EntitlementsSchema, TIERS } from "@/lib/entitlements";
import { UserError, type ActionState } from "@/lib/errors";
import { actorOf, requireStaff, requireSuperAdmin } from "@/server/auth/context";
import { updateSession } from "@/server/auth/session";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { run, str } from "@/server/action";
import { parseEntitlementForm } from "@/server/entitlement-form";
import { createClientAccount, NewClientSchema, resetUserPassword, setOverrides, updateAccount, usernameTaken, UsernameSchema } from "@/server/repo/accounts";
import { saveUpload } from "@/server/storage";
import { BrandSettingsSchema, saveBrandSettings } from "@/server/settings";
import { hashPassword } from "@/server/auth/password";
import { oneTimePassword } from "@/server/crypto";
import { themeBySlug } from "@/themes/catalog";

const Id = z.string().uuid();

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireStaff();
    const input = NewClientSchema.parse(Object.fromEntries(fd));
    const { account, password } = await createClientAccount(actorOf(c), input);
    revalidatePath("/admin/clients");
    return { ok: "Client account created", data: { password, username: input.username, accountId: account.id } };
  });
}

export async function updateAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireStaff();
    const id = Id.parse(str(fd, "accountId"));
    const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(str(fd, "status"));
    const valid = str(fd, "validUntil");
    await updateAccount(actorOf(c), id, {
      planId: Id.parse(str(fd, "planId")), status, displayName: z.string().trim().min(2).max(80).parse(str(fd, "displayName")),
      validUntil: valid ? new Date(valid + "T23:59:59+04:00") : null, notes: str(fd, "notes").slice(0, 2000) || null,
    });
    revalidatePath(`/admin/clients/${id}`);
    return { ok: "Account saved" };
  });
}

export async function saveOverridesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireStaff();
    const id = Id.parse(str(fd, "accountId"));
    await setOverrides(actorOf(c), id, parseEntitlementForm(fd));
    revalidatePath(`/admin/clients/${id}`);
    return { ok: "Features saved. They apply on the client’s next action." };
  });
}

export async function resetOverridesAction(fd: FormData) {
  const c = await requireStaff();
  const id = Id.parse(str(fd, "accountId"));
  const db = await getDb();
  await db.update(schema.clientAccounts).set({ entitlementOverrides: {} }).where(eq(schema.clientAccounts.id, id));
  await audit(actorOf(c), "entitlement.reset", "client_account", id);
  revalidatePath(`/admin/clients/${id}`);
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireStaff();
    const userId = Id.parse(str(fd, "userId"));
    const db = await getDb();
    const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
    if (!u || u.role === "SUPER_ADMIN" || (u.role === "STAFF" && c.user.role !== "SUPER_ADMIN")) throw new UserError("You cannot reset this account");
    const password = await resetUserPassword(actorOf(c), userId);
    return { ok: "New one-time password issued. Share it securely.", data: { password } };
  });
}

export async function manageAsAction(fd: FormData) {
  const c = await requireStaff();
  const id = Id.parse(str(fd, "accountId"));
  await updateSession(c.session.id, { actingAsAccountId: id, actingUntil: new Date(Date.now() + 60 * 60_000) });
  await audit(actorOf(c), "impersonation.start", "client_account", id);
  redirect("/studio");
}

export async function stopManagingAction() {
  const c = await requireStaff();
  const id = c.session.actingAsAccountId;
  await updateSession(c.session.id, { actingAsAccountId: null, actingUntil: null });
  await audit(actorOf(c), "impersonation.end", "client_account", id);
  redirect(id ? `/admin/clients/${id}` : "/admin");
}

export async function savePlanAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireSuperAdmin();
    const id = Id.parse(str(fd, "planId"));
    const ent = EntitlementsSchema.parse(parseEntitlementForm(fd));
    const db = await getDb();
    await db.update(schema.plans).set({
      entitlements: ent, nameEn: z.string().min(2).max(60).parse(str(fd, "nameEn")), nameAr: z.string().min(2).max(60).parse(str(fd, "nameAr")),
      priceOmr: str(fd, "priceOmr").slice(0, 12) || null, active: fd.get("active") === "on",
    }).where(eq(schema.plans.id, id));
    await audit(actorOf(c), "plan.update", "plan", id);
    revalidatePath("/admin/plans");
    return { ok: "Plan saved. Every client on this plan gets the new defaults (their overrides stay)." };
  });
}

export async function saveThemeAction(fd: FormData) {
  const c = await requireStaff();
  const slug = str(fd, "slug");
  if (!themeBySlug(slug)) return;
  const tier = z.enum(TIERS).parse(str(fd, "tier"));
  const db = await getDb();
  await db.update(schema.themes).set({ tier, active: fd.get("active") === "on" }).where(eq(schema.themes.slug, slug));
  await audit(actorOf(c), "theme.update", "theme", slug, { tier });
  revalidatePath("/admin/themes");
}

export async function uploadMusicAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireStaff();
    const meta = z.object({
      titleEn: z.string().trim().min(2).max(80), titleAr: z.string().trim().min(2).max(80),
      mood: z.string().trim().max(80).default(""), licence: z.string().trim().min(3, "Licence reference is required").max(200),
      minTier: z.enum(TIERS),
    }).parse({ titleEn: str(fd, "titleEn"), titleAr: str(fd, "titleAr"), mood: str(fd, "mood"), licence: str(fd, "licence"), minTier: str(fd, "minTier") });
    const asset = await saveUpload(fd.get("file") as File, "AUDIO", null);
    const db = await getDb();
    await db.insert(schema.musicTracks).values({ ...meta, assetId: asset.id });
    await audit(actorOf(c), "music.upload", "music_track", asset.id, { title: meta.titleEn });
    revalidatePath("/admin/music");
    return { ok: "Track added to the library" };
  });
}

export async function toggleTrackAction(fd: FormData) {
  const c = await requireStaff();
  const id = Id.parse(str(fd, "trackId"));
  const db = await getDb();
  await db.update(schema.musicTracks).set({ active: sql`not ${schema.musicTracks.active}` }).where(eq(schema.musicTracks.id, id));
  await audit(actorOf(c), "music.toggle", "music_track", id);
  revalidatePath("/admin/music");
}

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireSuperAdmin();
    const value = BrandSettingsSchema.parse({
      footer: { website: str(fd, "website"), instagram: str(fd, "instagram"), phone: str(fd, "phone") },
      tierNames: Object.fromEntries(TIERS.map((t) => [t, { en: str(fd, `${t}.en`), ar: str(fd, `${t}.ar`) }])),
    });
    await saveBrandSettings(value);
    await audit(actorOf(c), "settings.update", "settings", "brand");
    revalidatePath("/admin/settings");
    return { ok: "Settings saved. New invitations and reports use them right away." };
  });
}

export async function createStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const c = await requireSuperAdmin();
    const username = UsernameSchema.parse(str(fd, "username"));
    const displayName = z.string().trim().min(2).max(80).parse(str(fd, "displayName"));
    if (await usernameTaken(username)) throw new UserError("This username is already taken");
    const password = oneTimePassword();
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ username, displayName, role: "STAFF", passwordHash: await hashPassword(password), mustChangePassword: true }).returning();
    await audit(actorOf(c), "staff.create", "user", u!.id, { username });
    revalidatePath("/admin/team");
    return { ok: "Staff account created", data: { password, username } };
  });
}

export async function setUserStatusAction(fd: FormData) {
  const c = await requireSuperAdmin();
  const userId = Id.parse(str(fd, "userId"));
  if (userId === c.user.id) return;
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(str(fd, "status"));
  const db = await getDb();
  await db.update(schema.users).set({ status }).where(and(eq(schema.users.id, userId), eq(schema.users.role, "STAFF")));
  await audit(actorOf(c), "staff.status", "user", userId, { status });
  revalidatePath("/admin/team");
}
