import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireStaff } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { mediaUrl } from "@/server/storage";
import { ART_SLOTS, ART_SLOT_INFO, bundledArt, themeBySlug } from "@/themes/catalog";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { removeThemeArtAction, uploadThemeArtAction } from "../../actions";

export const metadata = { title: "Theme artwork" };

const RATIO: Record<string, string> = { video: "9 / 16", relief: "9 / 16", cover: "9 / 16", reveal: "9 / 16", texture: "1 / 1", venue: "4 / 3", closing: "4 / 5", dressHer: "3 / 4", dressHim: "3 / 4" };

export default async function ThemeArtPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireStaff();
  const { slug } = await params;
  const t = themeBySlug(slug);
  if (!t) notFound();
  const db = await getDb();
  const row = await db.query.themes.findFirst({ where: eq(schema.themes.slug, slug) });
  const art = row?.art ?? {};
  const bundled = bundledArt(t);
  return (
    <>
      <div className="crumbs"><a href="/admin/themes">Themes</a> / {t.name.en}</div>
      <div className="page-head">
        <div className="stack-sm">
          <h1>{t.name.en} <span className="ar" lang="ar" style={{ fontSize: 30, color: "var(--gold-t)" }}>{t.name.ar}</span></h1>
          <p className="muted" style={{ margin: 0, maxWidth: 720 }}>Every theme ships with licensed photography (Pexels / Unsplash licence). Upload your own to replace any slot. JPG, PNG, WebP or HEIC up to 15 MB. Images are re-encoded at up to 2400 px and their metadata is removed. Once the opening cover is uploaded, guests get the photo opening ({t.interaction === "seal" ? "press and hold the wax seal" : t.interaction === "ribbon" ? "untie the ribbon" : t.interaction === "curtain" ? "part the curtain" : "open the gatefold"}) with the revealed scene behind it. Without a cover, they see the 3D {t.opening}.</p>
        </div>
        <a className="btn btn-ghost" href={`/preview/${t.slug}`} target="_blank" rel="noopener">Preview theme</a>
      </div>
      <div className="grid-3">
        {ART_SLOTS.map((slot) => {
          const id = art[slot];
          const src = id ? mediaUrl(id) : bundled[slot];
          return (
            <section key={slot} className="card stack-sm" style={{ padding: 18 }}>
              <div className="row between"><strong>{ART_SLOT_INFO[slot].label}</strong>{id ? <span className="badge ok">Uploaded</span> : bundled[slot] ? <span className="badge">Bundled</span> : <span className="badge">Empty</span>}</div>
              <div className="tiny muted">{ART_SLOT_INFO[slot].hint}</div>
              <div style={{ aspectRatio: RATIO[slot], borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", background: "var(--sand)", maxHeight: 360, display: "grid", placeItems: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && slot === "video" ? <video src={src} muted loop playsInline autoPlay style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : src ? <img src={src} alt={`${ART_SLOT_INFO[slot].label} for ${t.name.en}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", background: `radial-gradient(120% 90% at 50% 10%, ${t.palette.glow}, ${t.palette.night} 60%, ${t.palette.night2})` }} />}
              </div>
              <ActionForm action={uploadThemeArtAction} className="stack-sm" resetOnOk>
                <input type="hidden" name="slug" value={t.slug} /><input type="hidden" name="slot" value={slot} />
                <label className="sr-only" htmlFor={`f-${slot}`}>{ART_SLOT_INFO[slot].label}</label>
                <input id={`f-${slot}`} className="input" style={{ paddingTop: 10 }} type="file" name="file" accept={slot === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/heic"} required />
                <div className="row"><SubmitButton className="btn btn-primary btn-sm" pending="Uploading…">{id ? "Replace" : "Upload"}</SubmitButton></div>
              </ActionForm>
              {id && <form action={removeThemeArtAction}><input type="hidden" name="slug" value={t.slug} /><input type="hidden" name="slot" value={slot} /><button className="btn btn-danger btn-sm" type="submit">{bundled[slot] ? "Remove upload (use bundled)" : "Remove"}</button></form>}
            </section>
          );
        })}
      </div>
    </>
  );
}
