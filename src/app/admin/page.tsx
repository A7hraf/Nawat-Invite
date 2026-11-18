import Link from "next/link";
import { asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { requireStaff } from "@/server/auth/context";
import { eventStats, passesUsed } from "@/server/repo/events";
import { resolveEntitlements } from "@/lib/entitlements";
import { fmtDate, fmtNum, pct, relative } from "@/lib/format";
import { IconPlus } from "@/components/ui/icons";

export const metadata = { title: "Control Room" };

export default async function AdminHome() {
  const { user } = await requireStaff();
  const db = await getDb();
  const now = new Date();
  const [[acc], [live], [replies]] = await Promise.all([
    db.select({ n: count() }).from(schema.clientAccounts).where(eq(schema.clientAccounts.status, "ACTIVE")),
    db.select({ n: count() }).from(schema.events).where(eq(schema.events.status, "PUBLISHED")),
    db.select({ n: count() }).from(schema.rsvps).where(eq(schema.rsvps.status, "ATTENDING")),
  ]);
  const upcoming = await db.select({ ev: schema.events, account: schema.clientAccounts, plan: schema.plans })
    .from(schema.events).innerJoin(schema.clientAccounts, eq(schema.events.accountId, schema.clientAccounts.id))
    .innerJoin(schema.plans, eq(schema.clientAccounts.planId, schema.plans.id))
    .where(gte(schema.events.startsAt, new Date(now.getTime() - 86400_000))).orderBy(asc(schema.events.startsAt)).limit(8);
  const rows = await Promise.all(upcoming.map(async (u) => ({ ...u, stats: await eventStats(u.ev.id) })));

  // Attention: accounts near their guest-pass quota or expiring within 14 days.
  const accounts = await db.select({ a: schema.clientAccounts, p: schema.plans }).from(schema.clientAccounts)
    .innerJoin(schema.plans, eq(schema.clientAccounts.planId, schema.plans.id)).where(eq(schema.clientAccounts.status, "ACTIVE")).limit(500);
  const attention: { id: string; text: string; tone: "warn" | "bad" }[] = [];
  for (const { a, p } of accounts) {
    const ent = resolveEntitlements(p.entitlements, a.entitlementOverrides);
    const used = await passesUsed(a.id);
    if (ent.invitations.maxGuestPasses > 0 && used / ent.invitations.maxGuestPasses >= 0.9) attention.push({ id: a.id, text: `${a.displayName} used ${used} of ${ent.invitations.maxGuestPasses} guest passes`, tone: "warn" });
    if (a.validUntil && a.validUntil < new Date(now.getTime() + 14 * 86400_000)) attention.push({ id: a.id, text: `${a.displayName} ${a.validUntil < now ? "expired" : "expires"} ${fmtDate(a.validUntil)}`, tone: "bad" });
  }
  const recent = await db.select().from(schema.auditLogs).where(lte(schema.auditLogs.createdAt, now)).orderBy(desc(schema.auditLogs.createdAt)).limit(6);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Muscat" }).format(now));
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="page-head">
        <div className="stack-sm">
          <div className="muted small">{fmtDate(now, { weekday: "long", day: "numeric", month: "long" })} · Muscat</div>
          <h1>{greet}, <em style={{ color: "var(--wine)" }}>{user.displayName.split(" ")[0]}</em></h1>
        </div>
        <Link className="btn btn-primary" href="/admin/clients/new"><IconPlus />New client account</Link>
      </div>

      <div className="grid-stats">
        <div className="stat dark"><div className="l">Live invitations</div><div className="v">{fmtNum(live?.n ?? 0)}</div></div>
        <div className="stat"><div className="l">Active client accounts</div><div className="v">{fmtNum(acc?.n ?? 0)}</div></div>
        <div className="stat"><div className="l">Guests attending (all time)</div><div className="v">{fmtNum(replies?.n ?? 0)}</div></div>
        <div className="stat"><div className="l">Needs attention</div><div className="v" style={{ color: "var(--wine)" }}>{attention.length}</div></div>
      </div>

      <div className="split">
        <section className="card">
          <div className="card-head"><h2>Upcoming celebrations</h2><Link className="small" href="/admin/clients">All clients</Link></div>
          {rows.length === 0 ? <div className="empty">No upcoming celebrations yet.</div> : (
            <div className="scroll-x"><table className="t" style={{ minWidth: 560 }}>
              <thead><tr><th>Celebration</th><th>Date</th><th>Replies</th><th>Status</th></tr></thead>
              <tbody>{rows.map(({ ev, account, plan, stats }) => (
                <tr key={ev.id}>
                  <td><Link href={`/admin/clients/${account.id}`} style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "none" }}>{ev.title}</Link><div className="tiny muted">{plan.nameEn}</div></td>
                  <td>{fmtDate(ev.startsAt, { day: "numeric", month: "short" })}</td>
                  <td style={{ minWidth: 150 }}><div className="bar"><i style={{ width: `${pct(stats.attending + stats.declined, stats.invited || 1)}%` }} /></div><div className="tiny muted" style={{ marginTop: 4 }}>{stats.attending + stats.declined} of {stats.invited} · {stats.expected} expected</div></td>
                  <td><span className={`badge ${ev.status === "PUBLISHED" ? "ok" : ev.status === "DRAFT" ? "warn" : ""}`}>{ev.status === "PUBLISHED" ? "Live" : ev.status.toLowerCase()}</span></td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>
        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Needs attention</h2></div>
            {attention.length === 0 ? <div className="muted small">All clear.</div> : (
              <div className="stack-sm">{attention.slice(0, 8).map((a, i) => (
                <Link key={i} href={`/admin/clients/${a.id}`} className={`notice ${a.tone}`} style={{ textDecoration: "none" }}>{a.text}</Link>
              ))}</div>
            )}
          </section>
          <section className="card-dark">
            <div className="card-head"><h2 style={{ color: "var(--cream)" }}>Recent activity</h2><Link className="small" href="/admin/audit" style={{ color: "var(--gold)" }}>Audit log</Link></div>
            <div className="stack-sm">{recent.map((r) => (
              <div key={r.id} className="row between small" style={{ borderTop: "1px solid var(--ink-line)", paddingTop: 10 }}>
                <span>{r.actorName ?? "System"} · <span style={{ color: "var(--gold-l)" }}>{r.action}</span></span>
                <span style={{ color: "var(--muted-d)" }}>{relative(r.createdAt)}</span>
              </div>))}</div>
          </section>
        </div>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
