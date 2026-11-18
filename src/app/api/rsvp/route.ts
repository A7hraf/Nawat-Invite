import { ipHash } from "@/server/crypto";
import { rateLimit } from "@/server/ratelimit";
import { assertSameOrigin, HttpError, ipFromForwarded, jsonError } from "@/server/request";
import { RsvpInputSchema, submitRsvp } from "@/server/services/rsvp";

/** Guest replies. Public, so: same-origin only, size-limited, validated and rate-limited. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = ipFromForwarded(req.headers.get("x-forwarded-for"), req.headers.get("x-real-ip"));
    const raw = await req.text();
    if (raw.length > 8_000) throw new HttpError(413, "Request too large");
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new HttpError(400, "Invalid request"); }
    const parsed = RsvpInputSchema.safeParse(json);
    if (!parsed.success) throw new HttpError(422, parsed.error.issues[0]?.message ?? "Invalid request");
    const who = ipHash(ip) ?? "unknown";
    if (!(await rateLimit(`rsvp:ip:${who}`, 30, 3600)) || !(await rateLimit(`rsvp:link:${parsed.data.slug}:${parsed.data.guestKey ?? who}`, 10, 3600))) {
      throw new HttpError(429, "Too many replies. Please try again later.");
    }
    const result = await submitRsvp(parsed.data, ip);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return jsonError(e);
  }
}
