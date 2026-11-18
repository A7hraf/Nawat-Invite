import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { studioEvent } from "@/server/studio";
import { getDb, schema } from "@/server/db";
import { eventStats } from "@/server/repo/events";
import { fmtDateTime, pct } from "@/lib/format";
import { removeGatekeeperAction } from "../../../actions";
import { GatekeeperForm } from "./gatekeeper-form";

export default async function EntrancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (!ctx.ent.checkin.qrPass) redirect(`/studio/events/${ev.id}`);
  const db = await getDb();
  const keepers = await db.select({ u: schema.users }).from(schema.eventGatekeepers).innerJoin(schema.users, eq(schema.eventGatekeepers.userId, schema.users.id)).where(eq(schema.eventGatekeepers.eventId, ev.id));
  const recent = await db.select({ c: schema.checkIns, r: schema.rsvps, g: schema.guests }).from(schema.checkIns)
    .innerJoin(schema.passes, eq(schema.checkIns.passId, schema.passes.id)).innerJoin(schema.rsvps, eq(schema.passes.rsvpId, schema.rsvps.id))
    .leftJoin(schema.guests, eq(schema.rsvps.guestId, schema.guests.id)).where(eq(schema.checkIns.eventId, ev.id)).orderBy(desc(schema.checkIns.scannedAt)).limit(12);
  const s = await eventStats(ev.id);
  return (
    <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
      <section className="card-dark stack">
        <div className="row between"><h2 style={{ color: "var(--cream)" }}>At the door</h2><a className="btn btn-gold btn-sm" href={`/gate/${ev.id}`}>Open scanner</a></div>
        <div className="row between"><span style={{ color: "#C9BBA9" }}>Arrived</span><strong style={{ fontSize: 28, fontFamily: "var(--serif)", color: "var(--cream)" }}>{s.arrived} <span style={{ fontSize: 16, color: "#C9BBA9" }}>of {s.expected}</span></strong></div>
        <div className="bar" style={{ background: "#2E2420" }}><i style={{ width: `${pct(s.arrived, s.expected)}%` }} /></div>
        <div className="stack-sm">
          {recent.length === 0 && <div className="small" style={{ color: "#C9BBA9" }}>No one has checked in yet.</div>}
          {recent.map(({ c, r, g }) => (
            <div key={c.id} className="row between small" style={{ borderTop: "1px solid var(--ink-line)", paddingTop: 8 }}>
              <span>{g?.name ?? r.name ?? "Guest"} · {c.admitted} {c.admitted === 1 ? "person" : "people"}</span>
              <span style={{ color: "#A99C8F" }}>{fmtDateTime(c.scannedAt)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card stack">
        <div className="stack-sm"><h2>Gatekeepers</h2><p className="small muted" style={{ margin: 0 }}>Scanner-only logins for the venue team. They can only scan passes for this invitation, and stop working the day after the event. Plan: {ctx.ent.checkin.gatekeepers}.</p></div>
        {keepers.map(({ u }) => (
          <div key={u.id} className="opt-row">
            <div><div className="t">{u.displayName}</div><div className="d mono">{u.username}</div></div>
            {!ctx.readOnly && <form action={removeGatekeeperAction}><input type="hidden" name="eventId" value={ev.id} /><input type="hidden" name="userId" value={u.id} /><button className="btn btn-danger btn-sm" type="submit">Remove</button></form>}
          </div>
        ))}
        {!ctx.readOnly && <GatekeeperForm eventId={ev.id} />}
      </section>
    </div>
  );
}
