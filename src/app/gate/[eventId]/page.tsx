import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { canOperateGate, requireUser } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { eventStats } from "@/server/repo/events";
import { Scanner } from "./scanner";

export const metadata = { title: "Scanner" };

export default async function GatePage({ params }: { params: Promise<{ eventId: string }> }) {
  const c = await requireUser();
  const { eventId } = await params;
  if (!z.string().uuid().safeParse(eventId).success) notFound();
  if (!(await canOperateGate(c, eventId))) redirect("/");
  const db = await getDb();
  const ev = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!ev) notFound();
  const s = await eventStats(ev.id);
  return <Scanner eventId={ev.id} title={ev.title} initial={{ arrived: s.arrived, expected: s.expected }} backHref={c.user.role === "GATEKEEPER" ? "/gate" : `/studio/events/${ev.id}/entrance`} />;
}
