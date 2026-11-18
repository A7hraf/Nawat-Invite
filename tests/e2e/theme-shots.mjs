/**
 * Screenshots of chosen themes: the opening (photo or 3D), then each interactive section.
 * Usage: node tests/e2e/theme-shots.mjs majlis-velvet dana-pearl
 */
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { Secret, TOTP } from "otpauth";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "./.data/e2e/shots"; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(String(e)));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await p.goto(`${BASE}/login`);
await p.fill("#username", "admin"); await p.fill("#password", process.env.ADMIN_PASSWORD ?? "Nawat-Admin-2026-secure"); await p.click("button[type=submit]");
await p.waitForURL(/two-factor/);
await p.fill("#code", new TOTP({ secret: Secret.fromBase32(readFileSync("./.data/e2e/admin-totp-secret.txt", "utf8").trim()) }).generate());
await p.click("button[type=submit]"); await p.waitForURL(/admin/);
if (process.env.SHOT_LANG) await p.evaluate((l) => localStorage.setItem("nawat-lang", l), process.env.SHOT_LANG);
const shot = (t, n) => p.screenshot({ path: `${OUT}/${t}-${n}.png` });
const center = async (sel) => { const bb = await p.locator(sel).first().boundingBox(); return bb ? [bb.x + bb.width / 2, bb.y + bb.height / 2] : null; };
for (const t of process.argv.slice(2)) {
  await p.goto(`${BASE}/preview/${t}`); await p.waitForTimeout(3500);
  await shot(t, "01-closed");
  const photo = await p.locator(".inv-photo").count();
  if (photo && await p.locator(".k-seal").count()) {
    const c = await center(".ph-seal"); await p.mouse.move(...c); await p.mouse.down(); await p.waitForTimeout(600); await shot(t, "02-holding"); await p.waitForTimeout(700); await p.mouse.up();
  } else if (photo && await p.locator(".k-gatefold").count()) { await p.click(".ph-seal"); }
  else if (photo) { await p.click(".inv-ui .hint .big"); }
  else { await p.mouse.click(195, 450); }
  await p.waitForTimeout(800); await shot(t, "03-opening"); await p.waitForTimeout(2600);
  await p.waitForSelector(".inv-hero", { timeout: 8000 }); await p.waitForTimeout(1500); await shot(t, "04-hero");
  if (await p.locator(".inv-curtain").count()) {
    const top = await p.evaluate(() => document.querySelector(".inv-curtain").getBoundingClientRect().top + scrollY);
    for (const [k, f] of [["05-curtain-a", 0], ["06-curtain-b", 0.45], ["07-curtain-c", 1.1]]) { await p.evaluate(([y]) => scrollTo(0, y), [top + f * 844]); await p.waitForTimeout(700); await shot(t, k); }
  }
  await p.locator(".inv-sealdate").scrollIntoViewIfNeeded(); await p.waitForTimeout(1200); await shot(t, "08-date-sealed");
  const s = await center(".inv-sealdate .sd-seal"); if (s) { await p.mouse.move(...s); await p.mouse.down(); await p.waitForTimeout(1100); await p.mouse.up(); }
  await p.waitForTimeout(1400); await shot(t, "09-date-open");
  if (await p.locator(".inv-room").count()) {
    await p.locator(".inv-room").scrollIntoViewIfNeeded(); await p.waitForTimeout(900); await shot(t, "10-room-dark");
    const r = await p.locator(".inv-room").boundingBox();
    await p.mouse.move(r.x + 60, r.y + 80);
    for (let i = 0; i < 6; i++) { await p.mouse.move(r.x + r.width - 60, r.y + 60 + i * 30, { steps: 12 }); if (i === 1) await shot(t, "11-room-torch"); await p.mouse.move(r.x + 60, r.y + 80 + i * 30, { steps: 12 }); }
    await p.waitForTimeout(2200); await shot(t, "12-room-lit");
  }
  for (const [sel, k] of [[".inv-dress", "13-dress"], [".inv-deck", "14-deck"], [".inv-faq", "15-faq"], ["#rsvp", "16-rsvp"], [".inv-closing", "17-closing"]]) {
    if (!(await p.locator(sel).count())) continue;
    await p.locator(sel).scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -120)); await p.waitForTimeout(1300); await shot(t, k);
  }
}
if (errors.length) console.log("Browser errors:\n" + errors.join("\n"));
await b.close();
