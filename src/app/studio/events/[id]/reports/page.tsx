import { studioEvent } from "@/server/studio";
import { buildReport } from "@/server/reports/data";
import { IconDownload } from "@/components/ui/icons";

export default async function ReportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  const rep = await buildReport(ev);
  const s = rep.stats;
  const pdf = ctx.actingAs || ctx.ent.reports.exportPdf, xlsx = ctx.actingAs || ctx.ent.reports.exportExcel;
  const base = `/api/reports/${ev.id}`;
  return (
    <div className="stack">
      <section className="card row between">
        <div className="stack-sm"><h2>Download your guest report</h2><div className="small muted">Totals, replies by side, every guest with their status, companions and notes{ctx.ent.checkin.qrPass ? ", and who arrived" : ""}.</div></div>
        <div className="row">
          {pdf && <a className="btn btn-gold" href={`${base}?format=pdf`}><IconDownload />PDF</a>}
          {xlsx && <a className="btn btn-primary" href={`${base}?format=xlsx`}><IconDownload />Excel</a>}
          {(pdf || xlsx) && <a className="btn btn-ghost" href={`${base}?format=html`} target="_blank" rel="noopener">Printable view</a>}
        </div>
      </section>
      {!pdf && !xlsx && <div className="notice">Report downloads are not part of your plan. Your live numbers are below.</div>}
      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginBottom: 10 }}>Summary</h2>
          <dl className="dl">
            <dt>Invited</dt><dd>{s.invited}</dd><dt>Opened</dt><dd>{s.opened}</dd><dt>Attending</dt><dd>{s.attending} (+{s.companions} companions)</dd>
            <dt>Expected guests</dt><dd>{s.expected}</dd><dt>Declined</dt><dd>{s.declined}</dd><dt>Arrived</dt><dd>{s.arrived}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 10 }}>By side</h2>
          <table className="t" style={{ minWidth: 0 }}>
            <thead><tr><th>Side</th><th>Invited</th><th>Attending</th><th>People</th></tr></thead>
            <tbody>{rep.sides.map((x) => <tr key={x.side}><td>{x.side}</td><td>{x.invited}</td><td>{x.attending}</td><td>{x.people}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
