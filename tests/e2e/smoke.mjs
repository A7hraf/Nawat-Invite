/**
 * End-to-end smoke test of the main flows against a running server.
 *   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=… CHROMIUM_PATH=/usr/bin/google-chrome node tests/e2e/smoke.mjs
 * Screenshots are written to ./.data/e2e/.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { Secret, TOTP } from "otpauth";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "./.data/e2e";
mkdirSync(OUT, { recursive: true });
const NEW_ADMIN_PW = "Nawat-Admin-2026-secure";
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " · " + extra : ""}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/google-chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const desktop = { viewport: { width: 1440, height: 1000 } };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const errors = [];
const watch = (p, label) => { p.on("pageerror", (e) => errors.push(`${label}: ${e.message}`)); p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(`${label}: ${m.text()}`); }); };
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });

// ── 1. Admin first sign-in: 2FA enrolment + password change
const adminCtx = await browser.newContext(desktop);
await adminCtx.route(/fonts\.g/, (r) => r.abort());
const a = await adminCtx.newPage(); watch(a, "admin");
await a.goto(`${BASE}/login`);
await shot(a, "01-login");
const signInAdmin = async (pw) => { await a.fill("#username", "admin"); await a.fill("#password", pw); await a.click("button[type=submit]"); await a.waitForLoadState("networkidle"); };
await signInAdmin(process.env.ADMIN_PASSWORD ?? "Admin-Pass-2026");
if (a.url().includes("/login")) await signInAdmin(NEW_ADMIN_PW); // already set up by an earlier run
await a.waitForURL(/two-factor/);
let secret;
if (!a.url().includes("/setup")) {
  const { readFileSync } = await import("node:fs");
  await a.fill("#code", new TOTP({ secret: Secret.fromBase32(readFileSync(`${OUT}/admin-totp-secret.txt`, "utf8").trim()) }).generate());
  await a.click("button[type=submit]");
} else {
  await shot(a, "02-2fa-setup");
  secret = (await a.locator("details code").textContent()).trim();
  writeFileSync(`${OUT}/admin-totp-secret.txt`, secret);
  const code = new TOTP({ secret: Secret.fromBase32(secret) }).generate();
  await a.fill("#code", code);
  await a.click("button[type=submit]");
  await a.waitForSelector("text=Recovery codes");
  ok("Admin 2FA enrolment", true);
  await a.click("text=Continue");
  await a.waitForURL(/change-password/);
  await a.fill("#current", process.env.ADMIN_PASSWORD ?? "Admin-Pass-2026");
  await a.fill("#next", NEW_ADMIN_PW); await a.fill("#confirm", NEW_ADMIN_PW);
  await a.click("button[type=submit]");
}
await a.waitForURL(/\/admin/);
ok("Admin reaches Control Room", a.url().endsWith("/admin"));
await shot(a, "03-admin-overview", true);

// ── 2. Clients, overrides, new client
await a.goto(`${BASE}/admin/clients`);
await shot(a, "04-admin-clients");
await a.click("text=Sara & Omar");
await a.waitForURL(/admin\/clients\/[0-9a-f-]{36}/);
const saraAdminUrl = a.url();
await a.fill('input[name="invitations.maxGuestPasses"]', "1200");
await a.click("text=Save features");
await a.waitForSelector("text=Features saved");
ok("Admin saves a per-client override", (await a.locator("text=1 override").count()) > 0);
await shot(a, "05-admin-client", true);

await a.goto(`${BASE}/admin/clients/new`);
await a.fill("#displayName", "Noor & Faisal");
const newUser = `noor.${Date.now().toString(36)}`;
await a.fill("#username", newUser);
await a.selectOption("#planId", { label: "Gilded · Atelier · 45 OMR" });
await a.click("text=Create account");
await a.waitForSelector("text=One-time password");
const noorPw = (await a.locator(".secret code").nth(1).textContent()).trim();
ok("Admin creates client with one-time password", /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/.test(noorPw), noorPw);
await shot(a, "06-admin-new-client");
for (const pth of ["/admin/plans", "/admin/themes", "/admin/music", "/admin/audit", "/admin/settings", "/admin/team"]) {
  const r = await a.goto(`${BASE}${pth}`); ok(`Admin page ${pth}`, r.status() === 200);
}
await shot(a, "07-admin-themes", true);

// ── 3. Manage as client → studio
await a.goto(saraAdminUrl);
await a.click("text=Manage as client");
await a.waitForURL(/\/studio$/);
ok("Manage as client opens the studio with banner", (await a.locator("text=You are managing").count()) > 0);
await shot(a, "08-studio-overview", true);
await a.click("text=Open");
await a.waitForURL(/studio\/events\/[0-9a-f-]{36}$/);
const eventUrl = a.url();
const eventId = eventUrl.split("/").pop();
await shot(a, "09-studio-event", true);
for (const tab of ["design", "content", "rsvp", "music", "photos", "entrance", "reports"]) {
  const r = await a.goto(`${eventUrl}/${tab}`); ok(`Studio tab ${tab}`, r.status() === 200);
  if (["rsvp", "content", "design"].includes(tab)) await shot(a, `10-studio-${tab}`, true);
}
await a.goto(`${eventUrl}/guests`);
await a.fill("#gname", "Salim Al Hinai & family"); await a.fill("#gphone", "93334455"); await a.fill("#gcomp", "2");
await a.click("text=Add guest");
await a.waitForSelector("text=Salim Al Hinai & family added");
ok("Studio adds a guest", true);
await shot(a, "11-studio-guests", true);
const wa = await a.locator('a[href^="https://wa.me/"]').last().getAttribute("href"); // the guest just added
const guestLink = decodeURIComponent(wa).match(/https?:\/\/[^\s]+\/i\/[^\s]+/)[0];
ok("WhatsApp link carries the personal invitation link", !!guestLink, guestLink);

// ── 4. Guest experience on a phone
const gctx = await browser.newContext(phone); await gctx.route(/fonts\.g/, (r) => r.abort());
const g = await gctx.newPage(); watch(g, "guest");
await g.goto(guestLink.replace(/^https?:\/\/[^/]+/, BASE));
await g.waitForTimeout(5000);
await shot(g, "20-guest-opening");
await g.mouse.click(195, 450);
await g.waitForTimeout(2200);
await shot(g, "21-guest-opening-mid");
await g.waitForSelector(".inv-hero", { timeout: 30000 });
await g.waitForTimeout(1500);
await shot(g, "22-guest-invitation");
await g.locator("#rsvp").scrollIntoViewIfNeeded();
await g.waitForTimeout(1200);
await g.locator(".stepper button").nth(1).click();
await g.locator(".ack input").first().check();
await g.click("button[type=submit]");
await g.waitForSelector(".inv-pass", { timeout: 15000 });
await g.waitForTimeout(800);
await shot(g, "23-guest-pass");
const passUrl = await g.locator(".inv-row2 a").nth(1).getAttribute("href");
ok("Guest RSVP issues a QR pass", /\/p\/[A-Za-z0-9]{24}$/.test(passUrl), passUrl);
await g.click(".inv-chip");
await g.waitForTimeout(800);
await shot(g, "24-guest-pass-arabic");
await g.goto(passUrl.replace(/^https?:\/\/[^/]+/, BASE));
await shot(g, "25-pass-page");
const ics = await g.request.get(`${BASE}/api/ics/${guestLink.split("/i/")[1].split("/")[0]}`);
ok("Calendar file", ics.ok() && (await ics.text()).includes("BEGIN:VEVENT"));

// ── 5. Entrance: verify and admit
await a.goto(`${BASE}/gate/${eventId}`);
await a.fill("#gq", passUrl);
await a.click("text=Check this pass link");
await a.waitForSelector("text=/Welcome · party of \\d/");
const party = (await a.locator("text=/Welcome · party of \\d/").textContent()).match(/\d+/)[0];
await a.click(`text=Admit ${party}`);
await a.waitForSelector(`text=${party} of ${party} inside`);
ok("Gate admits the party", true);
await a.click("text=Next guest");
await a.fill("#gq", passUrl);
await a.click("text=Check this pass link");
await a.waitForSelector("text=Already checked in");
ok("Gate blocks a second entry", true);
await shot(a, "30-gate-already");

// ── 6. Reports
const xlsx = await a.request.get(`${BASE}/api/reports/${eventId}?format=xlsx`);
ok("Excel report", xlsx.ok() && (xlsx.headers()["content-type"] ?? "").includes("spreadsheetml"), `${(await xlsx.body()).length} bytes`);
writeFileSync(`${OUT}/report.xlsx`, await xlsx.body());
const pdf = await a.request.get(`${BASE}/api/reports/${eventId}?format=pdf`);
ok("PDF report", pdf.ok() && (pdf.headers()["content-type"] ?? "").includes("pdf"), `${(await pdf.body()).length} bytes`);
writeFileSync(`${OUT}/report.pdf`, await pdf.body());
await a.click("text=Back").catch(() => undefined);
await a.goto(eventUrl);
await a.click("text=Return to Control Room");
await a.waitForURL(/admin\/clients/);
ok("Stop managing returns to the client", true);

// ── 7. A new self-service client builds an invitation
const n = await (await browser.newContext(desktop)).newPage(); watch(n, "client");
await n.goto(`${BASE}/login`);
await n.fill("#username", newUser); await n.fill("#password", noorPw);
await n.click("button[type=submit]");
await n.waitForURL(/change-password/);
await n.fill("#current", noorPw); await n.fill("#next", "Noor-Faisal-2026"); await n.fill("#confirm", "Noor-Faisal-2026");
await n.click("button[type=submit]");
await n.waitForURL(/\/studio$/);
await shot(n, "40-client-empty");
await n.click("text=Start now");
await n.fill("#p1en", "Noor"); await n.fill("#p2en", "Faisal"); await n.fill("#p1ar", "نور"); await n.fill("#p2ar", "فيصل");
await n.fill("#startsAt", "2027-01-14T19:30");
const locked = await n.locator('input[name="themeSlug"][disabled]').count();
ok("Royal themes are locked for a Gilded client", locked === 3, `${locked} locked`);
await n.check('input[value="bab-al-noor"]', { force: true });
await shot(n, "41-client-new", true);
await n.click("text=Create invitation");
await n.waitForURL(/\/content$/);
await n.fill('[name="venue.name.en"]', "Al Noor Hall"); await n.fill('[name="venue.name.ar"]', "قاعة النور");
await n.click("text=Save details");
await n.waitForSelector("text=Invitation details saved");
await n.goto(n.url().replace(/\/content$/, ""));
await n.click("text=Publish invitation");
await n.waitForSelector("text=Your invitation is live");
ok("Client publishes their invitation", true);
await shot(n, "42-client-published", true);

// ── 8. All ten themes
const themes = ["mocha-champagne", "vellum-garden", "muscat-sea", "bab-al-noor", "dana-pearl", "layali-celestial", "desert-rose", "majlis-velvet", "emerald-deco", "noir-monogram"];
const tp = await (await browser.newContext({ ...phone, storageState: await adminCtx.storageState() })).newPage(); watch(tp, "themes");
for (const t of themes) {
  await tp.goto(`${BASE}/preview/${t}`);
  await tp.waitForTimeout(4500);
  await shot(tp, `50-theme-${t}-a`);
  await tp.mouse.click(195, 450);
  await tp.waitForTimeout(2300);
  await shot(tp, `50-theme-${t}-b`);
  await tp.waitForSelector(".inv-hero", { timeout: 30000 }).catch(() => undefined);
  await tp.waitForTimeout(1200);
  await shot(tp, `50-theme-${t}-c`);
  ok(`Theme ${t} opens`, (await tp.locator(".inv-hero").count()) > 0);
}

ok("No browser errors", errors.length === 0, errors.slice(0, 5).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
