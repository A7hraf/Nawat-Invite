import { z } from "zod";
import { audit } from "@/server/audit";
import { gateCtx } from "@/server/gate-api";
import { rateLimit } from "@/server/ratelimit";
import { assertSameOrigin, HttpError, jsonError } from "@/server/request";
import { admit, searchAttendees, verifyPass } from "@/server/services/gate";
import { eventStats } from "@/server/repo/events";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("verify"), eventId: z.string(), code: z.string().max(300) }),
  z.object({ op: z.literal("admit"), eventId: z.string(), passId: z.string().uuid(), count: z.number().int().min(1).max(50) }),
  z.object({ op: z.literal("search"), eventId: z.string(), q: z.string().max(60) }),
  z.object({ op: z.literal("stats"), eventId: z.string() }),
]);

/** Scanner endpoint: verify a QR, admit people, look someone up, or read live numbers. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request");
    const b = parsed.data;
    const { ctx, eventId } = await gateCtx(b.eventId);
    if (!(await rateLimit(`gate:${ctx.user.id}`, 600, 600))) throw new HttpError(429, "Slow down a little");
    switch (b.op) {
      case "verify": {
        const v = await verifyPass(eventId, b.code);
        return Response.json(v ? { pass: v } : { invalid: true });
      }
      case "admit": {
        const v = await admit(eventId, b.passId, b.count, ctx.user.id);
        await audit({ id: ctx.user.id, name: ctx.user.displayName }, "gate.admit", "event", eventId, { passId: b.passId, count: b.count });
        return Response.json({ pass: v, stats: await eventStats(eventId) });
      }
      case "search": return Response.json({ results: await searchAttendees(eventId, b.q) });
      case "stats": return Response.json({ stats: await eventStats(eventId) });
    }
  } catch (e) {
    return jsonError(e);
  }
}
