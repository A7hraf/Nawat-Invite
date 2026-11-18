import { z } from "zod";

export const TIERS = ["IVORY", "GILDED", "ROYAL_SEAL"] as const;
export type Tier = (typeof TIERS)[number];
export const PACKAGES = ["ATELIER", "CONCIERGE"] as const;
export type PackageType = (typeof PACKAGES)[number];

export const tierRank = (t: Tier) => TIERS.indexOf(t);

const int = (min = 0, max = 100_000) => z.number().int().min(min).max(max);

/** Every feature a client can have. Versioned: bump `version` on breaking changes. */
export const EntitlementsSchema = z.object({
  version: z.literal(1),
  themes: z.object({ tiers: z.array(z.enum(TIERS)).min(1) }),
  invitations: z.object({
    maxEvents: int(1, 50),
    maxGuestPasses: int(0, 20_000),
    openLinkAllowed: z.boolean(),
    bilingual: z.boolean(),
  }),
  music: z.object({ enabled: z.boolean(), trialLimit: int(0, 999), allowUpload: z.boolean() }),
  rsvp: z.object({
    enabled: z.boolean(),
    fieldName: z.boolean(),
    fieldPhone: z.boolean(),
    fieldCompanions: z.boolean(),
    fieldNote: z.boolean(),
    customQuestions: int(0, 10),
    notices: z.boolean(),
  }),
  checkin: z.object({ qrPass: z.boolean(), gatekeepers: int(0, 50) }),
  media: z.object({ photos: int(0, 60), storageMb: int(10, 20_000) }),
  reports: z.object({ exportPdf: z.boolean(), exportExcel: z.boolean() }),
  studio: z.object({ access: z.enum(["FULL", "READ_ONLY", "NONE"]) }),
});
export type Entitlements = z.infer<typeof EntitlementsSchema>;

/** Default plan matrix (admins can change every value in Admin → Plans). */
export function defaultEntitlements(tier: Tier, pkg: PackageType): Entitlements {
  const ivory: Entitlements = {
    version: 1,
    themes: { tiers: ["IVORY"] },
    invitations: { maxEvents: 1, maxGuestPasses: 150, openLinkAllowed: false, bilingual: false },
    music: { enabled: false, trialLimit: 0, allowUpload: false },
    rsvp: { enabled: true, fieldName: false, fieldPhone: false, fieldCompanions: false, fieldNote: false, customQuestions: 0, notices: false },
    checkin: { qrPass: false, gatekeepers: 0 },
    media: { photos: 0, storageMb: 100 },
    reports: { exportPdf: false, exportExcel: false },
    studio: { access: "FULL" },
  };
  const gilded: Entitlements = {
    ...ivory,
    themes: { tiers: ["IVORY", "GILDED"] },
    invitations: { maxEvents: 2, maxGuestPasses: 400, openLinkAllowed: true, bilingual: true },
    music: { enabled: true, trialLimit: 5, allowUpload: false },
    rsvp: { enabled: true, fieldName: true, fieldPhone: true, fieldCompanions: true, fieldNote: false, customQuestions: 0, notices: true },
    checkin: { qrPass: true, gatekeepers: 1 },
    media: { photos: 6, storageMb: 500 },
    reports: { exportPdf: true, exportExcel: false },
  };
  const royal: Entitlements = {
    ...gilded,
    themes: { tiers: ["IVORY", "GILDED", "ROYAL_SEAL"] },
    invitations: { maxEvents: 3, maxGuestPasses: 1000, openLinkAllowed: true, bilingual: true },
    music: { enabled: true, trialLimit: 999, allowUpload: true },
    rsvp: { ...gilded.rsvp, fieldNote: true, customQuestions: 5 },
    checkin: { qrPass: true, gatekeepers: 5 },
    media: { photos: 20, storageMb: 1000 },
    reports: { exportPdf: true, exportExcel: true },
  };
  const base = tier === "IVORY" ? ivory : tier === "GILDED" ? gilded : royal;
  return { ...base, studio: { access: pkg === "ATELIER" ? "FULL" : "READ_ONLY" } };
}

type Plain = Record<string, unknown>;
const isObj = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

export function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return (patch === undefined ? base : (patch as T));
  const out: Plain = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in out)) continue; // unknown keys are dropped
    out[key] = isObj(out[key]) && isObj(value) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

/** Only the values that differ from the plan are stored as overrides. */
export function diffOverrides(plan: unknown, wanted: unknown): Plain {
  if (!isObj(plan) || !isObj(wanted)) return {};
  const out: Plain = {};
  for (const [key, value] of Object.entries(wanted)) {
    const p = plan[key];
    if (isObj(p) && isObj(value)) {
      const d = diffOverrides(p, value);
      if (Object.keys(d).length) out[key] = d;
    } else if (JSON.stringify(p) !== JSON.stringify(value)) out[key] = value;
  }
  return out;
}

/** Effective entitlements = plan ⊕ overrides, re-validated. Invalid data falls back to the plan. */
export function resolveEntitlements(planEnt: unknown, overrides: unknown): Entitlements {
  const plan = EntitlementsSchema.parse(planEnt);
  const merged = EntitlementsSchema.safeParse(deepMerge(plan, overrides ?? {}));
  return merged.success ? merged.data : plan;
}

export function countOverrides(o: unknown): number {
  if (!isObj(o)) return 0;
  return Object.values(o).reduce<number>((n, v) => n + (isObj(v) ? countOverrides(v) : 1), 0);
}

export class EntitlementError extends Error {
  constructor(public key: string, message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}
