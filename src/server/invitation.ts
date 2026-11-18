import "server-only";
import { parseContent, parseRsvpConfig, pick } from "@/lib/event-content";
import type { Entitlements } from "@/lib/entitlements";
import type { InvitationData } from "@/components/invitation/types";
import { themeBySlug, THEMES } from "@/themes/catalog";
import { env } from "./env";
import { getBrandSettings } from "./settings";
import { resolveMusic } from "./music";
import { mediaUrl } from "./storage";
import { themeArtUrls } from "./themes";
import { enforceContent, enforceRsvp, type EventRow } from "./repo/events";

type Guest = { name: string; allowedCompanions: number } | null;

export function calendarLinks(ev: Pick<EventRow, "slug" | "startsAt" | "endsAt">, title: string, location: string) {
  const end = ev.endsAt ?? new Date(ev.startsAt.getTime() + 5 * 3600_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = encodeURIComponent;
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q(title)}&dates=${z(ev.startsAt)}/${z(end)}&location=${q(location)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${q(title)}&startdt=${ev.startsAt.toISOString()}&enddt=${end.toISOString()}&location=${q(location)}`,
    ics: `/api/ics/${ev.slug}`,
  };
}

/** Builds the public view of an invitation; only what a guest may see. */
export async function buildInvitationData(ev: EventRow, ent: Entitlements, opts: { mode: InvitationData["mode"]; guestKey?: string | null; guest?: Guest; reply?: InvitationData["reply"] }): Promise<InvitationData> {
  const theme = themeBySlug(ev.themeSlug) ?? THEMES[0]!;
  const content = enforceContent(parseContent(ev.content), ent);
  const cfg = enforceRsvp(parseRsvpConfig(ev.rsvpConfig), ent);
  const brand = await getBrandSettings();
  const deadlinePassed = cfg.deadline ? new Date(cfg.deadline + "T23:59:59+04:00") < new Date() : false;
  const names = `${pick(content.partner1, "en")} & ${pick(content.partner2, "en")}`;
  const venue = [pick(content.venue.name, "en"), pick(content.venue.address, "en")].filter(Boolean).join(", ");
  return {
    mode: opts.mode,
    slug: ev.slug,
    guestKey: opts.guestKey ?? null,
    theme,
    accent: content.accent ?? theme.palette.accent,
    content: {
      partner1: content.partner1, partner2: content.partner2, families: content.families, message: content.message, verse: content.verse,
      venue: content.venue, schedule: content.schedule, sections: content.sections, locales: content.locales, defaultLocale: content.defaultLocale,
      letter: content.letter, dressCode: content.dressCode, faq: content.faq,
    },
    art: await themeArtUrls(theme.slug),
    closingPhoto: content.closingPhoto ? mediaUrl(content.closingPhoto) : null,
    startsAt: ev.startsAt.toISOString(),
    rsvp: {
      enabled: ent.rsvp.enabled, closed: ev.status === "CLOSED" || deadlinePassed, deadline: cfg.deadline, allowChange: cfg.allowChange, qrPass: ent.checkin.qrPass,
      fields: cfg.fields,
      maxCompanions: cfg.fields.companions === "off" ? 0 : opts.guest ? opts.guest.allowedCompanions : cfg.openLinkMaxCompanions,
      notices: cfg.notices.filter((n) => n.mode !== "off"),
      questions: cfg.questions,
    },
    guest: opts.guest ?? null,
    reply: opts.reply ?? null,
    gallery: content.sections.gallery ? content.gallery.map(mediaUrl) : [],
    music: ent.music.enabled ? await resolveMusic(content.music.trackId, ev.accountId) : null,
    footer: brand.footer,
    appUrl: env().APP_URL,
    calendar: calendarLinks(ev, `${names} · ${ev.type === "ENGAGEMENT" ? "Engagement" : "Wedding"}`, venue),
  };
}
