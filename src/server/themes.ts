import "server-only";
import { eq } from "drizzle-orm";
import type { Tier } from "@/lib/entitlements";
import { ART_SLOTS, bundledArt, themeBySlug, type ThemeArt } from "@/themes/catalog";
import { getDb, schema } from "./db";
import { mediaUrl } from "./storage";

/** Admin-controlled tier and visibility for each catalog theme. */
export async function themeSettings() {
  const db = await getDb();
  const rows = await db.select().from(schema.themes);
  const tierOf: Record<string, Tier> = {};
  const hidden = new Set<string>();
  for (const r of rows) { tierOf[r.slug] = r.tier; if (!r.active) hidden.add(r.slug); }
  return { tierOf, hidden };
}

/** Artwork of one theme as public URLs: bundled art, overridden slot by slot by admin uploads. */
export async function themeArtUrls(slug: string): Promise<ThemeArt> {
  const db = await getDb();
  const row = await db.query.themes.findFirst({ where: eq(schema.themes.slug, slug), columns: { art: true } });
  const t = themeBySlug(slug);
  const out: ThemeArt = t ? bundledArt(t) : {};
  for (const k of ART_SLOTS) { const id = row?.art?.[k]; if (id) out[k] = mediaUrl(id); }
  return out;
}
