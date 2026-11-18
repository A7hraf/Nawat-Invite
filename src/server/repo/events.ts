import "server-only";
import { and, count, desc, eq, inArray, isNull, sql, sum } from "drizzle-orm";
import { EntitlementError, tierRank, type Entitlements } from "@/lib/entitlements";
import { defaultContent, defaultRsvpConfig, parseContent, parseRsvpConfig, type EventContent, type RsvpConfig } from "@/lib/event-content";
import { themeBySlug } from "@/themes/catalog";
import { getDb, schema, type Exec } from "../db";
import { randomKey } from "../crypto";
import { audit, type AuditActor } from "../audit";

export type EventRow = typeof schema.events.$inferSelect;

export function slugify(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "invite";
}

export async function themeAllowed(ent: Entitlements, slug: string) {
  const t = themeBySlug(slug);
  if (!t) return false;
  const db = await getDb();
  const row = await db.query.themes.findFirst({ where: eq(schema.themes.slug, slug) });
  if (row && !row.active) return false;
  const tier = row?.tier ?? t.tier;
  return ent.themes.tiers.includes(tier);
}

export async function createEvent(actor: AuditActor, accountId: string, ent: Entitlements, input: {
  title: string; type: EventRow["type"]; startsAt: Date; themeSlug: string; p1en: string; p2en: string; p1ar: string; p2ar: string;
}) {
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(schema.events).where(eq(schema.events.accountId, accountId));
  if (n >= ent.invitations.maxEvents) throw new EntitlementError("invitations.maxEvents", `Your plan includes ${ent.invitations.maxEvents} invitation(s).`);
  if (!(await themeAllowed(ent, input.themeSlug))) throw new EntitlementError("themes.tiers", "This theme is not part of your plan.");
  const content = defaultContent({ p1en: input.p1en, p2en: input.p2en, p1ar: input.p1ar, p2ar: input.p2ar });
  if (!ent.invitations.bilingual) { content.locales = ["ar"]; content.defaultLocale = "ar"; }
  const slug = `${slugify(`${input.p1en} ${input.p2en}`)}-${randomKey(5)}`;
  const [ev] = await db.insert(schema.events).values({
    accountId, title: input.title, type: input.type, startsAt: input.startsAt,
    endsAt: new Date(input.startsAt.getTime() + 5 * 3600_000), themeSlug: input.themeSlug, slug,
    content, rsvpConfig: defaultRsvpConfig(),
    privateAfter: new Date(input.startsAt.getTime() + 30 * 86400_000),
  }).returning();
  await audit(actor, "event.create", "event", ev!.id, { slug });
  return ev!;
}

/** Tenant-scoped fetch: returns null when the event belongs to another account. */
export async function getEvent(accountId: string, eventId: string) {
  const db = await getDb();
  const ev = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.accountId, accountId)) });
  return ev ?? null;
}

export async function listEvents(accountId: string) {
  const db = await getDb();
  return db.select().from(schema.events).where(eq(schema.events.accountId, accountId)).orderBy(desc(schema.events.startsAt));
}

/** Clamp a saved configuration to what the plan allows; the server is the source of truth. */
export function enforceContent(content: EventContent, ent: Entitlements): EventContent {
  const c = structuredClone(content);
  if (!ent.invitations.bilingual) { c.locales = [c.defaultLocale]; }
  if (!c.locales.includes(c.defaultLocale)) c.defaultLocale = c.locales[0]!;
  if (!ent.music.enabled) c.music.trackId = null;
  c.gallery = c.gallery.slice(0, ent.media.photos);
  if (ent.media.photos === 0) { c.sections.gallery = false; c.closingPhoto = null; }
  return c;
}

export function enforceRsvp(cfg: RsvpConfig, ent: Entitlements): RsvpConfig {
  const c = structuredClone(cfg);
  const r = ent.rsvp;
  if (!r.fieldName) c.fields.name = "off";
  if (!r.fieldPhone) c.fields.phone = "off";
  if (!r.fieldCompanions) c.fields.companions = "off";
  if (!r.fieldNote) c.fields.note = "off";
  if (!r.notices) c.notices = c.notices.map((n) => ({ ...n, mode: "off" as const }));
  c.questions = c.questions.slice(0, r.customQuestions);
  return c;
}

export async function saveContent(actor: AuditActor, ev: EventRow, ent: Entitlements, content: EventContent, meta: { startsAt?: Date; title?: string; themeSlug?: string; type?: EventRow["type"] }) {
  const db = await getDb();
  if (meta.themeSlug && meta.themeSlug !== ev.themeSlug && !(await themeAllowed(ent, meta.themeSlug))) {
    throw new EntitlementError("themes.tiers", "This theme is not part of your plan.");
  }
  const clean = enforceContent(parseContent(content), ent);
  await db.update(schema.events).set({
    content: clean,
    ...(meta.title ? { title: meta.title } : {}),
    ...(meta.type ? { type: meta.type } : {}),
    ...(meta.themeSlug ? { themeSlug: meta.themeSlug } : {}),
    ...(meta.startsAt ? { startsAt: meta.startsAt, endsAt: new Date(meta.startsAt.getTime() + 5 * 3600_000), privateAfter: new Date(meta.startsAt.getTime() + 30 * 86400_000) } : {}),
  }).where(eq(schema.events.id, ev.id));
  await audit(actor, "event.update_content", "event", ev.id);
}

export async function saveRsvpConfig(actor: AuditActor, ev: EventRow, ent: Entitlements, cfg: RsvpConfig, openLink: boolean) {
  const db = await getDb();
  const clean = enforceRsvp(parseRsvpConfig(cfg), ent);
  await db.update(schema.events).set({ rsvpConfig: clean, openLinkEnabled: openLink && ent.invitations.openLinkAllowed }).where(eq(schema.events.id, ev.id));
  await audit(actor, "event.update_rsvp", "event", ev.id);
}

export async function setStatus(actor: AuditActor, ev: EventRow, status: EventRow["status"]) {
  const db = await getDb();
  await db.update(schema.events).set({ status, ...(status === "PUBLISHED" && !ev.publishedAt ? { publishedAt: new Date() } : {}) }).where(eq(schema.events.id, ev.id));
  await audit(actor, `event.${status.toLowerCase()}`, "event", ev.id);
}

/** Guest passes used across the whole account: invited guests + open-link replies. */
export async function passesUsed(accountId: string, exec?: Exec) {
  const db = exec ?? (await getDb());
  const evIds = (await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.accountId, accountId))).map((e) => e.id);
  if (!evIds.length) return 0;
  const [g] = await db.select({ n: count() }).from(schema.guests).where(inArray(schema.guests.eventId, evIds));
  const [o] = await db.select({ n: count() }).from(schema.rsvps).where(and(inArray(schema.rsvps.eventId, evIds), isNull(schema.rsvps.guestId), eq(schema.rsvps.status, "ATTENDING")));
  return (g?.n ?? 0) + (o?.n ?? 0);
}

export async function eventStats(eventId: string) {
  const db = await getDb();
  const [invited] = await db.select({ n: count() }).from(schema.guests).where(eq(schema.guests.eventId, eventId));
  const [opened] = await db.select({ n: count() }).from(schema.guests).where(and(eq(schema.guests.eventId, eventId), sql`${schema.guests.firstOpenedAt} is not null`));
  const by = await db.select({ status: schema.rsvps.status, n: count(), comp: sum(schema.rsvps.companions) }).from(schema.rsvps)
    .where(eq(schema.rsvps.eventId, eventId)).groupBy(schema.rsvps.status);
  const att = by.find((b) => b.status === "ATTENDING");
  const dec = by.find((b) => b.status === "DECLINED");
  const [arr] = await db.select({ n: sum(schema.passes.admittedTotal) }).from(schema.passes).where(eq(schema.passes.eventId, eventId));
  const attending = att?.n ?? 0;
  const companions = Number(att?.comp ?? 0);
  return {
    invited: invited?.n ?? 0, opened: opened?.n ?? 0, attending, declined: dec?.n ?? 0,
    companions, expected: attending + companions, arrived: Number(arr?.n ?? 0),
  };
}

export const tierOk = (ent: Entitlements, minTier: "IVORY" | "GILDED" | "ROYAL_SEAL") =>
  ent.themes.tiers.some((t) => tierRank(t) >= tierRank(minTier));
