import "server-only";
import { eq, isNull, and } from "drizzle-orm";
import { getDb, schema } from "../db";
import { decryptOrNull } from "../crypto";
import { eventStats, type EventRow } from "../repo/events";
import { guestStatus, listGuests } from "../repo/guests";
import { parseRsvpConfig } from "@/lib/event-content";

export type ReportRow = {
  name: string; phone: string; side: string; group: string; allowed: number; status: string;
  coming: number; arrived: number; note: string; answers: string; source: "Personal link" | "Open link";
};

const SIDE: Record<string, string> = { BRIDE: "Bride", GROOM: "Groom", BOTH: "Both", OTHER: "" };

export async function buildReport(ev: EventRow) {
  const db = await getDb();
  const cfg = parseRsvpConfig(ev.rsvpConfig);
  const qLabel = new Map(cfg.questions.map((q) => [q.id, q.label.en || q.label.ar]));
  const fmtAnswers = (a: Record<string, string> | undefined) => (a ? Object.entries(a).filter(([, v]) => v).map(([k, v]) => `${qLabel.get(k) ?? k}: ${v}`).join(" | ") : "");

  const guests = await listGuests(ev.id);
  const rsvpRows = await db.select({ r: schema.rsvps, p: schema.passes }).from(schema.rsvps)
    .leftJoin(schema.passes, eq(schema.passes.rsvpId, schema.rsvps.id)).where(eq(schema.rsvps.eventId, ev.id));
  const byGuest = new Map(rsvpRows.filter((x) => x.r.guestId).map((x) => [x.r.guestId!, x]));

  const rows: ReportRow[] = guests.map((g) => {
    const x = byGuest.get(g.id);
    return {
      name: g.name, phone: g.phone ?? decryptOrNull(x?.r.phoneEnc) ?? "", side: SIDE[g.side] ?? "", group: g.group ?? "", allowed: g.allowedCompanions + 1,
      status: guestStatus(g), coming: x?.r.status === "ATTENDING" ? x.r.companions + 1 : 0, arrived: x?.p?.admittedTotal ?? 0,
      note: x?.r.note ?? "", answers: fmtAnswers(x?.r.answers), source: "Personal link",
    };
  });
  const open = await db.select({ r: schema.rsvps, p: schema.passes }).from(schema.rsvps)
    .leftJoin(schema.passes, eq(schema.passes.rsvpId, schema.rsvps.id)).where(and(eq(schema.rsvps.eventId, ev.id), isNull(schema.rsvps.guestId)));
  for (const { r, p } of open) {
    rows.push({ name: r.name ?? "Guest", phone: decryptOrNull(r.phoneEnc) ?? "", side: "", group: "", allowed: 0, status: r.status === "ATTENDING" ? "Attending" : "Declined",
      coming: r.status === "ATTENDING" ? r.companions + 1 : 0, arrived: p?.admittedTotal ?? 0, note: r.note ?? "", answers: fmtAnswers(r.answers), source: "Open link" });
  }
  const stats = await eventStats(ev.id);
  const sides = ["Bride", "Groom", "Both", ""].map((s) => {
    const rs = rows.filter((r) => r.side === s);
    return { side: s || "Other / open link", invited: rs.filter((r) => r.source === "Personal link").length, attending: rs.filter((r) => r.status === "Attending").length, people: rs.reduce((n, r) => n + r.coming, 0), arrived: rs.reduce((n, r) => n + r.arrived, 0) };
  }).filter((s) => s.invited + s.attending > 0);
  return { rows, stats, sides, generatedAt: new Date() };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;
