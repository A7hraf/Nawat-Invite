/* Seeds plans, themes, built-in music and the first admin. Safe to run repeatedly. Set SEED_DEMO=1 for demo clients. */
import "./load-env";
import { eq, sql } from "drizzle-orm";
import { PACKAGES, TIERS, defaultEntitlements } from "../src/lib/entitlements";
import { BRAND_DEFAULTS } from "../src/lib/brand";
import { THEMES } from "../src/themes/catalog";
import { getDb, schema } from "../src/server/db";
import { hashPassword } from "../src/server/auth/password";
import { oneTimePassword } from "../src/server/crypto";
import { createClientAccount } from "../src/server/repo/accounts";
import { createEvent, saveContent, saveRsvpConfig, setStatus } from "../src/server/repo/events";
import { addGuests } from "../src/server/repo/guests";
import { resolveEntitlements } from "../src/lib/entitlements";
import { parseContent, parseRsvpConfig } from "../src/lib/event-content";

const PRICES: Record<string, string> = {
  IVORY_ATELIER: "25", GILDED_ATELIER: "45", ROYAL_SEAL_ATELIER: "75",
  IVORY_CONCIERGE: "60", GILDED_CONCIERGE: "95", ROYAL_SEAL_CONCIERGE: "150",
};

async function main() {
  const db = await getDb();

  for (const tier of TIERS) for (const pkg of PACKAGES) {
    const code = `${tier}_${pkg}`;
    const tn = BRAND_DEFAULTS.tierNames[tier], pn = BRAND_DEFAULTS.packageNames[pkg];
    await db.insert(schema.plans).values({
      code, tier, package: pkg, nameEn: `${tn.en} · ${pn.en}`, nameAr: `${tn.ar} · ${pn.ar}`,
      entitlements: defaultEntitlements(tier, pkg), priceOmr: PRICES[code] ?? null,
    }).onConflictDoNothing();
  }
  console.log("✓ Plans");

  for (const [i, t] of THEMES.entries()) {
    await db.insert(schema.themes).values({ slug: t.slug, tier: t.tier, sortOrder: i }).onConflictDoNothing();
  }
  console.log(`✓ ${THEMES.length} themes`);

  const builtins = [
    { builtin: "hijaz-qanun", titleEn: "Qanun in Hijaz", titleAr: "قانون على مقام الحجاز", mood: "Oud & qanun · romantic", minTier: "GILDED" as const },
    { builtin: "nahawand-harp", titleEn: "Harp in Nahawand", titleAr: "هارب على مقام النهاوند", mood: "Harp · tender", minTier: "GILDED" as const },
    { builtin: "royal-strings", titleEn: "Royal Strings", titleAr: "أوتار ملكية", mood: "Strings · grand", minTier: "ROYAL_SEAL" as const },
  ];
  for (const b of builtins) {
    const exists = await db.query.musicTracks.findFirst({ where: eq(schema.musicTracks.builtin, b.builtin) });
    if (!exists) await db.insert(schema.musicTracks).values({ ...b, licence: "Nawat built-in (generated in the browser)" });
  }
  console.log("✓ Built-in music");

  await db.insert(schema.systemSettings).values({ key: "brand", value: { footer: BRAND_DEFAULTS.footer, tierNames: BRAND_DEFAULTS.tierNames } }).onConflictDoNothing();

  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase();
  const admin = await db.query.users.findFirst({ where: sql`lower(${schema.users.username}) = ${username}` });
  if (!admin) {
    const password = process.env.SEED_ADMIN_PASSWORD || oneTimePassword();
    await db.insert(schema.users).values({ username, displayName: "System Admin", passwordHash: await hashPassword(password), role: "SUPER_ADMIN", mustChangePassword: true });
    console.log(`\n  ┌ First admin created\n  │ username: ${username}\n  │ password: ${password}\n  └ You will set up 2-step sign-in and a new password on first login.\n`);
  }

  if (process.env.SEED_DEMO === "1") await seedDemo();
  console.log("✓ Seed complete");
  process.exit(0);
}

async function seedDemo() {
  const db = await getDb();
  if (await db.query.users.findFirst({ where: eq(schema.users.username, "sara.omar") })) return;
  const plan = await db.query.plans.findFirst({ where: eq(schema.plans.code, "ROYAL_SEAL_ATELIER") });
  const { account, password } = await createClientAccount(null, { displayName: "Sara & Omar", contactName: "Sara Al Harthy", contactPhone: "+96899123456", planId: plan!.id, validUntil: "2027-03-31", username: "sara.omar", notes: "Demo account" });
  const ent = resolveEntitlements(plan!.entitlements, {});
  const ev = await createEvent(null, account.id, ent, { title: "Sara & Omar · Wedding", type: "WEDDING", startsAt: new Date("2026-12-17T20:00:00+04:00"), themeSlug: "majlis-velvet", p1en: "Sara", p2en: "Omar", p1ar: "سارة", p2ar: "عمر" });
  const content = parseContent(ev.content);
  content.families = { en: "The Al Harthy & Al Balushi families", ar: "آل الحارثي وآل البلوشي" };
  content.venue.name = { en: "The Grand Ballroom", ar: "القاعة الكبرى" };
  content.venue.mapUrl = "https://maps.google.com/?q=Muscat%2C%20Oman";
  const builtin = await db.query.musicTracks.findFirst({ where: eq(schema.musicTracks.builtin, "hijaz-qanun") });
  content.music.trackId = builtin?.id ?? null;
  await saveContent(null, ev, ent, content, {});
  const rsvp = parseRsvpConfig(ev.rsvpConfig);
  rsvp.fields = { name: "required", phone: "optional", companions: "optional", note: "optional" };
  rsvp.notices = rsvp.notices.map((n) => ({ ...n, mode: n.kind === "children" ? "must" as const : "show" as const }));
  rsvp.deadline = "2026-12-10";
  await saveRsvpConfig(null, ev, ent, rsvp, true);
  await addGuests(null, ev, ent, [
    { name: "Ahmed Al Harthy & family", phone: "99112233", side: "GROOM", group: "Al Harthy family", allowedCompanions: 3 },
    { name: "Reem Al Kindi", phone: "92233445", side: "BRIDE", group: "Bride friends", allowedCompanions: 1 },
    { name: "Yousuf Al Saadi", phone: "", side: "GROOM", group: "Work friends", allowedCompanions: 0 },
  ]);
  await setStatus(null, ev, "PUBLISHED");

  const cplan = await db.query.plans.findFirst({ where: eq(schema.plans.code, "GILDED_CONCIERGE") });
  const c = await createClientAccount(null, { displayName: "Al Busaidi family", contactName: "", contactPhone: "", planId: cplan!.id, validUntil: "", username: "albusaidi", notes: "Concierge demo" });
  console.log(`\n  Demo clients\n  · sara.omar  / ${password}   (Royal Seal · Atelier)\n  · albusaidi  / ${c.password}   (Gilded · Concierge)\n  Demo invitation: /i/${ev.slug}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
