import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { EntitlementsSchema } from "@/lib/entitlements";
import { fmtNum } from "@/lib/format";

export const metadata = { title: "Plans" };

export default async function PlansPage() {
  const { user } = await requireStaff();
  const db = await getDb();
  const plans = await db.select().from(schema.plans).orderBy(asc(schema.plans.package), asc(schema.plans.tier));
  const counts = await db.select({ planId: schema.clientAccounts.planId, n: count() }).from(schema.clientAccounts).groupBy(schema.clientAccounts.planId);
  const n = new Map(counts.map((c) => [c.planId, c.n]));
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Plans & tiers</h1><p className="muted" style={{ margin: 0 }}>Each plan is a preset of features. Change a plan to update every client on it; per-client overrides are kept.</p></div>
      <div className="grid-3">
        {plans.map((p) => {
          const e = EntitlementsSchema.parse(p.entitlements);
          const dark = p.tier === "ROYAL_SEAL";
          return (
            <section key={p.id} className={dark ? "card-dark stack-sm" : "card stack-sm"} style={p.tier === "GILDED" ? { background: "linear-gradient(160deg,#FFFDF9,#F6EBD3)", borderColor: "#D9C08A" } : undefined}>
              <div className="row between"><span className="kicker" style={dark ? { color: "var(--gold)" } : undefined}>{p.package === "ATELIER" ? "Atelier" : "Concierge"}</span>{!p.active && <span className="badge bad">Hidden</span>}</div>
              <h2 style={dark ? { color: "var(--cream)" } : undefined}>{p.nameEn}</h2>
              <div className="ar" style={{ color: dark ? "var(--gold)" : "var(--gold-t)" }} lang="ar">{p.nameAr}</div>
              <div className="small" style={{ lineHeight: 1.8 }}>
                {fmtNum(e.invitations.maxGuestPasses)} guest passes · {e.invitations.maxEvents} invitation(s)<br />
                Music {e.music.enabled ? `on · ${e.music.trialLimit >= 999 ? "unlimited" : e.music.trialLimit} trials` : "off"} · QR {e.checkin.qrPass ? `on · ${e.checkin.gatekeepers} gate` : "off"}<br />
                Reports {[e.reports.exportPdf && "PDF", e.reports.exportExcel && "Excel"].filter(Boolean).join(" + ") || "none"}
              </div>
              <div className="row between" style={{ marginTop: 8 }}>
                <strong>{p.priceOmr ? `${p.priceOmr} OMR` : "—"}</strong>
                <span className="tiny" style={{ opacity: .8 }}>{n.get(p.id) ?? 0} client(s)</span>
              </div>
              {user.role === "SUPER_ADMIN" && <Link className={dark ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm"} href={`/admin/plans/${p.id}`}>Edit plan</Link>}
            </section>
          );
        })}
      </div>
    </>
  );
}

