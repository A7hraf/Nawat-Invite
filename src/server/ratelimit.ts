import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "./db";

/**
 * Fixed-window rate limiter stored in Postgres, so it holds across app instances.
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: schema.rateLimits.key,
      set: {
        count: sql`CASE WHEN ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE ${schema.rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE ${schema.rateLimits.windowStart} END`,
      },
    })
    .returning({ count: schema.rateLimits.count });
  return (rows[0]?.count ?? 0) <= limit;
}
