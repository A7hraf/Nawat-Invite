import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/context";
import { buildInvitationData } from "@/server/invitation";
import { defaultEntitlements } from "@/lib/entitlements";
import { defaultContent, defaultRsvpConfig } from "@/lib/event-content";
import { googleFontsHref, themeBySlug } from "@/themes/catalog";
import { Invitation } from "@/components/invitation/Invitation";
import type { EventRow } from "@/server/repo/events";

export const metadata = { title: "Theme preview" };

/** Any theme with sample content, for admins and clients choosing a design. */
export default async function ThemePreview({ params }: { params: Promise<{ theme: string }> }) {
  await requireUser();
  const { theme } = await params;
  const t = themeBySlug(theme);
  if (!t) notFound();
  const content = defaultContent({ p1en: "Sara", p2en: "Omar", p1ar: "سارة", p2ar: "عمر" });
  content.families = { en: "The Al Harthy & Al Balushi families", ar: "آل الحارثي وآل البلوشي" };
  content.venue.name = { en: "The Grand Ballroom", ar: "القاعة الكبرى" };
  const rsvp = defaultRsvpConfig();
  rsvp.notices = rsvp.notices.map((n) => ({ ...n, mode: "show" as const }));
  const startsAt = new Date(Date.now() + 40 * 86400_000);
  const ev = { id: "00000000-0000-0000-0000-000000000000", accountId: "sample", slug: "sample", themeSlug: t.slug, type: "WEDDING", status: "PUBLISHED", startsAt, endsAt: null, content, rsvpConfig: rsvp } as unknown as EventRow;
  const data = await buildInvitationData(ev, defaultEntitlements("ROYAL_SEAL", "ATELIER"), { mode: "sample", guest: { name: "Ahmed Al Harthy & family", allowedCompanions: 3 } });
  data.music = { kind: "builtin", preset: t.tier === "ROYAL_SEAL" ? "royal-strings" : "hijaz-qanun" };
  return <><link rel="stylesheet" href={googleFontsHref(t)} /><Invitation data={data} /></>;
}
