import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { getDb, schema } from "@/server/db";
import { sha256 } from "@/server/crypto";
import { env } from "@/server/env";
import { parseContent, pick } from "@/lib/event-content";
import { fmtDate } from "@/lib/format";
import { themeBySlug, THEMES } from "@/themes/catalog";
import { InviteMessage, NOT_FOUND } from "../../i/invite-message";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entry pass", robots: { index: false, follow: false }, referrer: "no-referrer" };

/** The guest's entry pass. The QR in it encodes this page's own URL. */
export default async function PassPage({ params }: { params: Promise<{ passKey: string }> }) {
  const { passKey } = await params;
  if (!/^[A-Za-z0-9]{24}$/.test(passKey)) return <InviteMessage {...NOT_FOUND} />;
  const db = await getDb();
  const rows = await db.select({ pass: schema.passes, rsvp: schema.rsvps, ev: schema.events, guest: schema.guests })
    .from(schema.passes).innerJoin(schema.rsvps, eq(schema.passes.rsvpId, schema.rsvps.id))
    .innerJoin(schema.events, eq(schema.passes.eventId, schema.events.id))
    .leftJoin(schema.guests, eq(schema.rsvps.guestId, schema.guests.id))
    .where(eq(schema.passes.keyHash, sha256(passKey))).limit(1);
  const r = rows[0];
  if (!r || r.pass.revokedAt || r.ev.status === "DRAFT") return <InviteMessage {...NOT_FOUND} />;
  const t = themeBySlug(r.ev.themeSlug) ?? THEMES[0]!;
  const c = parseContent(r.ev.content);
  const url = `${env().APP_URL.replace(/\/$/, "")}/p/${passKey}`;
  const qr = await QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#16110F", light: "#FFFFFF" } });
  const p = t.palette;
  const name = r.guest?.name ?? r.rsvp.name ?? "Guest";
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 20, background: `radial-gradient(120% 60% at 50% 0%, ${p.glow}, ${p.night2} 70%)` }}>
      <div style={{ width: "100%", maxWidth: 380, borderRadius: 26, overflow: "hidden", background: p.paper, color: p.ink, boxShadow: "0 30px 60px rgba(0,0,0,.45)" }}>
        <div style={{ padding: "22px 22px 16px", display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px dashed rgba(0,0,0,.18)" }}>
          <div><div className="kicker" style={{ color: p.accentText, fontSize: 10 }}>Entry pass · بطاقة الدخول</div><div style={{ fontFamily: `'${t.fonts.display}', serif`, fontSize: 26, lineHeight: 1.1, marginTop: 4 }} dir="auto">{name}</div></div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: p.ink, color: p.paper, display: "grid", placeItems: "center", textAlign: "center", flex: "none" }}><div><div style={{ fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1 }}>{r.pass.admitCount}</div><div style={{ fontSize: 9, letterSpacing: ".14em" }}>PEOPLE</div></div></div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div style={{ padding: 24, background: p.paper2, display: "flex", justifyContent: "center" }}><img src={qr} width={220} height={220} alt="QR code for the entrance" /></div>
        <div style={{ padding: "14px 22px 20px", fontSize: 13, display: "grid", gap: 4, borderTop: "1px dashed rgba(0,0,0,.18)" }}>
          <strong>{pick(c.partner1, "en")} & {pick(c.partner2, "en")}</strong>
          <span>{fmtDate(r.ev.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
          <span style={{ color: p.muted }}>{pick(c.venue.name, "en")}</span>
          {r.pass.admittedTotal > 0 && <span style={{ color: "#2F6B4F", fontWeight: 700 }}>{r.pass.admittedTotal} of {r.pass.admitCount} checked in</span>}
        </div>
      </div>
    </main>
  );
}
