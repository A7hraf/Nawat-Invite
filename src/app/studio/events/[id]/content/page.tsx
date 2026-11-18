import { redirect } from "next/navigation";
import { studioEvent } from "@/server/studio";
import { parseContent } from "@/lib/event-content";
import { dateToMuscatLocal } from "@/lib/format";
import { ActionForm, SubmitButton, Switch } from "@/components/ui/form";
import { BiField } from "@/components/bi-field";
import { saveContentAction } from "../../../actions";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (ctx.readOnly) redirect(`/studio/events/${ev.id}`);
  const c = parseContent(ev.content);
  const sched = Array.from({ length: 6 }, (_, i) => c.schedule[i] ?? { time: "", title: { en: "", ar: "" }, detail: { en: "", ar: "" } });
  const bilingual = ctx.ent.invitations.bilingual;
  return (
    <ActionForm action={saveContentAction}>
      <input type="hidden" name="eventId" value={ev.id} />
      <section className="card stack">
        <h2>The celebration</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="title">Title (for you)</label><input className="input" id="title" name="title" defaultValue={ev.title} required maxLength={100} /></div>
          <div className="field"><label htmlFor="type">Occasion</label>
            <select className="input" id="type" name="type" defaultValue={ev.type}><option value="ENGAGEMENT">Engagement</option><option value="WEDDING">Wedding</option><option value="RECEPTION">Reception</option><option value="HENNA">Henna night</option><option value="OTHER">Other</option></select></div>
          <div className="field"><label htmlFor="startsAt">Date & time (Muscat)</label><input className="input" id="startsAt" name="startsAt" type="datetime-local" defaultValue={dateToMuscatLocal(ev.startsAt)} required /></div>
        </div>
        <BiField name="partner1" label="First name" value={c.partner1} maxLength={40} />
        <BiField name="partner2" label="Second name" value={c.partner2} maxLength={40} />
        <BiField name="families" label="Families / hosts" value={c.families} placeholder={{ en: "The Al Harthy & Al Balushi families", ar: "آل الحارثي وآل البلوشي" }} />
        <BiField name="message" label="Invitation message" value={c.message} multiline />
        <label className="check"><input type="checkbox" name="verse" defaultChecked={c.verse} />Show “بسم الله الرحمن الرحيم” at the top</label>
      </section>

      <section className="card stack">
        <h2>Venue</h2>
        <BiField name="venue.name" label="Venue name" value={c.venue.name} placeholder={{ en: "The Grand Ballroom", ar: "القاعة الكبرى" }} />
        <BiField name="venue.address" label="Address" value={c.venue.address} />
        <div className="field"><label htmlFor="mapUrl">Map link</label><input className="input" id="mapUrl" name="venue.mapUrl" type="url" defaultValue={c.venue.mapUrl} placeholder="https://maps.app.goo.gl/…" /><span className="hint">Paste the “Share” link from Google Maps.</span></div>
      </section>

      <section className="card stack">
        <h2>Schedule</h2>
        <p className="small muted" style={{ margin: 0 }}>Leave a row empty to hide it.</p>
        {sched.map((s, i) => (
          <details key={i} className="more" open={i < Math.max(1, c.schedule.length)}>
            <summary>{s.time || s.title.en || s.title.ar ? `${s.time} ${s.title.en || s.title.ar}` : `Row ${i + 1}`}</summary>
            <div className="stack" style={{ paddingTop: 10 }}>
              <div className="field" style={{ maxWidth: 200 }}><label htmlFor={`s${i}.time`}>Time</label><input className="input" id={`s${i}.time`} name={`s${i}.time`} defaultValue={s.time} placeholder="20:00" maxLength={20} /></div>
              <BiField name={`s${i}.title`} label="Moment" value={s.title} maxLength={80} />
              <BiField name={`s${i}.detail`} label="Detail" value={s.detail} maxLength={120} />
            </div>
          </details>
        ))}
      </section>

      <section className="card stack">
        <h2>The letter</h2>
        <p className="small muted" style={{ margin: 0 }}>A few warm lines from you, revealed as the curtain parts. Up to 900 characters.</p>
        <BiField name="letter" label="Letter" value={c.letter} multiline maxLength={900} />
      </section>

      <section className="card stack">
        <h2>Dress code</h2>
        <BiField name="dress.title" label="Title" value={c.dressCode.title} placeholder={{ en: "Black tie", ar: "رسمي" }} maxLength={60} />
        <BiField name="dress.note" label="Note" value={c.dressCode.note} placeholder={{ en: "Soft earth tones are welcome.", ar: "نرحّب بالألوان الترابية الهادئة." }} maxLength={200} />
        <div className="stack-sm">
          <div className="small"><strong>Palette</strong> <span className="muted">· tick the colours to show</span></div>
          {Array.from({ length: 6 }, (_, i) => {
            const col = c.dressCode.colors[i];
            return (
              <div key={i} className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                <label className="check" style={{ minWidth: 70 }}><input type="checkbox" name={`dc${i}.on`} defaultChecked={!!col} />Show</label>
                <input aria-label={`Colour ${i + 1}`} type="color" name={`dc${i}.hex`} defaultValue={col?.hex ?? ["#c9a227", "#efe4cf", "#6b4b3a", "#1c2b3a", "#8a9a7b", "#b76e79"][i]} style={{ width: 48, height: 40, border: 0, background: "none" }} />
                <input className="input" style={{ flex: "1 1 160px" }} aria-label={`Colour ${i + 1} name in English`} name={`dc${i}.name.en`} defaultValue={col?.name.en ?? ""} placeholder="Champagne" maxLength={30} />
                <input className="input" style={{ flex: "1 1 160px" }} aria-label={`Colour ${i + 1} name in Arabic`} name={`dc${i}.name.ar`} defaultValue={col?.name.ar ?? ""} placeholder="شامبين" dir="rtl" lang="ar" maxLength={30} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <h2>Questions guests ask</h2>
        <p className="small muted" style={{ margin: 0 }}>Parking, timing, gifts. Leave a row empty to hide it.</p>
        {Array.from({ length: 6 }, (_, i) => c.faq[i] ?? { q: { en: "", ar: "" }, a: { en: "", ar: "" } }).map((f, i) => (
          <details key={i} className="more" open={i < Math.max(1, c.faq.length)}>
            <summary>{f.q.en || f.q.ar || `Question ${i + 1}`}</summary>
            <div className="stack" style={{ paddingTop: 10 }}>
              <BiField name={`q${i}.q`} label="Question" value={f.q} maxLength={120} />
              <BiField name={`q${i}.a`} label="Answer" value={f.a} maxLength={300} multiline />
            </div>
          </details>
        ))}
      </section>

      <section className="card stack">
        <h2>Sections & languages</h2>
        <div className="grid-2">
          <div>
            {([["letter", "The letter"], ["countdown", "Live countdown"], ["schedule", "Schedule"], ["venue", "Venue & map"], ["dress", "Dress code"], ["notices", "Notices"], ["faq", "Questions"], ["gallery", "Photo gallery"], ["closing", "Closing image"]] as const).map(([k, l]) => (
              <div key={k} className="opt-row"><span className="t">{l}</span><Switch name={`sec.${k}`} defaultChecked={c.sections[k]} label={l} disabled={k === "gallery" && ctx.ent.media.photos === 0} /></div>
            ))}
          </div>
          <div className="stack">
            <div className="opt-row"><span className="t">Arabic</span><Switch name="loc.ar" defaultChecked={c.locales.includes("ar")} label="Arabic" /></div>
            <div className="opt-row"><div><div className="t">English</div>{!bilingual && <div className="d">Your plan includes one language.</div>}</div><Switch name="loc.en" defaultChecked={c.locales.includes("en")} label="English" /></div>
            <div className="field"><label htmlFor="defaultLocale">Opens in</label><select className="input" id="defaultLocale" name="defaultLocale" defaultValue={c.defaultLocale}><option value="ar">العربية</option><option value="en">English</option></select></div>
          </div>
        </div>
      </section>
      <div><SubmitButton className="btn btn-gold">Save details</SubmitButton></div>
    </ActionForm>
  );
}
