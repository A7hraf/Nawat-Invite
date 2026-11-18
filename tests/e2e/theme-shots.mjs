/** Screenshots of chosen themes' openings. Usage: node tests/e2e/theme-shots.mjs layali-celestial noir-monogram */
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { Secret, TOTP } from "otpauth";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`${BASE}/login`);
await p.fill("#username", "admin"); await p.fill("#password", process.env.ADMIN_PASSWORD ?? "Nawat-Admin-2026-secure"); await p.click("button[type=submit]");
await p.waitForURL(/two-factor/);
await p.fill("#code", new TOTP({ secret: Secret.fromBase32(readFileSync("./.data/e2e/admin-totp-secret.txt", "utf8").trim()) }).generate());
await p.click("button[type=submit]"); await p.waitForURL(/admin/);
for (const t of process.argv.slice(2)) {
  await p.goto(`${BASE}/preview/${t}`); await p.waitForTimeout(4500);
  await p.screenshot({ path: `./.data/e2e/shot-${t}-1.png` });
  await p.mouse.click(195, 450);
  for (const [i, ms] of [[2, 900], [3, 900]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `./.data/e2e/shot-${t}-${i}.png` }); }
}
await b.close();
