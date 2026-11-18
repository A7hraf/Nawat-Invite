import { requireSuperAdmin } from "@/server/auth/context";
import { getBrandSettings } from "@/server/settings";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { saveSettingsAction } from "../actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireSuperAdmin();
  const b = await getBrandSettings();
  const tiers = ["IVORY", "GILDED", "ROYAL_SEAL"] as const;
  return (
    <>
      <div className="stack-sm"><div className="kicker">Control Room</div><h1>Settings</h1></div>
      <ActionForm action={saveSettingsAction}>
        <section className="card stack">
          <div className="stack-sm"><h2>Invitation footer</h2><p className="muted small" style={{ margin: 0 }}>Shown at the bottom of every invitation. Clients cannot remove it.</p></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="website">Website</label><input className="input" id="website" name="website" type="url" defaultValue={b.footer.website} required /></div>
            <div className="field"><label htmlFor="instagram">Instagram</label><input className="input" id="instagram" name="instagram" type="url" defaultValue={b.footer.instagram} required /></div>
            <div className="field"><label htmlFor="phone">Phone</label><input className="input" id="phone" name="phone" defaultValue={b.footer.phone} required dir="ltr" /><span className="hint">Omani numbers have 8 digits after +968.</span></div>
          </div>
        </section>
        <section className="card stack">
          <div className="stack-sm"><h2>Tier names</h2><p className="muted small" style={{ margin: 0 }}>Rename the theme levels everywhere in the system.</p></div>
          {tiers.map((t) => (
            <div key={t} className="form-grid">
              <div className="field"><label htmlFor={`${t}.en`}>{t.replace("_", " ")} · English</label><input className="input" id={`${t}.en`} name={`${t}.en`} defaultValue={b.tierNames[t].en} required maxLength={40} /></div>
              <div className="field"><label htmlFor={`${t}.ar`}>{t.replace("_", " ")} · Arabic</label><input className="input" id={`${t}.ar`} name={`${t}.ar`} defaultValue={b.tierNames[t].ar} dir="rtl" lang="ar" required maxLength={40} /></div>
            </div>
          ))}
        </section>
        <div><SubmitButton className="btn btn-gold">Save settings</SubmitButton></div>
      </ActionForm>
    </>
  );
}
