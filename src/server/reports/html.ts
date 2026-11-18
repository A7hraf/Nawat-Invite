import "server-only";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { BrandSettings } from "@/lib/brand";
import type { EventRow } from "../repo/events";
import type { Report } from "./data";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Print-ready HTML for the PDF report (also used by the "print" view). */
export function reportHtml(ev: EventRow, rep: Report, brand: BrandSettings): string {
  const s = rep.stats;
  const stat = (l: string, v: number, dark = false) => `<div class="st${dark ? " dk" : ""}"><div class="l">${esc(l)}</div><div class="v">${v}</div></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(ev.title)} · Guest report</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Manrope:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600&display=swap">
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}body{margin:0;font-family:Manrope,"Noto Naskh Arabic","Noto Sans Arabic",system-ui,sans-serif;color:#16110F;font-size:10.5pt}
.h{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C9A45C;padding-bottom:10px;margin-bottom:16px}
h1{font-family:"Cormorant Garamond",serif;font-weight:500;font-size:28pt;margin:0}
.m{color:#6E6259;font-size:9.5pt}.brand{font-family:"Cormorant Garamond",serif;letter-spacing:.14em;font-size:13pt}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.st{border:1px solid #E7DDCD;border-radius:10px;padding:10px 12px}.st .l{font-size:8.5pt;color:#6E6259}.st .v{font-family:"Cormorant Garamond",serif;font-size:24pt;line-height:1.1}
.st.dk{background:#16110F;color:#F7F2EA;border-color:#16110F}.st.dk .l{color:#C9BBA9}
h2{font-family:"Cormorant Garamond",serif;font-weight:500;font-size:16pt;margin:14px 0 6px}
table{width:100%;border-collapse:collapse}th{text-align:start;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#6E6259;background:#FAF6EF;padding:6px 8px;border-bottom:1px solid #E7DDCD}
td{padding:6px 8px;border-bottom:1px solid #F1EADF;vertical-align:top}tr{page-break-inside:avoid}
.b{display:inline-block;padding:1px 7px;border-radius:99px;font-size:8pt;font-weight:700;background:#EFEBE6}.ok{background:#E3EFE8;color:#2F6B4F}.bad{background:#F4E3E3;color:#8C2F2F}
.note{color:#7A5A22;font-size:9pt}.f{margin-top:18px;font-size:8.5pt;color:#6E6259;display:flex;justify-content:space-between}
</style></head><body>
<div class="h"><div><div class="m">GUEST REPORT</div><h1>${esc(ev.title)}</h1><div class="m">${esc(fmtDate(ev.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }))}</div></div>
<div style="text-align:end"><div class="brand">NAWAT <i>Invites</i></div><div class="m">Generated ${esc(fmtDateTime(rep.generatedAt))}</div></div></div>
<div class="g">${stat("Invited", s.invited)}${stat("Opened", s.opened)}${stat("Attending replies", s.attending)}${stat("Expected guests", s.expected, true)}${stat("Companions", s.companions)}${stat("Declined", s.declined)}${stat("No reply yet", Math.max(0, s.invited - s.attending - s.declined))}${stat("Arrived", s.arrived)}</div>
<h2>By side</h2><table><thead><tr><th>Side</th><th>Invited</th><th>Attending</th><th>People</th><th>Arrived</th></tr></thead><tbody>
${rep.sides.map((x) => `<tr><td>${esc(x.side)}</td><td>${x.invited}</td><td>${x.attending}</td><td>${x.people}</td><td>${x.arrived}</td></tr>`).join("")}</tbody></table>
<h2>Guests</h2><table><thead><tr><th>Name</th><th>Phone</th><th>Side</th><th>Seats</th><th>Status</th><th>Coming</th><th>Arrived</th></tr></thead><tbody>
${rep.rows.map((r) => `<tr><td><div dir="auto">${esc(r.name)}</div>${r.group ? `<div class="m">${esc(r.group)}</div>` : ""}${r.note ? `<div class="note" dir="auto">“${esc(r.note)}”</div>` : ""}${r.answers ? `<div class="m" dir="auto">${esc(r.answers)}</div>` : ""}</td><td dir="ltr">${esc(r.phone)}</td><td>${esc(r.side)}</td><td>${r.allowed || "—"}</td><td><span class="b ${r.status === "Attending" ? "ok" : r.status === "Declined" ? "bad" : ""}">${esc(r.status)}</span></td><td>${r.coming || "—"}</td><td>${r.arrived || "—"}</td></tr>`).join("")}
</tbody></table>
<div class="f"><span>${esc(brand.footer.website)} · ${esc(brand.footer.phone)}</span><span>Confidential: contains personal data of guests.</span></div>
</body></html>`;
}
