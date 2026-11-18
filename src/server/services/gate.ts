import "server-only";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { getDb, schema } from "../db";
import { sha256 } from "../crypto";
import { HttpError } from "../request";

export type PassView = {
  passId: string; name: string; side: string | null; group: string | null;
  admitCount: number; admittedTotal: number; lastScanAt: string | null;
  result: "valid" | "complete" | "revoked";
};

/** Accepts the full QR content (https://…/p/<key>) or the bare key. */
export function extractPassKey(scanned: string): string | null {
  const s = scanned.trim();
  const m = s.match(/\/p\/([A-Za-z0-9]{24})(?:[/?#].*)?$/) ?? s.match(/^([A-Za-z0-9]{24})$/);
  return m?.[1] ?? null;
}

async function view(passId: string): Promise<PassView | null> {
  const db = await getDb();
  const rows = await db.select({ pass: schema.passes, rsvp: schema.rsvps, guest: schema.guests })
    .from(schema.passes).innerJoin(schema.rsvps, eq(schema.passes.rsvpId, schema.rsvps.id))
    .leftJoin(schema.guests, eq(schema.rsvps.guestId, schema.guests.id))
    .where(eq(schema.passes.id, passId)).limit(1);
  const r = rows[0];
  if (!r) return null;
  const last = await db.query.checkIns.findFirst({ where: eq(schema.checkIns.passId, passId), orderBy: desc(schema.checkIns.scannedAt) });
  return {
    passId: r.pass.id, name: r.guest?.name ?? r.rsvp.name ?? "Guest", side: r.guest?.side ?? null, group: r.guest?.group ?? null,
    admitCount: r.pass.admitCount, admittedTotal: r.pass.admittedTotal, lastScanAt: last?.scannedAt.toISOString() ?? null,
    result: r.pass.revokedAt ? "revoked" : r.pass.admittedTotal >= r.pass.admitCount ? "complete" : "valid",
  };
}

export async function verifyPass(eventId: string, scanned: string): Promise<PassView | null> {
  const key = extractPassKey(scanned);
  if (!key) return null;
  const db = await getDb();
  const p = await db.query.passes.findFirst({ where: and(eq(schema.passes.keyHash, sha256(key)), eq(schema.passes.eventId, eventId)) });
  return p ? view(p.id) : null;
}

/** Admits people on a pass. Row lock makes two simultaneous scans of one pass safe. */
export async function admit(eventId: string, passId: string, count: number, userId: string): Promise<PassView> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(schema.passes).where(and(eq(schema.passes.id, passId), eq(schema.passes.eventId, eventId))).for("update");
    if (!p) throw new HttpError(404, "Pass not found");
    if (p.revokedAt) throw new HttpError(409, "This pass was cancelled");
    const left = p.admitCount - p.admittedTotal;
    if (count < 1 || count > left) throw new HttpError(409, left === 0 ? "Everyone on this pass is already inside" : `Only ${left} more can enter on this pass`);
    await tx.update(schema.passes).set({ admittedTotal: p.admittedTotal + count }).where(eq(schema.passes.id, p.id));
    await tx.insert(schema.checkIns).values({ passId: p.id, eventId, userId, admitted: count });
  });
  return (await view(passId))!;
}

export async function searchAttendees(eventId: string, q: string) {
  if (q.trim().length < 2) return [];
  const db = await getDb();
  const like = `%${q.trim().replace(/[%_]/g, "")}%`;
  const rows = await db.select({ passId: schema.passes.id })
    .from(schema.passes).innerJoin(schema.rsvps, eq(schema.passes.rsvpId, schema.rsvps.id))
    .leftJoin(schema.guests, eq(schema.rsvps.guestId, schema.guests.id))
    .where(and(eq(schema.passes.eventId, eventId), isNull(schema.passes.revokedAt), or(ilike(schema.guests.name, like), ilike(schema.rsvps.name, like))))
    .limit(10);
  const out: PassView[] = [];
  for (const r of rows) { const v = await view(r.passId); if (v) out.push(v); }
  return out;
}
