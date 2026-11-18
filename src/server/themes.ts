import "server-only";
import type { Tier } from "@/lib/entitlements";
import { getDb, schema } from "./db";

/** Admin-controlled tier and visibility for each catalog theme. */
export async function themeSettings() {
  const db = await getDb();
  const rows = await db.select().from(schema.themes);
  const tierOf: Record<string, Tier> = {};
  const hidden = new Set<string>();
  for (const r of rows) { tierOf[r.slug] = r.tier; if (!r.active) hidden.add(r.slug); }
  return { tierOf, hidden };
}
