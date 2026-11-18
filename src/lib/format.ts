const TZ = "Asia/Muscat";

export const fmtDate = (d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, locale = "en-GB") =>
  d ? new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(new Date(d)) : "—";

export const fmtDateTime = (d: Date | string | null | undefined, locale = "en-GB") =>
  fmtDate(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, locale);

export const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n);

export const pct = (a: number, b: number) => (b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0);

/** "2026-12-17T20:00" in Muscat time → Date. */
export const muscatLocalToDate = (local: string) => new Date(`${local}:00+04:00`);

/** Date → "2026-12-17T20:00" in Muscat time, for <input type="datetime-local">. */
export function dateToMuscatLocal(d: Date) {
  const s = new Date(d.getTime() + 4 * 3600_000).toISOString();
  return s.slice(0, 16);
}

export const relative = (d: Date | null) => {
  if (!d) return "—";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return fmtDate(d);
};
