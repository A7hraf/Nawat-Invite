import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers for every response, with a per-request CSP nonce
 * (Next.js applies the nonce to its own scripts automatically).
 */
export function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const isGate = req.nextUrl.pathname.startsWith("/gate");
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Permissions-Policy", `camera=(${isGate ? "self" : ""}), microphone=(), geolocation=(), payment=()`);
  if (!dev) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // Private pages must never be cached by shared caches.
  if (!req.nextUrl.pathname.startsWith("/i/") && !req.nextUrl.pathname.startsWith("/media/")) res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)" }],
};
