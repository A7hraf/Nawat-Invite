import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { parseRsvpConfig, type FieldState } from "@/lib/event-content";
import { getDb, schema } from "../db";
import { decryptOrNull, encrypt, ipHash, lookupHash, randomKey, sha256 } from "../crypto";
import { loadAccount } from "../auth/context";
import { passesUsed } from "../repo/events";
import { HttpError } from "../request";

export const RsvpInputSchema = z.object({
  slug: z.string().min(3).max(80),
  guestKey: z.string().regex(/^[A-Za-z0-9]{22}$/).optional(),
  status: z.enum(["ATTENDING", "DECLINED"]),
  name: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  companions: z.number().int().min(0).max(20).optional().default(0),
  note: z.string().trim().max(300).optional().default(""),
  answers: z.record(z.string().max(40), z.string().max(300)).optional().default({}),
  acknowledged: z.array(z.string().max(40)).max(10).optional().default([]),
  locale: z.enum(["ar", "en"]).optional().default("ar"),
});
export type RsvpInput = z.infer<typeof RsvpInputSchema>;

const need = (state: FieldState, value: string, label: string) => {
  if (state === "required" && !value) throw new HttpError(422, `${label} is required`);
};

/** Loads a public, live invitation. Throws 404/410 for anything a guest must not see. */
export async function loadPublicEvent(slug: string) {
  const db = await getDb();
  const ev = await db.query.events.findFirst({ where: eq(schema.events.slug, slug) });
  if (!ev || (ev.status !== "PUBLISHED" && ev.status !== "CLOSED")) throw new HttpError(404, "Invitation not found");
  if (ev.privateAfter && ev.privateAfter < new Date()) throw new HttpError(410, "This celebration has ended");
  const acc = await loadAccount(ev.accountId);
  if (!acc || acc.account.status !== "ACTIVE") throw new HttpError(404, "Invitation not found");
  return { ev, ...acc };
}

export async function findGuest(eventId: string, key: string) {
  if (!/^[A-Za-z0-9]{22}$/.test(key)) return null;
  const db = await getDb();
  return (await db.query.guests.findFirst({ where: and(eq(schema.guests.keyHash, lookupHash(key)), eq(schema.guests.eventId, eventId)) })) ?? null;
}

/** Current reply for a personal link, including the pass key so the guest can see the pass again. */
export async function replyForGuest(guestId: string) {
  const db = await getDb();
  const r = await db.query.rsvps.findFirst({ where: eq(schema.rsvps.guestId, guestId) });
  if (!r) return null;
  const p = await db.query.passes.findFirst({ where: eq(schema.passes.rsvpId, r.id) });
  return {
    status: r.status, name: r.name, companions: r.companions,
    pass: p && !p.revokedAt ? { key: decryptOrNull(p.keyEnc), admitCount: p.admitCount } : null,
  };
}

export async function submitRsvp(input: RsvpInput, ip: string | null) {
  const { ev, ent } = await loadPublicEvent(input.slug);
  if (!ent.rsvp.enabled) throw new HttpError(403, "Replies are not enabled for this invitation");
  if (ev.status === "CLOSED") throw new HttpError(409, "Replies are closed");
  const cfg = parseRsvpConfig(ev.rsvpConfig);
  if (cfg.deadline && new Date(cfg.deadline + "T23:59:59+04:00") < new Date()) throw new HttpError(409, "The reply deadline has passed");

  const guest = input.guestKey ? await findGuest(ev.id, input.guestKey) : null;
  if (input.guestKey && !guest) throw new HttpError(404, "This personal link is not valid");
  if (!guest && !ev.openLinkEnabled) throw new HttpError(403, "This invitation is personal. Please use the link you received.");

  const attending = input.status === "ATTENDING";
  const f = cfg.fields;
  const name = (input.name || guest?.name || "").slice(0, 120);
  if (attending) {
    need(guest ? "off" : f.name === "off" ? "required" : f.name, name, "Name"); // open links always need a name
    need(f.phone, input.phone, "Phone number");
    need(f.note, input.note, "Note");
    for (const n of cfg.notices) if (n.mode === "must" && !input.acknowledged.includes(n.id)) throw new HttpError(422, "Please confirm the notices");
    for (const q of cfg.questions) if (q.required && !input.answers[q.id]?.trim()) throw new HttpError(422, "Please answer all required questions");
  }
  const phone = input.phone && f.phone !== "off" ? normalizePhone(input.phone) : null;
  if (input.phone && f.phone !== "off" && !phone) throw new HttpError(422, "Phone number is not valid");
  const maxComp = f.companions === "off" ? 0 : guest ? guest.allowedCompanions : cfg.openLinkMaxCompanions;
  const companions = attending ? Math.min(input.companions, maxComp) : 0;
  if (attending && input.companions > maxComp) throw new HttpError(422, `You can bring up to ${maxComp} companion(s)`);
  const answers = Object.fromEntries(cfg.questions.map((q) => [q.id, (input.answers[q.id] ?? "").slice(0, 300)]));

  const db = await getDb();
  return db.transaction(async (tx) => {
    let existing = guest ? await tx.query.rsvps.findFirst({ where: eq(schema.rsvps.guestId, guest.id) }) : undefined;
    if (existing && !cfg.allowChange) throw new HttpError(409, "You have already replied");
    if (!guest && attending) {
      await tx.select({ id: schema.clientAccounts.id }).from(schema.clientAccounts).where(eq(schema.clientAccounts.id, ev.accountId)).for("update");
      if ((await passesUsed(ev.accountId, tx)) + 1 > ent.invitations.maxGuestPasses) throw new HttpError(409, "This invitation is full");
    }
    const values = {
      eventId: ev.id, guestId: guest?.id ?? null, status: input.status, name: name || null,
      phoneEnc: phone ? encrypt(phone) : null, companions, note: f.note === "off" ? null : input.note || null,
      answers, acknowledged: input.acknowledged.slice(0, 10), locale: input.locale, ipHash: ipHash(ip), submittedAt: new Date(),
    };
    if (existing) {
      [existing] = await tx.update(schema.rsvps).set(values).where(eq(schema.rsvps.id, existing.id)).returning();
    } else {
      [existing] = await tx.insert(schema.rsvps).values(values).returning();
    }
    const rsvp = existing!;
    let pass: { key: string; admitCount: number } | null = null;
    const current = await tx.query.passes.findFirst({ where: eq(schema.passes.rsvpId, rsvp.id) });
    if (attending && ent.checkin.qrPass) {
      const admitCount = 1 + companions;
      if (current) {
        await tx.update(schema.passes).set({ admitCount, revokedAt: null }).where(eq(schema.passes.id, current.id));
        pass = { key: decryptOrNull(current.keyEnc)!, admitCount };
      } else {
        const key = randomKey(24);
        await tx.insert(schema.passes).values({ eventId: ev.id, rsvpId: rsvp.id, keyHash: sha256(key), keyEnc: encrypt(key), admitCount });
        pass = { key, admitCount };
      }
    } else if (current) {
      await tx.update(schema.passes).set({ revokedAt: new Date() }).where(eq(schema.passes.id, current.id));
    }
    return { status: rsvp.status, name: rsvp.name, companions, pass };
  });
}

export async function recordOpen(guestId: string) {
  const db = await getDb();
  const g = await db.query.guests.findFirst({ where: eq(schema.guests.id, guestId), columns: { firstOpenedAt: true, openCount: true } });
  if (!g) return;
  await db.update(schema.guests).set({ openCount: g.openCount + 1, firstOpenedAt: g.firstOpenedAt ?? new Date() }).where(eq(schema.guests.id, guestId));
}
