import type { Metadata } from "next";
import { HttpError } from "@/server/request";
import { findGuest, loadPublicEvent, recordOpen, replyForGuest } from "@/server/services/rsvp";
import { buildInvitationData } from "@/server/invitation";
import { ThemeFonts } from "@/components/invitation/ThemeFonts";
import { Invitation } from "@/components/invitation/Invitation";
import { ENDED, InviteMessage, NOT_FOUND } from "../../invite-message";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** A guest's personal link: greets them by name and knows their seat allowance. */
export default async function PersonalInvitation({ params }: { params: Promise<{ slug: string; guestKey: string }> }) {
  const { slug, guestKey } = await params;
  try {
    const { ev, ent } = await loadPublicEvent(slug);
    const guest = await findGuest(ev.id, guestKey);
    if (!guest) return <InviteMessage {...NOT_FOUND} />;
    await recordOpen(guest.id);
    const reply = await replyForGuest(guest.id);
    const data = await buildInvitationData(ev, ent, { mode: "live", guestKey, guest: { name: guest.name, allowedCompanions: guest.allowedCompanions }, reply });
    return <><ThemeFonts theme={data.theme} /><Invitation data={data} /></>;
  } catch (e) {
    if (e instanceof HttpError) return <InviteMessage {...(e.status === 410 ? ENDED : NOT_FOUND)} />;
    throw e;
  }
}
