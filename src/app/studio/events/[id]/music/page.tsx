import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { studioEvent } from "@/server/studio";
import { getDb, schema } from "@/server/db";
import { tierOk } from "@/server/repo/events";
import { mediaUrl } from "@/server/storage";
import { sourceOfTrack } from "@/server/music";
import { parseContent } from "@/lib/event-content";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { MusicPreview } from "@/components/music-preview";
import { selectMusicAction, uploadOwnMusicAction } from "../../../actions";

export default async function MusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (ctx.readOnly || !ctx.ent.music.enabled) redirect(`/studio/events/${ev.id}`);
  const db = await getDb();
  const content = parseContent(ev.content);
  const library = (await db.select().from(schema.musicTracks).where(eq(schema.musicTracks.active, true))).filter((t) => tierOk(ctx.ent, t.minTier));
  const own = await db.select().from(schema.mediaAssets).where(and(eq(schema.mediaAssets.accountId, ctx.account.id), eq(schema.mediaAssets.kind, "AUDIO")));
  const tried = new Set((await db.select().from(schema.musicTrials).where(eq(schema.musicTrials.accountId, ctx.account.id))).map((t) => t.trackId));
  const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(schema.musicTrials).where(eq(schema.musicTrials.accountId, ctx.account.id));
  const limit = ctx.ent.music.trialLimit;
  const options = [
    ...library.map((t) => ({ id: t.id, title: t.titleEn, sub: `${t.titleAr}${t.mood ? " · " + t.mood : ""}`, source: sourceOfTrack(t) })),
    ...own.map((a) => ({ id: `asset:${a.id}`, title: a.originalName ?? "My upload", sub: "Your upload", source: { kind: "file" as const, url: mediaUrl(a.id) } })),
  ];
  return (
    <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
      <section className="card">
        <div className="card-head"><h2>Choose music</h2><span className="badge gold">{limit >= 999 ? "Unlimited tries" : `${n} of ${limit} tries used`}</span></div>
        <p className="small muted" style={{ marginTop: 0 }}>Listen as often as you like. Each new track you set on the invitation uses one try; going back to a track you tried is free. Music starts when the guest taps to open.</p>
        <ActionForm action={selectMusicAction}>
          <input type="hidden" name="eventId" value={ev.id} />
          <div className="stack-sm">
            <label className="opt-row" style={{ cursor: "pointer" }}><span className="row"><input type="radio" name="trackId" value="none" defaultChecked={!content.music.trackId} /> <span className="t">No music</span></span></label>
            {options.map((o) => (
              <div key={o.id} className="opt-row">
                <label className="row" style={{ cursor: "pointer", flex: 1 }}>
                  <input type="radio" name="trackId" value={o.id} defaultChecked={content.music.trackId === o.id} />
                  <span><span className="t">{o.title}</span>{tried.has(o.id) && <span className="badge ok" style={{ marginInlineStart: 8 }}>tried</span>}<br /><span className="d">{o.sub}</span></span>
                </label>
                <MusicPreview source={o.source} label={o.title} />
              </div>
            ))}
          </div>
          <div><SubmitButton className="btn btn-gold">Use selected music</SubmitButton></div>
        </ActionForm>
      </section>
      {ctx.ent.music.allowUpload && (
        <section className="card">
          <h2 style={{ marginBottom: 10 }}>Upload your own</h2>
          <p className="small muted" style={{ marginTop: 0 }}>MP3 or M4A, up to 10 MB. Only upload music you have the right to use.</p>
          <ActionForm action={uploadOwnMusicAction} resetOnOk>
            <input type="hidden" name="eventId" value={ev.id} />
            <div className="field"><label htmlFor="file">Audio file</label><input className="input" style={{ paddingTop: 10 }} id="file" name="file" type="file" accept="audio/mpeg,audio/mp4,.mp3,.m4a" required /></div>
            <div><SubmitButton pending="Uploading…">Upload</SubmitButton></div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
