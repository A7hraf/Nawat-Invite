/* Applies SQL migrations in ./drizzle to the configured database. */
import "./load-env";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.DATABASE_URL ?? "pglite:./.data/db";

async function main() {
  if (url.startsWith("pglite:")) {
    const dir = url.slice(7);
    if (dir !== "memory") mkdirSync(dirname(dir + "/x"), { recursive: true });
    (await import("../src/server/db/pglite-lock")).lockPglite(dir);
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite(dir);
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    await client.close();
  } else {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    await pool.end();
  }
  console.log("✓ Database migrated");
}

main().catch((e) => { console.error(e); process.exit(1); });
