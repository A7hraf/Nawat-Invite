import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSession, isStaffRole } from "@/server/auth/session";
import { loadAccount } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { audit } from "@/server/audit";
import { rateLimit } from "@/server/ratelimit";
import { buildReport } from "@/server/reports/data";
import { reportHtml } from "@/server/reports/html";
import { htmlToPdf } from "@/server/reports/pdf";
import { reportXlsx } from "@/server/reports/xlsx";
import { getBrandSettings } from "@/server/settings";
import { UserError } from "@/lib/errors";
import { slugify } from "@/server/repo/events";

export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Sign in required", { status: 401 });
  const needsMfa = isStaffRole(s.user.role) || s.user.totpEnabled;
  if ((needsMfa && !s.session.mfaPassed) || s.user.mustChangePassword) return new Response("Finish signing in first", { status: 401 });
  const { eventId } = await params;
  if (!z.string().uuid().safeParse(eventId).success) return new Response("Not found", { status: 404 });
  const format = new URL(req.url).searchParams.get("format") ?? "pdf";
  if (!["pdf", "xlsx", "html"].includes(format)) return new Response("Unknown format", { status: 400 });

  const db = await getDb();
  const ev = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!ev) return new Response("Not found", { status: 404 });
  const staff = isStaffRole(s.user.role);
  if (!staff && !(s.user.role === "CLIENT" && s.user.accountId === ev.accountId)) return new Response("Not found", { status: 404 });
  if (!staff) {
    const acc = await loadAccount(ev.accountId);
    if (!acc) return new Response("Not found", { status: 404 });
    if (format === "pdf" && !acc.ent.reports.exportPdf) return new Response("PDF reports are not part of your plan", { status: 403 });
    if (format === "xlsx" && !acc.ent.reports.exportExcel) return new Response("Excel reports are not part of your plan", { status: 403 });
    if (format === "html" && !acc.ent.reports.exportPdf && !acc.ent.reports.exportExcel) return new Response("Reports are not part of your plan", { status: 403 });
  }
  if (!(await rateLimit(`report:${s.user.id}`, 20, 600))) return new Response("Too many downloads. Try again in a few minutes.", { status: 429 });

  const rep = await buildReport(ev);
  await audit({ id: s.user.id, name: s.user.displayName, actingAsAccountId: s.session.actingAsAccountId }, `report.${format}`, "event", ev.id, { rows: rep.rows.length });
  const name = `${slugify(ev.title)}-guests-${new Date().toISOString().slice(0, 10)}`;
  const common = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    if (format === "xlsx") {
      const buf = await reportXlsx(ev, rep);
      return new Response(new Uint8Array(buf), { headers: { ...common, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
    }
    const html = reportHtml(ev, rep, await getBrandSettings());
    if (format === "html") return new Response(html, { headers: { ...common, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com" } });
    const pdf = await htmlToPdf(html);
    return new Response(new Uint8Array(pdf), { headers: { ...common, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"` } });
  } catch (e) {
    if (e instanceof UserError) return new Response(e.message, { status: 503 });
    console.error(e);
    return new Response("Could not create the report", { status: 500 });
  }
}
