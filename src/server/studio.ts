import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserError } from "@/lib/errors";
import { actorOf, assertWritable, requireStudio } from "./auth/context";
import { getEvent } from "./repo/events";

/** Loads an event of the current studio account, or 404. Used by pages. */
export async function studioEvent(eventId: string) {
  const ctx = await requireStudio();
  if (!z.string().uuid().safeParse(eventId).success) notFound();
  const ev = await getEvent(ctx.account.id, eventId);
  if (!ev) notFound();
  return { ctx, ev, actor: actorOf(ctx) };
}

/** Same, for mutations: also refuses read-only (Concierge) studios. */
export async function writableEvent(eventId: string) {
  const ctx = await requireStudio();
  assertWritable(ctx);
  if (!z.string().uuid().safeParse(eventId).success) throw new UserError("Unknown invitation");
  const ev = await getEvent(ctx.account.id, eventId);
  if (!ev) throw new UserError("Unknown invitation");
  return { ctx, ev, actor: actorOf(ctx) };
}
