import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * The embedded development database (PGlite) must only be opened by ONE process.
 * Two processes on the same folder corrupt it, so we refuse with a clear message.
 */
export function lockPglite(dir: string) {
  if (dir === "memory") return;
  mkdirSync(path.dirname(path.resolve(dir)), { recursive: true });
  const lock = path.resolve(dir) + ".lock";
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8"));
    let alive = false;
    try { if (pid && pid !== process.pid) { process.kill(pid, 0); alive = true; } } catch { alive = false; }
    if (alive) throw new Error(`The local database (${dir}) is already open in process ${pid}. Stop that process first (e.g. the dev server) or use PostgreSQL.`);
  }
  writeFileSync(lock, String(process.pid));
  const release = () => { try { if (readFileSync(lock, "utf8") === String(process.pid)) rmSync(lock); } catch { /* already gone */ } };
  process.once("exit", release);
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => { release(); process.exit(0); });
}
