import "server-only";
import ExcelJS from "exceljs";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { EventRow } from "../repo/events";
import type { Report } from "./data";

/** Neutralise spreadsheet formula injection in guest-provided text. */
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export async function reportXlsx(ev: EventRow, rep: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nawat Invites";
  wb.created = rep.generatedAt;
  const ink = "FF16110F", gold = "FFC9A45C", ivory = "FFF7F2EA";

  const sum = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  sum.columns = [{ width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  sum.addRow([ev.title]).font = { size: 18, bold: true, color: { argb: ink } };
  sum.addRow([`${fmtDate(ev.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} · generated ${fmtDateTime(rep.generatedAt)}`]).font = { color: { argb: "FF6E6259" } };
  sum.addRow([]);
  const s = rep.stats;
  for (const [k, v] of [["Invited (personal links)", s.invited], ["Opened the invitation", s.opened], ["Attending (replies)", s.attending], ["Companions", s.companions], ["Expected guests", s.expected], ["Declined", s.declined], ["Arrived at the door", s.arrived]] as const) {
    const r = sum.addRow([k, v]); r.getCell(1).font = { color: { argb: "FF4F443C" } }; r.getCell(2).font = { bold: true, size: 13 };
  }
  sum.addRow([]);
  const h = sum.addRow(["By side", "Invited", "Attending", "People", "Arrived"]);
  h.eachCell((c) => { c.font = { bold: true, color: { argb: ivory } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ink } }; });
  for (const x of rep.sides) sum.addRow([x.side, x.invited, x.attending, x.people, x.arrived]);

  const g = wb.addWorksheet("Guests", { views: [{ state: "frozen", ySplit: 1 }] });
  g.columns = [
    { header: "Name", key: "name", width: 32 }, { header: "Phone", key: "phone", width: 16 }, { header: "Side", key: "side", width: 10 },
    { header: "Group", key: "group", width: 18 }, { header: "Seats allowed", key: "allowed", width: 13 }, { header: "Status", key: "status", width: 12 },
    { header: "Coming", key: "coming", width: 9 }, { header: "Arrived", key: "arrived", width: 9 }, { header: "Note", key: "note", width: 40 },
    { header: "Answers", key: "answers", width: 40 }, { header: "Source", key: "source", width: 14 },
  ];
  g.getRow(1).eachCell((c) => { c.font = { bold: true, color: { argb: ink } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: gold } }; });
  for (const r of rep.rows) g.addRow({ ...r, name: safe(r.name), phone: safe(r.phone), group: safe(r.group), note: safe(r.note), answers: safe(r.answers) });
  g.autoFilter = { from: "A1", to: "K1" };
  const total = g.addRow({ name: "Total", coming: { formula: `SUM(G2:G${rep.rows.length + 1})` }, arrived: { formula: `SUM(H2:H${rep.rows.length + 1})` } });
  total.font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
