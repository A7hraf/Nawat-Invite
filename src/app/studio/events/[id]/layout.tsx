import { studioEvent } from "@/server/studio";
import { NavLinks } from "@/components/ui/nav";
import { fmtDate } from "@/lib/format";
import { themeBySlug } from "@/themes/catalog";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  const base = `/studio/events/${ev.id}`;
  const t = themeBySlug(ev.themeSlug);
  const edit = !ctx.readOnly;
  const items = [
    { href: base, label: "Overview", exact: true },
    ...(edit ? [{ href: `${base}/design`, label: "Theme" }, { href: `${base}/content`, label: "Details" }, { href: `${base}/rsvp`, label: "Reply form" }] : []),
    ...(edit && ctx.ent.music.enabled ? [{ href: `${base}/music`, label: "Music" }] : []),
    ...(edit && ctx.ent.media.photos > 0 ? [{ href: `${base}/photos`, label: "Photos" }] : []),
    { href: `${base}/guests`, label: "Guests" },
    ...(ctx.ent.checkin.qrPass ? [{ href: `${base}/entrance`, label: "Entrance" }] : []),
    { href: `${base}/reports`, label: "Reports" },
  ];
  return (
    <main className="container">
      <div className="page-head">
        <div className="stack-sm">
          <div className="crumbs"><a href="/studio">My invitations</a> / {ev.title}</div>
          <h1>{ev.title}</h1>
          <div className="row small muted">
            <span className={`badge ${ev.status === "PUBLISHED" ? "ok" : ev.status === "DRAFT" ? "warn" : ""}`}>{ev.status === "PUBLISHED" ? "Live" : ev.status === "DRAFT" ? "Draft" : ev.status.toLowerCase()}</span>
            <span>{fmtDate(ev.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span>· {t?.name.en}</span>
          </div>
        </div>
        <a className="btn btn-ghost" href={`${base}/preview`} target="_blank" rel="noopener">Preview as a guest</a>
      </div>
      <NavLinks className="tabs" label="Invitation sections" items={items} />
      {children}
    </main>
  );
}
