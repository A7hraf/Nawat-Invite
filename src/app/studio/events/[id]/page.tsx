import { studioEvent } from "@/server/studio";
import { eventStats, passesUsed } from "@/server/repo/events";
import { inviteUrl } from "@/server/repo/guests";
import { parseContent, pick } from "@/lib/event-content";
import { fmtNum, pct } from "@/lib/format";
import { CopyButton } from "@/components/ui/form";
import { setEventStatusAction } from "../../actions";

export default async function EventOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  const [s, used] = await Promise.all([eventStats(ev.id), passesUsed(ctx.account.id)]);
  const c = parseContent(ev.content);
  const missing = [
    !pick(c.partner1, "en") && !pick(c.partner1, "ar") && "names",
    !pick(c.venue.name, "en") && !pick(c.venue.name, "ar") && "venue name",
  ].filter(Boolean) as string[];
  const open = inviteUrl(ev.slug);
  return (
    <div className="stack">
      <div className="grid-stats">
        <div className="stat"><div className="l">Invited</div><div className="v">{fmtNum(s.invited)}</div></div>
        <div className="stat"><div className="l">Opened</div><div className="v">{fmtNum(s.opened)}</div></div>
        <div className="stat"><div className="l">Attending</div><div className="v" style={{ color: "var(--ok)" }}>{fmtNum(s.attending)}</div><div className="tiny muted">+ {s.companions} companions</div></div>
        <div className="stat"><div className="l">Declined</div><div className="v" style={{ color: "var(--bad)" }}>{fmtNum(s.declined)}</div></div>
        <div className="stat dark"><div className="l">Expected guests</div><div className="v">{fmtNum(s.expected)}</div>{ctx.ent.checkin.qrPass && <div className="tiny" style={{ color: "#C9BBA9" }}>{s.arrived} arrived</div>}</div>
      </div>

      <div className="grid-2">
        <section className="card stack">
          <h2>Publish</h2>
          {ev.status === "DRAFT" && <p className="muted small" style={{ margin: 0 }}>Your invitation is a draft. Guests can open it once it is live.</p>}
          {ev.status === "PUBLISHED" && <p className="muted small" style={{ margin: 0 }}>Your invitation is live. Changes you save appear for guests right away.</p>}
          {ev.status === "CLOSED" && <p className="muted small" style={{ margin: 0 }}>Replies are closed. Guests can still see the invitation and their pass.</p>}
          {missing.length > 0 && ev.status === "DRAFT" && <div className="notice warn small">Before publishing, add the {missing.join(" and ")} in Details.</div>}
          {!ctx.readOnly && (
            <div className="row">
              {ev.status !== "PUBLISHED" && <form action={setEventStatusAction}><input type="hidden" name="eventId" value={ev.id} /><input type="hidden" name="status" value="PUBLISHED" /><button className="btn btn-gold" type="submit" disabled={missing.length > 0}>{ev.status === "CLOSED" ? "Reopen replies" : "Publish invitation"}</button></form>}
              {ev.status === "PUBLISHED" && <form action={setEventStatusAction}><input type="hidden" name="eventId" value={ev.id} /><input type="hidden" name="status" value="CLOSED" /><button className="btn btn-ghost" type="submit">Close replies</button></form>}
              {ev.status !== "DRAFT" && <form action={setEventStatusAction}><input type="hidden" name="eventId" value={ev.id} /><input type="hidden" name="status" value="DRAFT" /><button className="btn btn-danger" type="submit">Unpublish</button></form>}
            </div>
          )}
        </section>
        <section className="card stack">
          <h2>Links</h2>
          <p className="small muted" style={{ margin: 0 }}>Each guest gets a personal link from the Guests tab. It greets them by name and limits their party size.</p>
          {ev.openLinkEnabled ? (
            <div className="stack-sm">
              <div className="small"><strong>Open link</strong> for group chats (each reply uses a guest pass):</div>
              <div className="row"><code className="mono" style={{ wordBreak: "break-all", flex: 1 }}>{open}</code><CopyButton text={open} /></div>
            </div>
          ) : <div className="tiny muted">The open link is off. {ctx.ent.invitations.openLinkAllowed ? "Turn it on in Reply form." : ""}</div>}
          <div className="row between small"><span className="muted">Guest passes used (all invitations)</span><strong>{used} of {ctx.ent.invitations.maxGuestPasses}</strong></div>
          <div className="bar"><i style={{ width: `${pct(used, ctx.ent.invitations.maxGuestPasses)}%` }} /></div>
        </section>
      </div>
    </div>
  );
}
