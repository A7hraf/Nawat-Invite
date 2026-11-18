import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireStaff, loadAccount } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { decryptOrNull } from "@/server/crypto";
import { eventStats, listEvents, passesUsed } from "@/server/repo/events";
import { inviteUrl } from "@/server/repo/guests";
import { storageUsed } from "@/server/storage";
import { getBrandSettings } from "@/server/settings";
import { EntitlementsSchema, countOverrides } from "@/lib/entitlements";
import { fmtDate, fmtNum, pct, relative } from "@/lib/format";
import { EntitlementFields } from "@/components/entitlement-fields";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { IconEye } from "@/components/ui/icons";
import { manageAsAction, resetOverridesAction, saveOverridesAction, updateAccountAction } from "../../actions";
import { ResetPassword } from "./reset-password";

export const metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const loaded = await loadAccount(id);
  if (!loaded) notFound();
  const { account, plan, ent } = loaded;
  const db = await getDb();
  const [plans, users, events, used, bytes, brand] = await Promise.all([
    db.select().from(schema.plans).orderBy(asc(schema.plans.package), asc(schema.plans.tier)),
    db.select().from(schema.users).where(eq(schema.users.accountId, id)),
    listEvents(id), passesUsed(id), storageUsed(id), getBrandSettings(),
  ]);
  const stats = await Promise.all(events.map((e) => eventStats(e.id)));
  const planEnt = EntitlementsSchema.parse(plan.entitlements);
  const overrides = countOverrides(account.entitlementOverrides);
  const client = users.filter((u) => u.role === "CLIENT");
  const gatekeepers = users.filter((u) => u.role === "GATEKEEPER");

  return (
    <>
      <div className="crumbs"><a href="/admin/clients">Clients</a> / {account.displayName}</div>
      <div className="page-head">
        <div className="stack-sm">
          <h1>{account.displayName}</h1>
          <div className="row">
            <span className="badge ink">{brand.tierNames[plan.tier].en}</span>
            <span className="badge gold">{plan.package === "ATELIER" ? "Atelier · self-service" : "Concierge · done for you"}</span>
            <span className={`badge ${account.status === "ACTIVE" ? "ok" : "bad"}`}>{account.status === "ACTIVE" ? "Active" : "Suspended"}{account.validUntil ? ` · until ${fmtDate(account.validUntil)}` : ""}</span>
          </div>
        </div>
        <form action={manageAsAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <button className="btn btn-gold" type="submit"><IconEye />Manage as client</button>
        </form>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))" }}>
        <section className="card">
          <h2 style={{ marginBottom: 14 }}>Account</h2>
          <ActionForm action={updateAccountAction}>
            <input type="hidden" name="accountId" value={account.id} />
            <div className="field"><label htmlFor="displayName">Name</label><input className="input" id="displayName" name="displayName" defaultValue={account.displayName} required /></div>
            <div className="field"><label htmlFor="planId">Package & tier</label>
              <select className="input" id="planId" name="planId" defaultValue={account.planId}>{plans.map((p) => <option key={p.id} value={p.id}>{p.nameEn}</option>)}</select></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue={account.status}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></div>
              <div className="field"><label htmlFor="validUntil">Valid until</label><input className="input" id="validUntil" type="date" name="validUntil" defaultValue={account.validUntil ? account.validUntil.toISOString().slice(0, 10) : ""} /></div>
            </div>
            <div className="field"><label htmlFor="notes">Internal notes</label><textarea className="input" id="notes" name="notes" defaultValue={account.internalNotes ?? ""} /></div>
            <dl className="dl small"><dt>Contact</dt><dd>{account.contactName ?? "—"} · <span dir="ltr">{decryptOrNull(account.contactPhoneEnc) ?? "—"}</span></dd></dl>
            <div><SubmitButton>Save account</SubmitButton></div>
          </ActionForm>
        </section>

        <div className="stack">
          <section className="card stack-sm">
            <h2>Sign-in</h2>
            {client.map((u) => (
              <div key={u.id} className="stack-sm">
                <dl className="dl"><dt>Username</dt><dd className="mono">{u.username}</dd><dt>Last sign-in</dt><dd>{relative(u.lastLoginAt)}</dd><dt>Password</dt><dd>{u.mustChangePassword ? "One-time (not changed yet)" : "Set by client"}</dd></dl>
                <ResetPassword userId={u.id} />
              </div>
            ))}
            {gatekeepers.length > 0 && <div className="tiny muted">{gatekeepers.length} gatekeeper login(s)</div>}
          </section>
          <section className="card stack-sm">
            <h2>Usage</h2>
            <div className="row between small"><span>Guest passes</span><strong>{fmtNum(used)} of {fmtNum(ent.invitations.maxGuestPasses)}</strong></div>
            <div className="bar"><i style={{ width: `${pct(used, ent.invitations.maxGuestPasses)}%` }} /></div>
            <div className="row between small"><span>Invitations</span><strong>{events.length} of {ent.invitations.maxEvents}</strong></div>
            <div className="row between small"><span>Storage</span><strong>{(bytes / 1048576).toFixed(1)} MB of {ent.media.storageMb} MB</strong></div>
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-head"><h2>Invitations</h2></div>
        {events.length === 0 ? <div className="muted small">No invitations yet. Use “Manage as client” to create one for a Concierge client.</div> : (
          <div className="scroll-x"><table className="t" style={{ minWidth: 640 }}>
            <thead><tr><th>Invitation</th><th>Date</th><th>Theme</th><th>Replies</th><th>Status</th><th>Link</th></tr></thead>
            <tbody>{events.map((e, i) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.title}</td><td>{fmtDate(e.startsAt)}</td><td className="small">{e.themeSlug}</td>
                <td className="small">{stats[i]!.attending} attending · {stats[i]!.expected} people</td>
                <td><span className={`badge ${e.status === "PUBLISHED" ? "ok" : "warn"}`}>{e.status.toLowerCase()}</span></td>
                <td>{e.status === "PUBLISHED" && e.openLinkEnabled ? <a className="small" href={inviteUrl(e.slug)} target="_blank" rel="noopener">Open link</a> : <span className="tiny muted">Personal links</span>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>

      <section className="stack">
        <div className="page-head">
          <div className="stack-sm"><h2 style={{ fontSize: 34 }}>Features & limits</h2><div className="muted small">Defaults come from <strong>{plan.nameEn}</strong>. Change any value to override it for this client only. Gold edges mark overrides.</div></div>
          <div className="row">
            <span className="badge gold">{overrides === 0 ? "Matches the plan" : `${overrides} override${overrides === 1 ? "" : "s"}`}</span>
            {overrides > 0 && <form action={resetOverridesAction}><input type="hidden" name="accountId" value={account.id} /><button className="btn btn-ghost btn-sm" type="submit">Reset to plan</button></form>}
          </div>
        </div>
        <ActionForm action={saveOverridesAction}>
          <input type="hidden" name="accountId" value={account.id} />
          <EntitlementFields value={ent} base={planEnt} tierNames={brand.tierNames} />
          <div><SubmitButton className="btn btn-gold">Save features</SubmitButton></div>
        </ActionForm>
      </section>
    </>
  );
}
