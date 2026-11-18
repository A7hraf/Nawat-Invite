import type { Metadata } from "next";
import { HttpError } from "@/server/request";
import { loadPublicEvent } from "@/server/services/rsvp";
import { buildInvitationData } from "@/server/invitation";
import { googleFontsHref } from "@/themes/catalog";
import { Invitation } from "@/components/invitation/Invitation";
import { ENDED, InviteMessage, NOT_FOUND, PERSONAL } from "../invite-message";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invitation", robots: { index: false, follow: false } };

/** The open link (for group chats), if the hosts enabled it. */
export default async function OpenInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { ev, ent } = await loadPublicEvent(slug);
    if (!ev.openLinkEnabled || !ent.invitations.openLinkAllowed) return <InviteMessage {...PERSONAL} />;
    const data = await buildInvitationData(ev, ent, { mode: "live" });
    return <><link rel="stylesheet" href={googleFontsHref(data.theme)} /><Invitation data={data} /></>;
  } catch (e) {
    if (e instanceof HttpError) return <InviteMessage {...(e.status === 410 ? ENDED : NOT_FOUND)} />;
    throw e;
  }
}
