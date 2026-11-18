import { describe, expect, it } from "vitest";
import { countOverrides, defaultEntitlements, deepMerge, diffOverrides, EntitlementsSchema, resolveEntitlements } from "@/lib/entitlements";
import { normalizePhone } from "@/lib/phone";
import { csvCell, parseCsv } from "@/lib/csv";
import { decrypt, encrypt, lookupHash, oneTimePassword, randomKey } from "@/server/crypto";
import { extractPassKey } from "@/server/services/gate";
import { fillParts } from "@/components/invitation/i18n";
import { THEMES } from "@/themes/catalog";

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
  it("has 10 themes with unique slugs across all tiers and openings", () => {
    expect(THEMES).toHaveLength(10);
    expect(new Set(THEMES.map((t) => t.slug)).size).toBe(10);
    expect(new Set(THEMES.map((t) => t.tier))).toEqual(new Set(["IVORY", "GILDED", "ROYAL_SEAL"]));
    expect(new Set(THEMES.map((t) => t.opening))).toEqual(new Set(["envelope", "doors", "curtain", "box"]));
  });
});
