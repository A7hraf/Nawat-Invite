import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "../env";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
/** Either the database or an open transaction. */
export type Exec = DB | Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * One database handle per process.
 *  - `postgres://…`  → node-postgres pool (production)
 *  - `pglite:<dir>`  → embedded Postgres (local development, tests)
 * Both expose the same Drizzle API.
 */
const g = globalThis as unknown as { __nawatDb?: Promise<DB> };

async function connect(): Promise<DB> {
  const url = env().DATABASE_URL;
  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dir = url.slice("pglite:".length);
    (await import("./pglite-lock")).lockPglite(dir);
    const client = dir === "memory" ? new PGlite() : new PGlite(dir);
    return drizzle(client, { schema }) as unknown as DB;
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: url, max: 10, ssl: url.includes("sslmode=require") ? { rejectUnauthorized: true } : undefined });
  return drizzle(pool, { schema });
}

export function getDb(): Promise<DB> {
  g.__nawatDb ??= connect();
  return g.__nawatDb;
}

export { schema };
