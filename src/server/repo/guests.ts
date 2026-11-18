import "server-only";
import { UserError } from "@/lib/errors";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { EntitlementError, type Entitlements } from "@/lib/entitlements";
import { normalizePhone } from "@/lib/phone";
import { getDb, schema } from "../db";
import { decryptOrNull, encrypt, lookupHash, randomKey } from "../crypto";
import { env } from "../env";
import { audit, type AuditActor } from "../audit";
import { passesUsed, type EventRow } from "./events";

export const GuestInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  side: z.enum(["BRIDE", "GROOM", "BOTH", "OTHER"]).default("OTHER"),
  group: z.string().trim().max(80).optional().default(""),
  allowedCompanions: z.coerce.number().int().min(0).max(20).default(0),
});
export type GuestInput = z.infer<typeof GuestInputSchema>;

/** Adds guests atomically. The account row is locked so two imports cannot exceed the quota together. */
export async function addGuests(actor: AuditActor, ev: EventRow, ent: Entitlements, inputs: GuestInput[]) {
  const db = await getDb();
  const rows = inputs.map((g) => {
    const phone = g.phone ? normalizePhone(g.phone) : null;
    if (g.phone && !phone) throw new UserError(`Phone number for “${g.name}” is not valid`);
    const key = randomKey(22);
    return {
      eventId: ev.id, name: g.name, side: g.side, group: g.group || null, allowedCompanions: g.allowedCompanions,
      phoneEnc: phone ? encrypt(phone) : null, keyHash: lookupHash(key), keyEnc: encrypt(key),
    };
  });
  await db.transaction(async (tx) => {
    await tx.select({ id: schema.clientAccounts.id }).from(schema.clientAccounts).where(eq(schema.clientAccounts.id, ev.accountId)).for("update");
    const used = await passesUsed(ev.accountId, tx);
    if (used + rows.length > ent.invitations.maxGuestPasses) {
      throw new EntitlementError("invitations.maxGuestPasses", `Your plan includes ${ent.invitations.maxGuestPasses} guest passes and ${used} are used. Contact Nawat to add more.`);
    }
    for (let i = 0; i < rows.length; i += 200) await tx.insert(schema.guests).values(rows.slice(i, i + 200));
  });
  await audit(actor, "guest.add", "event", ev.id, { count: rows.length });
  return rows.length;
}

export async function listGuests(eventId: string) {
  const db = await getDb();
  const rows = await db.select({ guest: schema.guests, rsvp: schema.rsvps })
    .from(schema.guests).leftJoin(schema.rsvps, eq(schema.rsvps.guestId, schema.guests.id))
    .where(eq(schema.guests.eventId, eventId)).orderBy(asc(schema.guests.createdAt));
  return rows.map(({ guest, rsvp }) => ({
    id: guest.id, name: guest.name, side: guest.side, group: guest.group, allowedCompanions: guest.allowedCompanions,
    phone: decryptOrNull(guest.phoneEnc), linkSentAt: guest.linkSentAt, firstOpenedAt: guest.firstOpenedAt, openCount: guest.openCount,
    key: decryptOrNull(guest.keyEnc),
    rsvp: rsvp ? { status: rsvp.status, companions: rsvp.companions, note: rsvp.note } : null,
  }));
}

export type GuestListItem = Awaited<ReturnType<typeof listGuests>>[number];

export const guestStatus = (g: GuestListItem) =>
  g.rsvp ? (g.rsvp.status === "ATTENDING" ? "Attending" : "Declined") : g.firstOpenedAt ? "Opened" : g.linkSentAt ? "Sent" : "Not sent";

export function inviteUrl(slug: string, key?: string | null) {
  return `${env().APP_URL.replace(/\/$/, "")}/i/${slug}${key ? `/${key}` : ""}`;
}

export async function deleteGuest(actor: AuditActor, ev: EventRow, guestId: string) {
  const db = await getDb();
  await db.delete(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, ev.id)));
  await audit(actor, "guest.delete", "event", ev.id, { guestId });
}

export async function markSent(ev: EventRow, guestId: string) {
  const db = await getDb();
  await db.update(schema.guests).set({ linkSentAt: new Date() }).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, ev.id)));
}
