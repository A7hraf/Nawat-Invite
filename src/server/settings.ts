import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { BRAND_DEFAULTS, type BrandSettings } from "@/lib/brand";
import { getDb, schema } from "./db";

const BiName = z.object({ en: z.string().min(1).max(40), ar: z.string().min(1).max(40) });
export const BrandSettingsSchema = z.object({
  footer: z.object({ website: z.url().max(200), instagram: z.url().max(200), phone: z.string().min(5).max(30) }),
  tierNames: z.object({ IVORY: BiName, GILDED: BiName, ROYAL_SEAL: BiName }),
});

export async function getBrandSettings(): Promise<BrandSettings> {
  const db = await getDb();
  const row = await db.query.systemSettings.findFirst({ where: eq(schema.systemSettings.key, "brand") });
  const parsed = BrandSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : { footer: { ...BRAND_DEFAULTS.footer }, tierNames: structuredClone(BRAND_DEFAULTS.tierNames) as BrandSettings["tierNames"] };
}

export async function saveBrandSettings(value: BrandSettings) {
  const db = await getDb();
  await db.insert(schema.systemSettings).values({ key: "brand", value })
    .onConflictDoUpdate({ target: schema.systemSettings.key, set: { value } });
}
