import { studioEvent } from "@/server/studio";
import { buildInvitationData } from "@/server/invitation";
import { ThemeFonts } from "@/components/invitation/ThemeFonts";
import { Invitation } from "@/components/invitation/Invitation";

/** Shows the invitation exactly as guests will see it, including drafts. Replies are disabled. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  const data = await buildInvitationData(ev, ctx.ent, { mode: "preview", guest: { name: "Ahmed Al Harthy & family", allowedCompanions: 3 } });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, overflow: "auto" }}>
      <ThemeFonts theme={data.theme} />
      <Invitation data={data} />
    </div>
  );
}
