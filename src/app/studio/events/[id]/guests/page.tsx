import { studioEvent } from "@/server/studio";
import { eventStats, passesUsed } from "@/server/repo/events";
import { guestStatus, inviteUrl, listGuests } from "@/server/repo/guests";
import { parseContent, pick } from "@/lib/event-content";
import { fmtDate, pct } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { addGuestAction, importGuestsAction } from "../../../actions";
import { GuestTable, type GuestRow } from "./guest-table";

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  const [guests, s, used] = await Promise.all([listGuests(ev.id), eventStats(ev.id), passesUsed(ctx.account.id)]);
  const c = parseContent(ev.content);
  const names = { en: `${pick(c.partner1, "en")} & ${pick(c.partner2, "en")}`, ar: `${pick(c.partner1, "ar")} و${pick(c.partner2, "ar")}` };
  const date = { en: fmtDate(ev.startsAt, { weekday: "long", day: "numeric", month: "long" }), ar: fmtDate(ev.startsAt, { weekday: "long", day: "numeric", month: "long" }, "ar-OM") };
  const rows: GuestRow[] = guests.map((g) => ({
    id: g.id, name: g.name, phone: g.phone, side: g.side, group: g.group, allowed: g.allowedCompanions,
    status: guestStatus(g), coming: g.rsvp?.status === "ATTENDING" ? g.rsvp.companions + 1 : null, note: g.rsvp?.note ?? null,
    link: g.key ? inviteUrl(ev.slug, g.key) : "",
  }));
  const max = ctx.ent.invitations.maxGuestPasses;
  return (
    <div className="stack">
      <div className="grid-stats">
        <div className="stat"><div className="l">Guests</div><div className="v">{s.invited}</div></div>
        <div className="stat"><div className="l">Attending</div><div className="v" style={{ color: "var(--ok)" }}>{s.attending}</div><div className="tiny muted">{s.expected} people expected</div></div>
        <div className="stat"><div className="l">Declined</div><div className="v">{s.declined}</div></div>
        <div className="stat"><div className="l">No reply yet</div><div className="v">{Math.max(0, s.invited - s.attending - s.declined)}</div></div>
      </div>
      <div className="row between small"><span className="muted">Guest passes used across your invitations</span><strong>{used} of {max}</strong></div>
      <div className="bar"><i style={{ width: `${pct(used, max)}%` }} /></div>

      {!ctx.readOnly && (
        <div className="grid-2">
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Add a guest</h2>
            <ActionForm action={addGuestAction} resetOnOk>
              <input type="hidden" name="eventId" value={ev.id} />
              <div className="form-grid">
                <div className="field"><label htmlFor="gname">Name on the invitation</label><input className="input" id="gname" name="name" required maxLength={120} placeholder="Ahmed Al Harthy & family" /></div>
                <div className="field"><label htmlFor="gphone">WhatsApp number</label><input className="input" id="gphone" name="phone" inputMode="tel" placeholder="9XXXXXXX" dir="ltr" /></div>
                <div className="field"><label htmlFor="gside">Side</label><select className="input" id="gside" name="side" defaultValue="OTHER"><option value="BRIDE">Bride’s family</option><option value="GROOM">Groom’s family</option><option value="BOTH">Both</option><option value="OTHER">Other</option></select></div>
                <div className="field"><label htmlFor="gcomp">Companions allowed</label><input className="input" id="gcomp" name="allowedCompanions" type="number" min={0} max={20} defaultValue={0} /><span className="hint">0 = only the invitee</span></div>
              </div>
              <div className="field"><label htmlFor="ggroup">Group (optional)</label><input className="input" id="ggroup" name="group" maxLength={80} placeholder="Work friends" /></div>
              <div><SubmitButton>Add guest</SubmitButton></div>
            </ActionForm>
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Import a list</h2>
            <ActionForm action={importGuestsAction} resetOnOk>
              <input type="hidden" name="eventId" value={ev.id} />
              <p className="small muted" style={{ margin: 0 }}>One guest per line: <span className="mono">name, phone, side, companions, group</span>. Side is bride, groom or both. Export from Excel as CSV, or paste.</p>
              <div className="field"><label htmlFor="csvfile">CSV file</label><input className="input" style={{ paddingTop: 10 }} id="csvfile" name="file" type="file" accept=".csv,text/csv" /></div>
              <div className="field"><label htmlFor="csv">…or paste</label><textarea className="input mono" id="csv" name="csv" rows={4} placeholder={"Ahmed Al Harthy & family, 99112233, groom, 3\nReem Al Kindi, 92233445, bride, 1"} /></div>
              <div><SubmitButton pending="Importing…">Import guests</SubmitButton></div>
            </ActionForm>
          </section>
        </div>
      )}

      {ev.status === "DRAFT" && guests.length > 0 && <div className="notice warn">Your invitation is still a draft. Publish it before sending links.</div>}
      <GuestTable eventId={ev.id} rows={rows} names={names} date={date} canEdit={!ctx.readOnly} />
    </div>
  );
}
