import { redirect } from "next/navigation";
import { and, eq, gte } from "drizzle-orm";
import { requireUser } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { fmtDate } from "@/lib/format";
import { logoutAction } from "../(auth)/actions";

export const metadata = { title: "Entrance" };

/** Gatekeepers land here: the events they may scan for. */
export default async function GateHome() {
  const c = await requireUser();
  if (c.isStaff) redirect("/admin");
  if (c.user.role === "CLIENT") redirect("/studio");
  const db = await getDb();
  const events = await db.select({ ev: schema.events }).from(schema.eventGatekeepers)
    .innerJoin(schema.events, eq(schema.eventGatekeepers.eventId, schema.events.id))
    .where(and(eq(schema.eventGatekeepers.userId, c.user.id), gte(schema.events.startsAt, new Date(Date.now() - 2 * 86400_000))));
  if (events.length === 1) redirect(`/gate/${events[0]!.ev.id}`);
  return (
    <main style={{ minHeight: "100svh", background: "#0E0A09", color: "#F7F2EA", padding: 24 }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }} className="stack">
        <div className="kicker" style={{ color: "var(--gold)" }}>Entrance</div>
        <h1 style={{ color: "var(--cream)" }}>Hello, {c.user.displayName}</h1>
        {events.length === 0 && <p style={{ color: "#C9BBA9" }}>No upcoming events are assigned to you.</p>}
        {events.map(({ ev }) => <a key={ev.id} className="btn btn-gold" href={`/gate/${ev.id}`}>{ev.title} · {fmtDate(ev.startsAt)}</a>)}
        <form action={logoutAction}><button className="btn btn-sm" style={{ border: "1px solid #3A2F29", background: "transparent", color: "#C9BBA9" }} type="submit">Sign out</button></form>
      </div>
    </main>
  );
}
