import type { Entitlements } from "@/lib/entitlements";
import type { BrandSettings } from "@/lib/brand";
import { Switch } from "@/components/ui/form";

type Get = (e: Entitlements) => boolean | number | string;
type Row = { name: string; label: string; desc: string; kind: "bool" | "num" | "access"; get: Get; min?: number; max?: number; step?: number };

export function entitlementRows(tierNames: BrandSettings["tierNames"]): { title: string; rows: Row[] }[] {
  return [
    { title: "Themes", rows: [
      { name: "themes.IVORY", label: `${tierNames.IVORY.en} themes`, desc: "Classic animated cards", kind: "bool", get: (e) => e.themes.tiers.includes("IVORY") },
      { name: "themes.GILDED", label: `${tierNames.GILDED.en} themes`, desc: "3D envelope, palace doors, curtains", kind: "bool", get: (e) => e.themes.tiers.includes("GILDED") },
      { name: "themes.ROYAL_SEAL", label: `${tierNames.ROYAL_SEAL.en} themes`, desc: "Cinematic signature themes", kind: "bool", get: (e) => e.themes.tiers.includes("ROYAL_SEAL") },
    ] },
    { title: "Invitations", rows: [
      { name: "invitations.maxGuestPasses", label: "Guest passes", desc: "People they can send a link to", kind: "num", get: (e) => e.invitations.maxGuestPasses, min: 0, max: 20000, step: 10 },
      { name: "invitations.maxEvents", label: "Invitations", desc: "e.g. engagement + wedding", kind: "num", get: (e) => e.invitations.maxEvents, min: 1, max: 50 },
      { name: "invitations.openLinkAllowed", label: "Open public link", desc: "One link for group chats", kind: "bool", get: (e) => e.invitations.openLinkAllowed },
      { name: "invitations.bilingual", label: "Arabic + English", desc: "Guests switch language", kind: "bool", get: (e) => e.invitations.bilingual },
    ] },
    { title: "Music", rows: [
      { name: "music.enabled", label: "Background music", desc: "Plays after the opening tap", kind: "bool", get: (e) => e.music.enabled },
      { name: "music.trialLimit", label: "Tracks they can try", desc: "Distinct tracks applied to the invitation (999 = unlimited)", kind: "num", get: (e) => e.music.trialLimit, min: 0, max: 999 },
      { name: "music.allowUpload", label: "Upload own music", desc: "MP3 or M4A, up to 10 MB", kind: "bool", get: (e) => e.music.allowUpload },
    ] },
    { title: "RSVP form", rows: [
      { name: "rsvp.enabled", label: "RSVP", desc: "Attend or decline", kind: "bool", get: (e) => e.rsvp.enabled },
      { name: "rsvp.fieldName", label: "Name field", desc: "Host sets off, optional or required", kind: "bool", get: (e) => e.rsvp.fieldName },
      { name: "rsvp.fieldPhone", label: "Phone field", desc: "Validated Omani / international numbers", kind: "bool", get: (e) => e.rsvp.fieldPhone },
      { name: "rsvp.fieldCompanions", label: "Companions count", desc: "Limited per guest", kind: "bool", get: (e) => e.rsvp.fieldCompanions },
      { name: "rsvp.fieldNote", label: "Note to hosts", desc: "Up to 300 characters", kind: "bool", get: (e) => e.rsvp.fieldNote },
      { name: "rsvp.customQuestions", label: "Custom questions", desc: "Short-answer questions", kind: "num", get: (e) => e.rsvp.customQuestions, min: 0, max: 10 },
      { name: "rsvp.notices", label: "Notices", desc: "No children, no photos, dress code…", kind: "bool", get: (e) => e.rsvp.notices },
    ] },
    { title: "Entrance", rows: [
      { name: "checkin.qrPass", label: "QR entry pass", desc: "Issued when a guest attends", kind: "bool", get: (e) => e.checkin.qrPass },
      { name: "checkin.gatekeepers", label: "Gatekeeper logins", desc: "Scanner-only accounts", kind: "num", get: (e) => e.checkin.gatekeepers, min: 0, max: 50 },
    ] },
    { title: "Media, reports & studio", rows: [
      { name: "media.photos", label: "Gallery photos", desc: "Re-encoded, location data removed", kind: "num", get: (e) => e.media.photos, min: 0, max: 60 },
      { name: "media.storageMb", label: "Storage (MB)", desc: "Photos and music", kind: "num", get: (e) => e.media.storageMb, min: 10, max: 20000, step: 10 },
      { name: "reports.exportPdf", label: "PDF report", desc: "Arabic-correct layout", kind: "bool", get: (e) => e.reports.exportPdf },
      { name: "reports.exportExcel", label: "Excel report", desc: "Full guest table", kind: "bool", get: (e) => e.reports.exportExcel },
      { name: "studio.access", label: "Studio access", desc: "Full editor, view-only (Concierge) or none", kind: "access", get: (e) => e.studio.access },
    ] },
  ];
}

/** Every feature switch. When `base` is given, rows that differ are marked as overrides. */
export function EntitlementFields({ value, base, tierNames, disabled }: { value: Entitlements; base?: Entitlements; tierNames: BrandSettings["tierNames"]; disabled?: boolean }) {
  return (
    <div className="grid-2">
      {entitlementRows(tierNames).map((g) => (
        <section key={g.title} className="card" style={{ padding: "18px 22px 6px" }}>
          <div className="kicker" style={{ marginBottom: 4 }}>{g.title}</div>
          {g.rows.map((r) => {
            const v = r.get(value);
            const isOverride = base ? r.get(base) !== v : false;
            return (
              <div key={r.name} className={`opt-row${isOverride ? " override" : ""}`}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="t"><label htmlFor={r.name}>{r.label}</label></div>
                  <div className="d">{r.desc}{isOverride && base ? ` · override (plan: ${String(r.get(base))})` : ""}</div>
                </div>
                {r.kind === "bool" && <Switch name={r.name} defaultChecked={Boolean(v)} disabled={disabled} label={r.label} />}
                {r.kind === "num" && <input id={r.name} className="input" style={{ width: 110, height: 40 }} type="number" name={r.name} defaultValue={Number(v)} min={r.min} max={r.max} step={r.step ?? 1} disabled={disabled} />}
                {r.kind === "access" && (
                  <select id={r.name} className="input" style={{ width: 150, height: 40 }} name={r.name} defaultValue={String(v)} disabled={disabled}>
                    <option value="FULL">Full studio</option><option value="READ_ONLY">View only</option><option value="NONE">No access</option>
                  </select>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
