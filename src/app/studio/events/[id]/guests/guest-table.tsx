"use client";
import { useMemo, useState, useTransition } from "react";
import { waDigits } from "@/lib/phone";
import { CopyButton } from "@/components/ui/form";
import { IconWhatsapp } from "@/components/ui/icons";
import { deleteGuestAction, markSentAction } from "../../../actions";

export type GuestRow = {
  id: string; name: string; phone: string | null; side: string; group: string | null; allowed: number;
  status: string; coming: number | null; note: string | null; link: string;
};

const SIDE: Record<string, string> = { BRIDE: "Bride’s family", GROOM: "Groom’s family", BOTH: "Both", OTHER: "—" };
const TONE: Record<string, string> = { Attending: "ok", Declined: "bad", Opened: "warn", Sent: "blue", "Not sent": "" };
const FILTERS = ["All", "Attending", "Declined", "Opened", "Sent", "Not sent"];

export function GuestTable({ eventId, rows, names, date, canEdit }: { eventId: string; rows: GuestRow[]; names: { en: string; ar: string }; date: { en: string; ar: string }; canEdit: boolean }) {
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [, start] = useTransition();
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, f === "All" ? rows.length : rows.filter((r) => r.status === f).length])), [rows]);
  const shown = rows.filter((r) => (filter === "All" || r.status === filter) && (!q || `${r.name} ${r.group ?? ""} ${r.phone ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const message = (r: GuestRow) =>
    `السلام عليكم ${r.name}\nيسعدنا دعوتكم لحفل ${names.ar}، ${date.ar}.\nافتحوا دعوتكم الخاصة:\n${r.link}\n\nDear ${r.name}, you are warmly invited to celebrate with ${names.en} on ${date.en}. Your personal invitation:\n${r.link}`;

  return (
    <section className="stack">
      <div className="row between">
        <div className="row" role="tablist" aria-label="Filter guests">
          {FILTERS.map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}>{f} <span style={{ opacity: .65 }}>{counts[f]}</span></button>
          ))}
        </div>
        <label className="sr-only" htmlFor="gq">Search guests</label>
        <input id="gq" className="input" style={{ width: 260 }} placeholder="Search name, group or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Guest</th><th>Side</th><th>Allowed</th><th>Coming</th><th>Status</th><th style={{ textAlign: "end" }}>Send</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={6} className="empty">{rows.length ? "No guests match." : "No guests yet. Add them above."}</td></tr>}
            {shown.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong><div className="tiny muted" dir="ltr" style={{ textAlign: "start" }}>{r.phone ?? "no phone"}{r.group ? ` · ${r.group}` : ""}</div>{r.note && <div className="tiny" style={{ color: "var(--gold-t)" }}>“{r.note}”</div>}</td>
                <td className="small">{SIDE[r.side]}</td>
                <td>{r.allowed === 0 ? "Only them" : `+${r.allowed}`}</td>
                <td><strong>{r.coming ?? "—"}</strong></td>
                <td><span className={`badge ${TONE[r.status] ?? ""}`}>{r.status}</span></td>
                <td>
                  <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                    {r.phone && canEdit && (
                      <a className="btn btn-wa btn-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waDigits(r.phone)}?text=${encodeURIComponent(message(r))}`}
                        onClick={() => start(() => markSentAction(eventId, r.id))}><IconWhatsapp size={14} />WhatsApp</a>
                    )}
                    <CopyButton text={r.link} label="Copy link" />
                    {canEdit && (
                      <form action={deleteGuestAction} onSubmit={(e) => { if (!window.confirm(`Remove ${r.name}? Their link will stop working.`)) e.preventDefault(); }}>
                        <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="guestId" value={r.id} />
                        <button className="btn btn-danger btn-sm" type="submit" aria-label={`Remove ${r.name}`}>×</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
