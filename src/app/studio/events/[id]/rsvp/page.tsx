import { redirect } from "next/navigation";
import { studioEvent } from "@/server/studio";
import { parseRsvpConfig } from "@/lib/event-content";
import { ActionForm, Segmented, SubmitButton, Switch } from "@/components/ui/form";
import { BiField } from "@/components/bi-field";
import { saveRsvpAction } from "../../../actions";

const STATES = [{ value: "off", label: "Off" }, { value: "optional", label: "Optional" }, { value: "required", label: "Required" }];
const MODES = [{ value: "off", label: "Hidden" }, { value: "show", label: "Display" }, { value: "must", label: "Must tick" }];

export default async function RsvpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ev } = await studioEvent(id);
  if (ctx.readOnly) redirect(`/studio/events/${ev.id}`);
  const cfg = parseRsvpConfig(ev.rsvpConfig);
  const r = ctx.ent.rsvp;
  const fields: { key: keyof typeof cfg.fields; label: string; desc: string; allowed: boolean }[] = [
    { key: "name", label: "Name", desc: "Pre-filled on personal links. Open links always ask for a name.", allowed: r.fieldName },
    { key: "phone", label: "Phone number", desc: "Oman +968 by default, validated", allowed: r.fieldPhone },
    { key: "companions", label: "Companions", desc: "Up to each guest’s allowance (set per guest)", allowed: r.fieldCompanions },
    { key: "note", label: "Note to the hosts", desc: "Up to 300 characters", allowed: r.fieldNote },
  ];
  const notices = Array.from({ length: 5 }, (_, i) => cfg.notices[i] ?? { id: "", kind: "custom" as const, text: { en: "", ar: "" }, mode: "off" as const });
  const questions = Array.from({ length: r.customQuestions }, (_, i) => cfg.questions[i] ?? { id: "", label: { en: "", ar: "" }, required: false });
  return (
    <ActionForm action={saveRsvpAction}>
      <input type="hidden" name="eventId" value={ev.id} />
      {!r.enabled && <div className="notice warn">Replies are not part of your plan.</div>}
      <section className="card">
        <div className="stack-sm" style={{ marginBottom: 6 }}><h2>What guests fill in</h2><p className="small muted" style={{ margin: 0 }}>Turn every field off and guests see one button: <em>I will attend</em>. Attending guests receive their QR pass.</p></div>
        {fields.map((f) => (
          <div key={f.key} className="opt-row">
            <div><div className="t">{f.label}</div><div className="d">{f.allowed ? f.desc : "Not included in your plan"}</div></div>
            <Segmented name={`f.${f.key}`} label={f.label} options={STATES} value={f.allowed ? cfg.fields[f.key] : "off"} disabled={!f.allowed} />
          </div>
        ))}
        <div className="opt-row">
          <div><div className="t">Reply deadline</div><div className="d">After this date the form closes politely</div></div>
          <input className="input" type="date" name="deadline" defaultValue={cfg.deadline ?? ""} style={{ width: 190 }} aria-label="Reply deadline" />
        </div>
        <div className="opt-row"><div><div className="t">Guests can change their reply</div><div className="d">Through the same link, until the deadline</div></div><Switch name="allowChange" defaultChecked={cfg.allowChange} label="Allow changing replies" /></div>
        <div className="opt-row">
          <div><div className="t">Open link for group chats</div><div className="d">{ctx.ent.invitations.openLinkAllowed ? "One shareable link. Each reply uses a guest pass." : "Not included in your plan"}</div></div>
          <div className="row"><label className="small" htmlFor="olm">Max companions</label><input id="olm" className="input" type="number" min={0} max={20} name="openLinkMaxCompanions" defaultValue={cfg.openLinkMaxCompanions} style={{ width: 80, height: 40 }} /><Switch name="openLink" defaultChecked={ev.openLinkEnabled} disabled={!ctx.ent.invitations.openLinkAllowed} label="Open link" /></div>
        </div>
      </section>

      <section className="card stack">
        <div className="stack-sm"><h2>Notices</h2><p className="small muted" style={{ margin: 0 }}>{r.notices ? "Display a rule on the invitation, or ask guests to tick it before replying." : "Notices are not included in your plan."}</p></div>
        {notices.map((n, i) => (
          <div key={i} className="stack-sm" style={{ borderTop: i ? "1px solid var(--line-2)" : 0, paddingTop: i ? 14 : 0 }}>
            <input type="hidden" name={`n${i}.id`} value={n.id} />
            <div className="row between">
              <select className="input" name={`n${i}.kind`} defaultValue={n.kind} style={{ width: 200, height: 40 }} aria-label="Notice type">
                <option value="children">No children</option><option value="photography">No photography</option><option value="dress">Dress code</option><option value="ladies">Ladies only</option><option value="custom">Custom</option>
              </select>
              <Segmented name={`n${i}.mode`} label="Notice mode" options={MODES} value={n.mode} disabled={!r.notices} />
            </div>
            <BiField name={`n${i}.text`} label="Text" value={n.text} maxLength={160} />
          </div>
        ))}
      </section>

      {questions.length > 0 && (
        <section className="card stack">
          <div className="stack-sm"><h2>Custom questions</h2><p className="small muted" style={{ margin: 0 }}>Up to {r.customQuestions}. Leave empty to skip.</p></div>
          {questions.map((q, i) => (
            <div key={i} className="stack-sm">
              <input type="hidden" name={`q${i}.id`} value={q.id} />
              <BiField name={`q${i}.label`} label={`Question ${i + 1}`} value={q.label} maxLength={160} />
              <label className="check small"><input type="checkbox" name={`q${i}.required`} defaultChecked={q.required} />Required</label>
            </div>
          ))}
        </section>
      )}
      <div><SubmitButton className="btn btn-gold">Save reply form</SubmitButton></div>
    </ActionForm>
  );
}
