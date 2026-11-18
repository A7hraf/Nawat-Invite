"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { pick } from "@/lib/event-content";
import type { InvitationData } from "./types";
import { digits, fillParts, type Locale, type Strings } from "./i18n";

type Reply = NonNullable<InvitationData["reply"]>;

function PassQr({ text }: { text: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { void QRCode.toDataURL(text, { width: 420, margin: 1, errorCorrectionLevel: "M", color: { dark: "#16110F", light: "#FFFFFF" } }).then(setSrc); }, [text]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={210} height={210} alt="QR code for the entrance" style={{ borderRadius: 8 }} /> : <div style={{ width: 210, height: 210 }} />;
}

export function Rsvp({ d, t, lang, dateLabel }: { d: InvitationData; t: Strings; lang: Locale; dateLabel: string }) {
  const storeKey = `nawat-reply-${d.slug}-${d.guestKey ?? "open"}`;
  const [reply, setReply] = useState<Reply | null>(d.reply);
  const [editing, setEditing] = useState(false);
  const [comp, setComp] = useState(Math.min(d.reply?.companions ?? 0, d.rsvp.maxCompanions));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const f = d.rsvp.fields;

  useEffect(() => {
    if (d.guestKey || d.reply) return;
    try { const saved = localStorage.getItem(storeKey); if (saved) setReply(JSON.parse(saved) as Reply); } catch { /* storage unavailable */ }
  }, [d.guestKey, d.reply, storeKey]);

  const disabled = d.mode !== "live" || d.rsvp.closed || !d.rsvp.enabled;
  const seats = (d.guest?.allowedCompanions ?? 0) + 1;
  const greet = d.guest
    ? fillParts(seats > 1 ? t.greetMany : t.greetOne, { name: d.guest.name, seats: digits(seats, lang) })
    : fillParts(d.rsvp.maxCompanions > 0 ? t.greetOpen : t.greetSolo, { n: digits(d.rsvp.maxCompanions, lang) });
  const allOff = f.name === "off" && f.phone === "off" && f.companions === "off" && f.note === "off" && d.rsvp.notices.every((n) => n.mode !== "must") && d.rsvp.questions.length === 0;
  const nameNeeded = !d.guest && true; // open links always ask for a name

  async function submit(status: "ATTENDING" | "DECLINED", form?: HTMLFormElement) {
    setErr(null);
    const fd = form ? new FormData(form) : new FormData();
    const body = {
      slug: d.slug, guestKey: d.guestKey ?? undefined, status, locale: lang,
      name: String(fd.get("name") ?? d.guest?.name ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(), companions: comp, note: String(fd.get("note") ?? "").trim(),
      acknowledged: d.rsvp.notices.filter((n) => n.mode === "must" && fd.get(`ack-${n.id}`) === "on").map((n) => n.id),
      answers: Object.fromEntries(d.rsvp.questions.map((q) => [q.id, String(fd.get(`q-${q.id}`) ?? "").trim()])),
    };
    if (status === "ATTENDING") {
      if ((nameNeeded || f.name === "required") && !d.guest && !body.name) return setErr(`${t.fName} ${t.required}`);
      if (f.phone === "required" && !body.phone) return setErr(`${t.fPhone} ${t.required}`);
      if (body.phone && !/^[+\d][\d\s-]{6,18}$/.test(body.phone)) return setErr(t.errPhone);
      if (d.rsvp.notices.some((n) => n.mode === "must" && !body.acknowledged.includes(n.id))) return setErr(t.errAck);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { error?: string; status?: Reply["status"]; name?: string | null; companions?: number; pass?: Reply["pass"] };
      if (!res.ok) { setErr(json.error ?? t.error); return; }
      const r: Reply = { status: json.status!, name: json.name ?? body.name, companions: json.companions ?? 0, pass: json.pass ?? null };
      setReply(r); setEditing(false);
      if (!d.guestKey) { try { localStorage.setItem(storeKey, JSON.stringify(r)); } catch { /* ignore */ } }
      document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { setErr(t.error); } finally { setBusy(false); }
  }

  if (reply && !editing) {
    const passUrl = reply.pass?.key ? `${d.appUrl.replace(/\/$/, "")}/p/${reply.pass.key}` : null;
    const canChange = d.rsvp.allowChange && !d.rsvp.closed && d.mode === "live";
    if (reply.status === "DECLINED") {
      return (
        <div>
          <h2>{t.miss}</h2>
          <p className="inv-msg">{t.missMsg}</p>
          {canChange && <button className="inv-link" type="button" onClick={() => setEditing(true)}>{t.change}</button>}
        </div>
      );
    }
    const count = reply.pass?.admitCount ?? reply.companions + 1;
    return (
      <div aria-live="polite">
        <div className="inv-ok"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
        <h2>{passUrl ? t.cantWait : t.thanks}</h2>
        <div style={{ fontSize: 13, color: "var(--mutedDark)" }}>{passUrl ? t.reached : t.thanksMsg}</div>
        {passUrl && (
          <>
            <div className="inv-pass" id="pass">
              <div className="top">
                <div><div className="inv-kicker">{t.entryPass}</div><div className="nm">{reply.name || d.guest?.name}</div></div>
                <div className="party"><b>{digits(count, lang)}</b><small>{count === 1 ? t.person : t.people}</small></div>
              </div>
              <div className="qr"><PassQr text={passUrl} /></div>
              <div className="meta"><div><span>{t.date}</span><b>{dateLabel}</b></div><div><span>{t.venue2}</span><b>{pick(d.content.venue.name, lang) || "—"}</b></div></div>
            </div>
            <div className="inv-row2">
              <a className="inv-btn gold" href={d.calendar.google} target="_blank" rel="noopener noreferrer">{t.addCal}</a>
              <a className="inv-btn line" href={passUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--cream)" }}>{t.savePass}</a>
            </div>
            <p className="fine" style={{ marginTop: 14 }}>{t.showAtDoor}</p>
          </>
        )}
        {canChange && <button className="inv-link" type="button" onClick={() => setEditing(true)}>{t.change}</button>}
      </div>
    );
  }

  return (
    <div>
      <div className="inv-kicker reveal">{t.kindlyReply}</div>
      <h2 className="reveal">{t.join}</h2>
      {d.rsvp.deadline && <div className="reveal" style={{ fontSize: 13, color: "var(--mutedDark)" }}>{t.replyBy} {new Intl.DateTimeFormat(lang === "ar" ? "ar-OM" : "en-GB", { day: "numeric", month: "long", timeZone: "Asia/Muscat" }).format(new Date(d.rsvp.deadline + "T12:00:00+04:00"))}</div>}
      <div className="inv-greet reveal">{greet.map((g, i) => (g.bold ? <b key={i}>{g.text}</b> : <span key={i}>{g.text}</span>))}</div>
      {d.rsvp.closed ? <p className="inv-msg">{t.closed}</p> : (
        <form onSubmit={(e) => { e.preventDefault(); void submit("ATTENDING", e.currentTarget); }} noValidate>
          {!d.guest && (
            <div className="f"><label htmlFor="r-name">{t.fName} <span style={{ color: "var(--accent)" }}>*</span></label><input className="fld" id="r-name" name="name" autoComplete="name" maxLength={120} defaultValue={reply?.name ?? ""} /></div>
          )}
          {f.phone !== "off" && (
            <div className="f"><label htmlFor="r-phone">{t.fPhone} {f.phone === "optional" ? <small>{t.optional}</small> : <span style={{ color: "var(--accent)" }}>*</span>}</label>
              <div className="phone"><div className="cc">+968</div><input className="fld" id="r-phone" name="phone" inputMode="tel" autoComplete="tel-national" maxLength={20} placeholder="9XXXXXXX" /></div></div>
          )}
          {f.companions !== "off" && d.rsvp.maxCompanions > 0 && (
            <div className="f"><div className="lbl" id="r-comp">{t.fComp}</div>
              <div className="stepper" role="group" aria-labelledby="r-comp">
                <span style={{ fontSize: 13, color: "var(--mutedDark)" }}>{comp === 0 ? t.onlyYou : t.plus(comp + 1)}</span>
                <div className="ctl">
                  <button type="button" aria-label="−" disabled={comp <= 0} onClick={() => setComp((c) => Math.max(0, c - 1))}>−</button>
                  <output aria-live="polite">{digits(comp, lang)}</output>
                  <button type="button" aria-label="+" disabled={comp >= d.rsvp.maxCompanions} onClick={() => setComp((c) => Math.min(d.rsvp.maxCompanions, c + 1))}>+</button>
                </div>
              </div></div>
          )}
          {f.note !== "off" && (
            <div className="f"><label htmlFor="r-note">{t.fNote} {f.note === "optional" && <small>{t.optional}</small>}</label><textarea className="fld" id="r-note" name="note" maxLength={300} /></div>
          )}
          {d.rsvp.questions.map((q) => (
            <div key={q.id} className="f"><label htmlFor={`q-${q.id}`}>{pick(q.label, lang)} {!q.required && <small>{t.optional}</small>}</label><input className="fld" id={`q-${q.id}`} name={`q-${q.id}`} maxLength={300} /></div>
          ))}
          {d.rsvp.notices.filter((n) => n.mode === "must").map((n) => (
            <label key={n.id} className="ack"><input type="checkbox" name={`ack-${n.id}`} /><span>{pick(n.text, lang)}</span></label>
          ))}
          {err && <div className="err" role="alert">{err}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="inv-btn gold block" type="submit" disabled={disabled || busy} style={{ minHeight: 54, fontSize: 15 }}>{busy ? t.sending : allOff ? t.attendOnly : t.attend}</button>
            <button className="inv-btn line block" type="button" disabled={disabled || busy} onClick={() => void submit("DECLINED")}>{t.decline}</button>
          </div>
          <div className="fine">{d.mode !== "live" ? t.previewNote : t.privacy}</div>
        </form>
      )}
    </div>
  );
}
