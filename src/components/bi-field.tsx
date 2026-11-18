import type { Bi } from "@/lib/event-content";

/** An English + Arabic pair of inputs for one piece of text. */
export function BiField({ name, label, value, multiline, maxLength = 400, placeholder }: { name: string; label: string; value: Bi; multiline?: boolean; maxLength?: number; placeholder?: { en?: string; ar?: string } }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      <div className="field">
        <label htmlFor={`${name}.en`}>{label} <span className="muted" style={{ fontWeight: 500 }}>· English</span></label>
        <Tag className="input" id={`${name}.en`} name={`${name}.en`} defaultValue={value.en} maxLength={maxLength} placeholder={placeholder?.en} />
      </div>
      <div className="field">
        <label htmlFor={`${name}.ar`}>{label} <span className="muted" style={{ fontWeight: 500 }}>· العربية</span></label>
        <Tag className="input" id={`${name}.ar`} name={`${name}.ar`} defaultValue={value.ar} maxLength={maxLength} dir="rtl" lang="ar" placeholder={placeholder?.ar} />
      </div>
    </div>
  );
}
