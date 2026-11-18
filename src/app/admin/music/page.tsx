import { desc } from "drizzle-orm";
import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { getBrandSettings } from "@/server/settings";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { toggleTrackAction, uploadMusicAction } from "../actions";

export const metadata = { title: "Music library" };

export default async function MusicPage() {
  await requireStaff();
  const db = await getDb();
  const tracks = await db.select().from(schema.musicTracks).orderBy(desc(schema.musicTracks.createdAt));
  const brand = await getBrandSettings();
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Music library</h1><p className="muted" style={{ margin: 0 }}>Tracks clients can choose. Only add music you hold a licence for. Built-in melodies are generated in the guest’s browser.</p></div>
      <div className="grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))" }}>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 520 }}>
            <thead><tr><th>Track</th><th>From tier</th><th>Source</th><th></th></tr></thead>
            <tbody>{tracks.map((t) => (
              <tr key={t.id}>
                <td><strong>{t.titleEn}</strong><div className="tiny muted"><span lang="ar" className="ar">{t.titleAr}</span>{t.mood ? ` · ${t.mood}` : ""}</div>
                  {t.assetId && <audio controls preload="none" src={`/media/${t.assetId}`} style={{ height: 32, marginTop: 6, maxWidth: 240 }} />}</td>
                <td>{brand.tierNames[t.minTier].en}</td>
                <td className="small">{t.builtin ? "Built-in" : "Uploaded"}</td>
                <td><form action={toggleTrackAction}><input type="hidden" name="trackId" value={t.id} /><button className={`btn btn-sm ${t.active ? "btn-ghost" : "btn-primary"}`} type="submit">{t.active ? "Hide" : "Show"}</button></form></td>
              </tr>))}</tbody>
          </table>
        </div>
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Add a track</h2>
          <ActionForm action={uploadMusicAction} resetOnOk>
            <div className="field"><label htmlFor="file">Audio file (MP3 or M4A, max 10 MB)</label><input className="input" style={{ paddingTop: 10 }} id="file" name="file" type="file" accept="audio/mpeg,audio/mp4,.mp3,.m4a" required /></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="titleEn">Title (English)</label><input className="input" id="titleEn" name="titleEn" required /></div>
              <div className="field"><label htmlFor="titleAr">Title (Arabic)</label><input className="input" id="titleAr" name="titleAr" dir="rtl" lang="ar" required /></div>
              <div className="field"><label htmlFor="mood">Mood</label><input className="input" id="mood" name="mood" placeholder="Oud · romantic" /></div>
              <div className="field"><label htmlFor="minTier">Available from</label><select className="input" id="minTier" name="minTier" defaultValue="GILDED"><option value="IVORY">{brand.tierNames.IVORY.en}</option><option value="GILDED">{brand.tierNames.GILDED.en}</option><option value="ROYAL_SEAL">{brand.tierNames.ROYAL_SEAL.en}</option></select></div>
            </div>
            <div className="field"><label htmlFor="licence">Licence reference</label><input className="input" id="licence" name="licence" required placeholder="Invoice no., licence ID…" /></div>
            <div><SubmitButton pending="Uploading…">Add to library</SubmitButton></div>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
