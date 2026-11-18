import { pick, parseContent } from "@/lib/event-content";
import { HttpError } from "@/server/request";
import { loadPublicEvent } from "@/server/services/rsvp";

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Apple / any-calendar file with a reminder the day before. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { ev } = await loadPublicEvent(slug);
    const c = parseContent(ev.content);
    const end = ev.endsAt ?? new Date(ev.startsAt.getTime() + 5 * 3600_000);
    const title = `${pick(c.partner1, "en")} & ${pick(c.partner2, "en")}`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nawat Invites//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", `UID:${ev.id}@nawat-invites`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(ev.startsAt)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(title)}`, `LOCATION:${esc([pick(c.venue.name, "en"), pick(c.venue.address, "en")].filter(Boolean).join(", "))}`,
      ...(c.venue.mapUrl ? [`URL:${c.venue.mapUrl}`] : []),
      "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)} tomorrow`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}.ics"`, "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(e instanceof HttpError ? e.message : "Not found", { status: 404 });
  }
}
