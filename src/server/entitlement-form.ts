import "server-only";
import { EntitlementsSchema, TIERS, type Entitlements } from "@/lib/entitlements";

/** Reads the EntitlementFields form back into a validated object. */
export function parseEntitlementForm(fd: FormData): Entitlements {
  const b = (k: string) => fd.get(k) === "on";
  const n = (k: string) => Number(fd.get(k));
  const tiers = TIERS.filter((t) => b(`themes.${t}`));
  return EntitlementsSchema.parse({
    version: 1,
    themes: { tiers: tiers.length ? tiers : ["IVORY"] },
    invitations: { maxEvents: n("invitations.maxEvents"), maxGuestPasses: n("invitations.maxGuestPasses"), openLinkAllowed: b("invitations.openLinkAllowed"), bilingual: b("invitations.bilingual") },
    music: { enabled: b("music.enabled"), trialLimit: n("music.trialLimit"), allowUpload: b("music.allowUpload") },
    rsvp: {
      enabled: b("rsvp.enabled"), fieldName: b("rsvp.fieldName"), fieldPhone: b("rsvp.fieldPhone"), fieldCompanions: b("rsvp.fieldCompanions"),
      fieldNote: b("rsvp.fieldNote"), customQuestions: n("rsvp.customQuestions"), notices: b("rsvp.notices"),
    },
    checkin: { qrPass: b("checkin.qrPass"), gatekeepers: n("checkin.gatekeepers") },
    media: { photos: n("media.photos"), storageMb: n("media.storageMb") },
    reports: { exportPdf: b("reports.exportPdf"), exportExcel: b("reports.exportExcel") },
    studio: { access: String(fd.get("studio.access") ?? "FULL") },
  });
}
