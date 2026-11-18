import { requireStudio } from "@/server/auth/context";
import { getBrandSettings } from "@/server/settings";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Account" };

const Y = ({ v }: { v: boolean }) => <span className={`badge ${v ? "ok" : ""}`}>{v ? "Included" : "Not included"}</span>;

export default async function AccountPage() {
  const ctx = await requireStudio();
  const brand = await getBrandSettings();
  const e = ctx.ent;
  return (
    <main className="container" style={{ maxWidth: 860 }}>
      <div className="stack-sm"><div className="kicker">Account</div><h1>Your package</h1></div>
      <section className="card stack">
        <div className="row between"><h2>{ctx.plan.nameEn}</h2><span className="ar" lang="ar" style={{ color: "var(--gold-t)" }}>{ctx.plan.nameAr}</span></div>
        <dl className="dl">
          <dt>Theme levels</dt><dd>{e.themes.tiers.map((t) => brand.tierNames[t].en).join(", ")}</dd>
          <dt>Invitations</dt><dd>{e.invitations.maxEvents}</dd>
          <dt>Guest passes</dt><dd>{e.invitations.maxGuestPasses}</dd>
          <dt>Valid until</dt><dd>{fmtDate(ctx.account.validUntil)}</dd>
        </dl>
        <div className="grid-2">
          <div className="stack-sm small">
            <div className="row between"><span>Arabic + English</span><Y v={e.invitations.bilingual} /></div>
            <div className="row between"><span>Open link for group chats</span><Y v={e.invitations.openLinkAllowed} /></div>
            <div className="row between"><span>Background music</span><Y v={e.music.enabled} /></div>
            <div className="row between"><span>Upload your own music</span><Y v={e.music.allowUpload} /></div>
          </div>
          <div className="stack-sm small">
            <div className="row between"><span>QR entry pass</span><Y v={e.checkin.qrPass} /></div>
            <div className="row between"><span>Notices (children, photos…)</span><Y v={e.rsvp.notices} /></div>
            <div className="row between"><span>PDF report</span><Y v={e.reports.exportPdf} /></div>
            <div className="row between"><span>Excel report</span><Y v={e.reports.exportExcel} /></div>
          </div>
        </div>
        <div className="notice small">Want more guests or features? Message Nawat on <strong dir="ltr">{brand.footer.phone}</strong>.</div>
      </section>
      {!ctx.actingAs && <a className="btn btn-ghost" href="/change-password" style={{ alignSelf: "flex-start" }}>Change my password</a>}
    </main>
  );
}
