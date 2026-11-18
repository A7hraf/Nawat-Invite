import { redirect } from "next/navigation";
import { studioEvent } from "@/server/studio";
import { mediaUrl } from "@/server/storage";
import { parseContent } from "@/lib/event-content";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { removePhotoAction, uploadPhotoAction } from "../../../actions";

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (ctx.readOnly || ctx.ent.media.photos === 0) redirect(`/studio/events/${ev.id}`);
  const c = parseContent(ev.content);
  const full = c.gallery.length >= ctx.ent.media.photos;
  return (
    <div className="stack">
      <section className="card row between">
        <div className="stack-sm"><h2>Gallery</h2><div className="small muted">{c.gallery.length} of {ctx.ent.media.photos} photos. Photos are resized and their location data is removed.</div></div>
        {!full && (
          <ActionForm action={uploadPhotoAction} className="row" resetOnOk>
            <input type="hidden" name="eventId" value={ev.id} />
            <label className="sr-only" htmlFor="file">Photo</label>
            <input className="input" style={{ paddingTop: 10, width: 280 }} id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic" required />
            <SubmitButton pending="Uploading…">Add photo</SubmitButton>
          </ActionForm>
        )}
      </section>
      <div className="grid-3">
        {c.gallery.map((g) => (
          <figure key={g} className="card" style={{ padding: 10, margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(g)} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 14, display: "block" }} />
            <form action={removePhotoAction} style={{ marginTop: 8 }}><input type="hidden" name="eventId" value={ev.id} /><input type="hidden" name="assetId" value={g} /><button className="btn btn-danger btn-sm" type="submit">Remove</button></form>
          </figure>
        ))}
        {c.gallery.length === 0 && <div className="empty card">No photos yet.</div>}
      </div>
    </div>
  );
}
