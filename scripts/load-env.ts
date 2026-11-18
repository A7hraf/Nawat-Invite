/* Minimal .env loader for CLI scripts (Next.js loads .env itself). */
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const [, key, raw] = m;
    if (key && process.env[key] === undefined) process.env[key] = (raw ?? "").replace(/^["']|["']$/g, "");
  }
}
