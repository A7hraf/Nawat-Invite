import "server-only";
import { z } from "zod";
import { canOperateGate, type UserCtx } from "./auth/context";
import { getSession, isStaffRole } from "./auth/session";
import { HttpError } from "./request";

/** Session + gate permission for an event, for the scanner's JSON endpoints. */
export async function gateCtx(eventId: unknown): Promise<{ ctx: UserCtx; eventId: string }> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in again");
  const needsMfa = isStaffRole(s.user.role) || s.user.totpEnabled;
  if (needsMfa && !s.session.mfaPassed) throw new HttpError(401, "Please sign in again");
  const id = z.string().uuid().safeParse(eventId);
  if (!id.success) throw new HttpError(400, "Unknown event");
  const ctx: UserCtx = { user: s.user, session: s.session, isStaff: isStaffRole(s.user.role) };
  if (!(await canOperateGate(ctx, id.data))) throw new HttpError(403, "You cannot operate this entrance");
  return { ctx, eventId: id.data };
}
