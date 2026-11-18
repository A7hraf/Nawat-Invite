import Link from "next/link";
import { requireStudio } from "@/server/auth/context";
import { eventStats, listEvents, passesUsed } from "@/server/repo/events";
import { fmtDate, fmtNum, pct } from "@/lib/format";
import { parseContent, pick } from "@/lib/event-content";
import { themeBySlug } from "@/themes/catalog";
import { IconPlus } from "@/components/ui/icons";

export const metadata = { title: "My invitations" };

function countdown(d: Date) {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Today or past";
  const days = Math.floor(ms / 86400_000);
  return days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} to go`;
}

export default async function StudioHome() {
  const ctx = await requireStudio();
  const events = await listEvents(ctx.account.id);
  const stats = await Promise.all(events.map((e) => eventStats(e.id)));
  const used = await passesUsed(ctx.account.id);
  const canCreate = !ctx.readOnly && events.length < ctx.ent.invitations.maxEvents;
  return (
    <main className="container">
      <div className="page-head">
        <div className="stack-sm"><div className="kicker">Atelier</div><h1>{ctx.account.displayName}</h1></div>
        {canCreate && <Link className="btn btn-primary" href="/studio/events/new"><IconPlus />New invitation</Link>}
      </div>

      {events.length === 0 && (
        <section className="card-dark stack" style={{ padding: 40, textAlign: "center", alignItems: "center" }}>
          <div className="kicker" style={{ color: "var(--gold)" }}>Welcome</div>
          <h2 style={{ color: "var(--cream)", fontSize: 40 }}>Let’s create your invitation</h2>
          <p style={{ color: "#C9BBA9", maxWidth: 480, margin: 0 }}>Pick a theme, write your names and details, add your guests, and send each of them a personal link.</p>
          {canCreate ? <Link className="btn btn-gold" href="/studio/events/new">Start now</Link> : <p className="small" style={{ color: "#C9BBA9" }}>Nawat is preparing your invitation.</p>}
        </section>
      )}

      {events.map((e, i) => {
        const s = stats[i]!;
        const t = themeBySlug(e.themeSlug);
        const c = parseContent(e.content);
        const p = t?.palette;
        return (
          <section key={e.id} style={{ borderRadius: 28, overflow: "hidden", background: p ? `radial-gradient(120% 140% at 85% 10%, ${p.glow} 0%, ${p.night} 55%)` : "var(--ink)", color: "#F7F2EA", padding: "34px 38px", display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
            <div style={{ flex: "999 1 420px", minWidth: 0 }} className="stack">
              <div className="row"><span className="badge" style={{ background: "rgba(255,255,255,.12)", color: p?.cream }}>{e.status === "PUBLISHED" ? "Live" : e.status === "DRAFT" ? "Draft" : e.status.toLowerCase()}</span><span className="small" style={{ color: p?.mutedDark }}>{t?.name.en} · {fmtDate(e.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></div>
              <div style={{ fontFamily: `'${t?.fonts.display ?? "Cormorant Garamond"}', serif`, fontSize: 52, lineHeight: 1, color: p?.cream }}>{pick(c.partner1, "en")} <em style={{ color: p?.accent }}>&amp;</em> {pick(c.partner2, "en")}</div>
              <div style={{ color: p?.mutedDark }} className="small">{countdown(e.startsAt)}</div>
              <div className="row"><Link className="btn btn-gold" href={`/studio/events/${e.id}`}>Open</Link><Link className="btn" style={{ border: "1px solid rgba(255,255,255,.25)", color: "#F7F2EA" }} href={`/studio/events/${e.id}/guests`}>Guests</Link></div>
            </div>
            <div style={{ flex: "1 1 320px" }} className="grid" >
              <div className="row between"><span style={{ color: p?.mutedDark }}>Invited</span><strong>{s.invited}</strong></div>
              <div className="row between"><span style={{ color: p?.mutedDark }}>Opened</span><strong>{s.opened}</strong></div>
              <div className="row between"><span style={{ color: p?.mutedDark }}>Attending</span><strong>{s.attending} <span style={{ fontWeight: 400, color: p?.mutedDark }}>+ {s.companions} companions</span></strong></div>
              <div className="row between"><span style={{ color: p?.mutedDark }}>Declined</span><strong>{s.declined}</strong></div>
              <div className="row between" style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 10 }}><span style={{ color: p?.mutedDark }}>Expected guests</span><strong style={{ fontSize: 22, color: p?.accent }}>{s.expected}</strong></div>
            </div>
          </section>
        );
      })}

      <section className="card stack-sm" style={{ maxWidth: 520 }}>
        <div className="row between"><h2>Your plan</h2><span className="badge ink">{ctx.plan.nameEn}</span></div>
        <div className="row between small"><span className="muted">Guest passes</span><strong>{fmtNum(used)} of {fmtNum(ctx.ent.invitations.maxGuestPasses)}</strong></div>
        <div className="bar"><i style={{ width: `${pct(used, ctx.ent.invitations.maxGuestPasses)}%` }} /></div>
        <div className="row between small"><span className="muted">Invitations</span><strong>{events.length} of {ctx.ent.invitations.maxEvents}</strong></div>
      </section>
    </main>
  );
}
