/**
 * Integration tests on an in-memory Postgres (PGlite): tenancy, quotas, RSVP rules and entry.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { defaultEntitlements, resolveEntitlements, type Entitlements } from "@/lib/entitlements";
import { getDb, schema } from "@/server/db";
import { createClientAccount } from "@/server/repo/accounts";
import { createEvent, getEvent, saveRsvpConfig, setStatus, type EventRow } from "@/server/repo/events";
import { addGuests, listGuests } from "@/server/repo/guests";
import { submitRsvp } from "@/server/services/rsvp";
import { admit, verifyPass } from "@/server/services/gate";
import { parseRsvpConfig } from "@/lib/event-content";
import { verifyPassword } from "@/server/auth/password";

let ev: EventRow;
let ent: Entitlements;
let accountId: string;
let adminId: string;

beforeAll(async () => {
  const db = await getDb();
  await migrate(db as unknown as PgliteDatabase, { migrationsFolder: "./drizzle" });
  const [plan] = await db.insert(schema.plans).values({ code: "T", nameEn: "T", nameAr: "T", tier: "GILDED", package: "ATELIER", entitlements: { ...defaultEntitlements("GILDED", "ATELIER"), invitations: { maxEvents: 1, maxGuestPasses: 3, openLinkAllowed: true, bilingual: true } } }).returning();
  const [admin] = await db.insert(schema.users).values({ username: "a", displayName: "A", passwordHash: "x", role: "SUPER_ADMIN" }).returning();
  adminId = admin!.id;
  const created = await createClientAccount(null, { displayName: "Test", contactName: "", contactPhone: "", planId: plan!.id, validUntil: "", username: "test.client", notes: "" });
  accountId = created.account.id;
  expect(await verifyPassword(created.user.passwordHash, created.password)).toBe(true);
  ent = resolveEntitlements(plan!.entitlements, {});
  ev = await createEvent(null, accountId, ent, { title: "T", type: "WEDDING", startsAt: new Date(Date.now() + 30 * 86400_000), themeSlug: "bab-al-noor", p1en: "Sara", p2en: "Omar", p1ar: "", p2ar: "" });
  const cfg = parseRsvpConfig(ev.rsvpConfig);
  cfg.notices = [{ id: "children", kind: "children", text: { en: "Adults only", ar: "" }, mode: "must" }];
  await saveRsvpConfig(null, ev, ent, cfg, true);
  await setStatus(null, ev, "PUBLISHED");
  ev = (await getEvent(accountId, ev.id))!;
});

describe("tenancy & plan limits", () => {
  it("never returns another account's event", async () => {
    expect(await getEvent("00000000-0000-0000-0000-000000000000", ev.id)).toBeNull();
  });
  it("blocks a second invitation beyond maxEvents", async () => {
    await expect(createEvent(null, accountId, ent, { title: "2", type: "WEDDING", startsAt: new Date(), themeSlug: "bab-al-noor", p1en: "A", p2en: "B", p1ar: "", p2ar: "" })).rejects.toThrow(/includes 1/);
  });
  it("refuses themes outside the plan", async () => {
    const ivory = { ...ent, themes: { tiers: ["IVORY" as const] }, invitations: { ...ent.invitations, maxEvents: 5 } };
    await expect(createEvent(null, accountId, ivory, { title: "x", type: "WEDDING", startsAt: new Date(), themeSlug: "noir-monogram", p1en: "A", p2en: "B", p1ar: "", p2ar: "" })).rejects.toThrow(/not part of your plan/);
  });
  it("enforces the guest-pass quota atomically", async () => {
    await addGuests(null, ev, ent, [{ name: "Ahmed", phone: "99112233", side: "GROOM", group: "", allowedCompanions: 2 }, { name: "Reem", phone: "", side: "BRIDE", group: "", allowedCompanions: 0 }]);
    await expect(addGuests(null, ev, ent, [{ name: "X", phone: "", side: "OTHER", group: "", allowedCompanions: 0 }, { name: "Y", phone: "", side: "OTHER", group: "", allowedCompanions: 0 }])).rejects.toThrow(/guest passes/);
  });
});

describe("RSVP and entry", () => {
  it("validates notices and companion limits, then issues a pass", async () => {
    const [ahmed] = (await listGuests(ev.id)).filter((g) => g.name === "Ahmed");
    const base = { slug: ev.slug, guestKey: ahmed!.key!, status: "ATTENDING" as const, name: "", phone: "", note: "", answers: {}, locale: "en" as const };
    await expect(submitRsvp({ ...base, companions: 1, acknowledged: [] }, null)).rejects.toThrow(/notices/);
    await expect(submitRsvp({ ...base, companions: 5, acknowledged: ["children"] }, null)).rejects.toThrow(/up to 2/);
    const r = await submitRsvp({ ...base, companions: 2, acknowledged: ["children"] }, null);
    expect(r.pass?.admitCount).toBe(3);

    const v = await verifyPass(ev.id, `https://x/p/${r.pass!.key}`);
    expect(v?.result).toBe("valid");
    await admit(ev.id, v!.passId, 2, adminId);
    await expect(admit(ev.id, v!.passId, 2, adminId)).rejects.toThrow(/Only 1 more/);
    const after = await admit(ev.id, v!.passId, 1, adminId);
    expect(after.result).toBe("complete");
  });
  it("rejects unknown personal links and counts open-link replies against the quota", async () => {
    await expect(submitRsvp({ slug: ev.slug, guestKey: "A".repeat(22), status: "ATTENDING", name: "", phone: "", companions: 0, note: "", answers: {}, acknowledged: ["children"], locale: "en" }, null)).rejects.toThrow(/not valid/);
    const open = { slug: ev.slug, status: "ATTENDING" as const, phone: "", companions: 0, note: "", answers: {}, acknowledged: ["children"], locale: "en" as const };
    await submitRsvp({ ...open, name: "Open guest" }, null); // 3rd of 3 passes
    await expect(submitRsvp({ ...open, name: "One too many" }, null)).rejects.toThrow(/full/);
  });
  it("revokes the pass when a guest changes to declined", async () => {
    const db = await getDb();
    const [reem] = (await listGuests(ev.id)).filter((g) => g.name === "Reem");
    const base = { slug: ev.slug, guestKey: reem!.key!, name: "", phone: "", companions: 0, note: "", answers: {}, acknowledged: ["children"], locale: "en" as const };
    const a = await submitRsvp({ ...base, status: "ATTENDING" }, null);
    await submitRsvp({ ...base, status: "DECLINED" }, null);
    expect((await verifyPass(ev.id, a.pass!.key))?.result).toBe("revoked");
    const rs = await db.select().from(schema.rsvps).where(eq(schema.rsvps.guestId, reem!.id));
    expect(rs).toHaveLength(1);
  });
});
