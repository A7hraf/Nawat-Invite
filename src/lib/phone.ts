/** Normalises phone input to E.164. Oman (+968, 8 digits) is the default country. */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (/^[79]\d{7}$/.test(s)) return "+968" + s;
  if (/^00\d{8,15}$/.test(s)) return "+" + s.slice(2);
  if (/^968[79]\d{7}$/.test(s)) return "+" + s;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}

export const maskPhone = (e164: string | null) => (e164 && e164.length > 8 ? `${e164.slice(0, 5)} •••• ${e164.slice(-3)}` : e164 ?? "");

export const waDigits = (e164: string) => e164.replace(/\D/g, "");
