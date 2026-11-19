import { describe, expect, it } from "vitest";
import { countOverrides, defaultEntitlements, deepMerge, diffOverrides, EntitlementsSchema, resolveEntitlements } from "@/lib/entitlements";
import { normalizePhone } from "@/lib/phone";
import { csvCell, parseCsv } from "@/lib/csv";
import { decrypt, encrypt, lookupHash, oneTimePassword, randomKey } from "@/server/crypto";
import { extractPassKey } from "@/server/services/gate";
import { fillParts } from "@/components/invitation/i18n";
import { existsSync } from "node:fs";
import path from "node:path";
import { ART_SLOTS, ART_SLOT_INFO, bundledArt, themeFontHrefs, themeMusicUrl, THEMES } from "@/themes/catalog";
import { MUSIC_LIBRARY } from "@/lib/music-library";
import { EventContentSchema } from "@/lib/event-content";

describe("entitlements", () => {
  it("every default plan is valid", () => {
    for (const t of ["IVORY", "GILDED", "ROYAL_SEAL"] as const) for (const p of ["ATELIER", "CONCIERGE"] as const) {
      expect(EntitlementsSchema.safeParse(defaultEntitlements(t, p)).success).toBe(true);
    }
  });
  it("concierge plans are view-only", () => {
    expect(defaultEntitlements("GILDED", "CONCIERGE").studio.access).toBe("READ_ONLY");
  });
  it("stores only differences and merges them back", () => {
    const plan = defaultEntitlements("GILDED", "ATELIER");
    const wanted = structuredClone(plan);
    wanted.invitations.maxGuestPasses = 900;
    wanted.music.allowUpload = true;
    const o = diffOverrides(plan, wanted);
    expect(o).toEqual({ invitations: { maxGuestPasses: 900 }, music: { allowUpload: true } });
    expect(countOverrides(o)).toBe(2);
    expect(resolveEntitlements(plan, o)).toEqual(wanted);
  });
  it("ignores unknown keys and falls back to the plan on invalid overrides", () => {
    const plan = defaultEntitlements("IVORY", "ATELIER");
    expect(deepMerge(plan, { hacked: true } as never)).not.toHaveProperty("hacked");
    expect(resolveEntitlements(plan, { invitations: { maxGuestPasses: -5 } })).toEqual(plan);
  });
});

describe("crypto", () => {
  it("round-trips and detects tampering", () => {
    const c = encrypt("+96899112233");
    expect(decrypt(c)).toBe("+96899112233");
    const bad = c.slice(0, -3) + (c.endsWith("A") ? "BBB" : "AAA");
    expect(() => decrypt(bad)).toThrow();
  });
  it("uses random IVs and stable lookup hashes", () => {
    expect(encrypt("x")).not.toBe(encrypt("x"));
    expect(lookupHash("k")).toBe(lookupHash("k"));
  });
  it("generates unambiguous keys and passwords", () => {
    expect(randomKey(22)).toMatch(/^[A-HJ-NP-Za-km-z2-9]{22}$/);
    expect(oneTimePassword()).toMatch(/^[\w]{4}-[\w]{4}-[\w]{4}$/);
  });
});

describe("input handling", () => {
  it("normalises Omani and international numbers", () => {
    expect(normalizePhone("9911 2233")).toBe("+96899112233");
    expect(normalizePhone("0096899112233")).toBe("+96899112233");
    expect(normalizePhone("+971501234567")).toBe("+971501234567");
    expect(normalizePhone("12345")).toBeNull();
  });
  it("parses CSV with quotes and neutralises formulas on export", () => {
    expect(parseCsv('name,phone\n"Al Harthy, Ahmed",99112233\n')).toEqual([["name", "phone"], ["Al Harthy, Ahmed", "99112233"]]);
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  });
  it("reads pass keys only from our QR format", () => {
    const k = "A".repeat(24);
    expect(extractPassKey(`https://invites.nawat.om/p/${k}`)).toBe(k);
    expect(extractPassKey(k)).toBe(k);
    expect(extractPassKey("javascript:alert(1)")).toBeNull();
  });
  it("renders greetings as text parts, never HTML", () => {
    const parts = fillParts("Dear {name}", { name: "<img src=x onerror=alert(1)>" });
    expect(parts).toEqual([{ text: "Dear ", bold: false }, { text: "<img src=x onerror=alert(1)>", bold: true }]);
  });
});

describe("themes", () => {
  it("has 20 themes with unique slugs across all tiers and openings", () => {
    expect(THEMES).toHaveLength(20);
    expect(new Set(THEMES.map((t) => t.slug)).size).toBe(20);
    expect(new Set(THEMES.map((t) => t.tier))).toEqual(new Set(["IVORY", "GILDED", "ROYAL_SEAL"]));
    expect(new Set(THEMES.map((t) => t.opening))).toEqual(new Set(["envelope", "doors", "curtain", "box"]));
  });
  it("gives every theme a script font, an interaction and documented art slots", () => {
    for (const t of THEMES) { expect(t.fonts.script).toBeTruthy(); expect(["seal", "ribbon", "gatefold", "curtain"]).toContain(t.interaction); }
    for (const s of ART_SLOTS) expect(ART_SLOT_INFO[s].label).toBeTruthy();
  });
  it("ships every bundled artwork, font and soundtrack file a theme refers to", () => {
    const pub = (p: string) => path.join(process.cwd(), "public", p);
    for (const t of THEMES) {
      expect(t.art).toContain("reveal");
      for (const url of Object.values(bundledArt(t))) expect(existsSync(pub(url!))).toBe(true);
      for (const href of themeFontHrefs(t)) expect(existsSync(pub(href))).toBe(true);
      expect(existsSync(pub(themeMusicUrl(t)))).toBe(true);
      expect(MUSIC_LIBRARY.some((m) => m.slug === t.music)).toBe(true);
    }
    expect(new Set(THEMES.map((t) => `${t.interaction}/${t.hero}/${t.fonts.display}`)).size).toBeGreaterThanOrEqual(18);
  });
  it("reads invitations saved before the v2 sections existed", () => {
    const old = { partner1: { en: "A", ar: "" }, partner2: { en: "B", ar: "" }, families: { en: "", ar: "" }, message: { en: "", ar: "" },
      venue: { name: { en: "", ar: "" }, address: { en: "", ar: "" } }, sections: { countdown: true, schedule: true, venue: true, notices: true, gallery: false },
      locales: ["ar"], defaultLocale: "ar", music: { trackId: null }, gallery: [] };
    const c = EventContentSchema.parse(old);
    expect(c.sections.letter).toBe(true);
    expect(c.sections.dress).toBe(false);
    expect(c.faq).toEqual([]);
    expect(c.dressCode.colors).toEqual([]);
    expect(c.closingPhoto).toBeNull();
  });
  it("rejects dress-code colours that are not hex", () => {
    const r = EventContentSchema.shape.dressCode.safeParse({ title: { en: "", ar: "" }, note: { en: "", ar: "" }, colors: [{ hex: "red;background:url(x)", name: { en: "", ar: "" } }] });
    expect(r.success).toBe(false);
  });
});
