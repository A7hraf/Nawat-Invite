import { inArray } from "drizzle-orm";
import { requireSuperAdmin } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { relative } from "@/lib/format";
import { setUserStatusAction } from "../actions";
import { StaffForm } from "./staff-form";
import { ResetPassword } from "../clients/[id]/reset-password";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireSuperAdmin();
  const db = await getDb();
  const team = await db.select().from(schema.users).where(inArray(schema.users.role, ["SUPER_ADMIN", "STAFF"]));
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Team</h1><p className="muted" style={{ margin: 0 }}>Staff can manage clients and invitations. Only the System Admin can change plans, settings and the team. Everyone uses 2-step sign-in.</p></div>
      <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 520 }}>
            <thead><tr><th>Name</th><th>Role</th><th>2FA</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>{team.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.displayName}</strong><div className="tiny mono muted">{u.username}</div></td>
                <td>{u.role === "SUPER_ADMIN" ? "System Admin" : "Staff"}</td>
                <td><span className={`badge ${u.totpEnabled ? "ok" : "warn"}`}>{u.totpEnabled ? "On" : "Pending"}</span></td>
                <td className="small">{relative(u.lastLoginAt)}</td>
                <td>{u.role === "STAFF" && u.id !== me.user.id && (
                  <div className="stack-sm">
                    <form action={setUserStatusAction}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="status" value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} /><button className="btn btn-sm btn-ghost" type="submit">{u.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button></form>
                    <ResetPassword userId={u.id} />
                  </div>)}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <section className="card"><h2 style={{ marginBottom: 12 }}>Add staff</h2><StaffForm /></section>
      </div>
    </>
  );
}
