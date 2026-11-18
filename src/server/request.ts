import "server-only";
import { headers } from "next/headers";

/** Client IP as seen by the reverse proxy (Caddy sets X-Forwarded-For). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}

/** Same-origin check for mutating route handlers (server actions are checked by Next itself). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "Missing origin");
  if (new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function jsonError(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
