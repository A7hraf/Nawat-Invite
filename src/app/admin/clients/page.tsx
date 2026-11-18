import Link from "next/link";
import { requireStaff } from "@/server/auth/context";
import { listAccounts } from "@/server/repo/accounts";
import { fmtDate, relative } from "@/lib/format";
import { IconPlus } from "@/components/ui/icons";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q = "" } = await searchParams;
  const rows = await listAccounts(q.slice(0, 60) || undefined);
  return (
    <>
      <div className="page-head">
        <div className="stack-sm"><div className="kicker">Control Room</div><h1>Clients</h1></div>
        <div className="row">
          <form className="row" role="search">
            <label htmlFor="q" className="sr-only">Search clients</label>
            <input id="q" name="q" className="input" placeholder="Search name or username" defaultValue={q} style={{ width: 260 }} />
            <button className="btn btn-ghost" type="submit">Search</button>
          </form>
          <Link className="btn btn-primary" href="/admin/clients/new"><IconPlus />New client</Link>
        </div>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Client</th><th>Plan</th><th>Username</th><th>Invitations</th><th>Valid until</th><th>Last sign-in</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="empty">No clients yet. Create the first account.</td></tr>}
            {rows.map((r) => (
              <tr key={r.account.id}>
                <td><Link href={`/admin/clients/${r.account.id}`} style={{ fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>{r.account.displayName}</Link>{r.account.contactName && <div className="tiny muted">{r.account.contactName}</div>}</td>
                <td><span className={`badge ${r.plan.tier === "ROYAL_SEAL" ? "wine" : r.plan.tier === "GILDED" ? "gold" : ""}`}>{r.plan.nameEn}</span></td>
                <td className="mono">{r.username ?? "—"}</td>
                <td>{r.events}</td>
                <td>{fmtDate(r.account.validUntil)}</td>
                <td className="small muted">{relative(r.lastLoginAt)}</td>
                <td><span className={`badge ${r.account.status === "ACTIVE" ? "ok" : "bad"}`}>{r.account.status === "ACTIVE" ? "Active" : "Suspended"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
