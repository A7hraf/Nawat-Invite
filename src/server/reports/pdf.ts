import "server-only";
import { existsSync } from "node:fs";
import { UserError } from "@/lib/errors";
import { env } from "../env";

const CANDIDATES = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"];

/**
 * Renders HTML to an A4 PDF with headless Chromium. Chromium shapes Arabic text correctly,
 * which most PDF libraries do not. JavaScript is disabled while rendering.
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const exe = env().CHROMIUM_PATH ?? CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new UserError("PDF export is not available on this server yet (Chromium is missing). Use Excel or the printable view.");
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20_000 }).catch(() => page.setContent(html, { waitUntil: "load" }));
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}
