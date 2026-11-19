import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/context";
import { buildInvitationData } from "@/server/invitation";
import { defaultEntitlements } from "@/lib/entitlements";
import { defaultContent, defaultRsvpConfig } from "@/lib/event-content";
import { themeBySlug, themeMusicUrl } from "@/themes/catalog";
import { ThemeFonts } from "@/components/invitation/ThemeFonts";
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
  content.dressCode = {
    title: { en: "Evening elegance", ar: "أناقة المساء" }, note: { en: "Soft, warm tones are warmly welcome.", ar: "نرحّب بالألوان الدافئة الهادئة." },
    colors: [
      { hex: "#E9DCC7", name: { en: "Ivory", ar: "عاجي" } }, { hex: "#C9A86A", name: { en: "Champagne", ar: "شامبين" } },
      { hex: "#8C5A4A", name: { en: "Rosewood", ar: "ورد" } }, { hex: "#2E3A33", name: { en: "Forest", ar: "زيتي" } },
    ],
  };
  content.faq = [
    { q: { en: "Is there parking at the venue?", ar: "هل يتوفر موقف للسيارات؟" }, a: { en: "Yes, valet parking is available at the main entrance from 7:30 pm.", ar: "نعم، تتوفر خدمة صف السيارات عند المدخل الرئيسي من الساعة ٧:٣٠ مساءً." } },
    { q: { en: "What time should we arrive?", ar: "متى نصل؟" }, a: { en: "Doors open at 8:00 pm. The zaffa begins at 9:00 pm.", ar: "تُفتح الأبواب الساعة ٨ مساءً، وتبدأ الزفة الساعة ٩ مساءً." } },
  ];
  content.sections.dress = true; content.sections.faq = true;
  const rsvp = defaultRsvpConfig();
  rsvp.notices = rsvp.notices.map((n) => ({ ...n, mode: "show" as const }));
  const startsAt = new Date(Date.now() + 40 * 86400_000);
  const ev = { id: "00000000-0000-0000-0000-000000000000", accountId: "sample", slug: "sample", themeSlug: t.slug, type: "WEDDING", status: "PUBLISHED", startsAt, endsAt: null, content, rsvpConfig: rsvp } as unknown as EventRow;
  const data = await buildInvitationData(ev, defaultEntitlements("ROYAL_SEAL", "ATELIER"), { mode: "sample", guest: { name: "Ahmed Al Harthy & family", allowedCompanions: 3 } });
  data.music = { kind: "file", url: themeMusicUrl(t) };
  return <><ThemeFonts theme={t} /><Invitation data={data} /></>;
}
