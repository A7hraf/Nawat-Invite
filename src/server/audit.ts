import "server-only";
import { getDb, schema } from "./db";
import { ipHash } from "./crypto";
import { clientIp } from "./request";

export type AuditActor = { id: string; name: string; actingAsAccountId?: string | null } | null;

/** Append-only audit trail. Never throws: auditing must not break the user's action. */
export async function audit(actor: AuditActor, action: string, entity: string, entityId?: string | null, meta: Record<string, unknown> = {}) {
  try {
    const db = await getDb();
    await db.insert(schema.auditLogs).values({
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actingAsAccountId: actor?.actingAsAccountId ?? null,
      action, entity, entityId: entityId ?? null, meta,
      ipHash: ipHash(await clientIp().catch(() => null)),
    });
  } catch (e) {
    console.error("audit failed", action, e);
  }
}
