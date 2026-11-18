import { desc, like } from "drizzle-orm";
import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  await requireStaff();
  const { a = "" } = await searchParams;
  const db = await getDb();
  const filter = a.replace(/[^a-z_.]/g, "").slice(0, 40);
  const rows = await db.select().from(schema.auditLogs).where(filter ? like(schema.auditLogs.action, `${filter}%`) : undefined).orderBy(desc(schema.auditLogs.createdAt)).limit(300);
  const chips = ["", "login", "account", "entitlement", "impersonation", "event", "guest", "report", "user"];
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Audit log</h1><p className="muted" style={{ margin: 0 }}>Every sign-in, permission change, impersonation and export. Entries cannot be edited.</p></div>
      <div className="row">{chips.map((c) => <a key={c} href={c ? `?a=${c}` : "?"} className={`btn btn-sm ${filter === c ? "btn-primary" : "btn-ghost"}`}>{c || "All"}</a>)}</div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="empty">Nothing recorded yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                <td>{r.actorName ?? "System"}{r.actingAsAccountId && <div className="tiny" style={{ color: "var(--gold-t)" }}>acting as client</div>}</td>
                <td><span className="badge">{r.action}</span></td>
                <td className="small mono">{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ""}</td>
                <td className="tiny mono muted" style={{ maxWidth: 320, wordBreak: "break-word" }}>{Object.keys(r.meta).length ? JSON.stringify(r.meta).slice(0, 160) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
