import "server-only";
import { and, eq } from "drizzle-orm";
import type { MusicSource } from "@/components/invitation/music";
import { getDb, schema } from "./db";
import { mediaUrl } from "./storage";

/** Resolves a stored track id ("<libraryId>" or "asset:<id>") into something the browser can play. */
export async function resolveMusic(trackId: string | null, accountId: string): Promise<MusicSource> {
  if (!trackId) return null;
  const db = await getDb();
  if (trackId.startsWith("asset:")) {
    const a = await db.query.mediaAssets.findFirst({ where: and(eq(schema.mediaAssets.id, trackId.slice(6)), eq(schema.mediaAssets.accountId, accountId)) });
    return a ? { kind: "file", url: mediaUrl(a.id) } : null;
  }
  const t = await db.query.musicTracks.findFirst({ where: and(eq(schema.musicTracks.id, trackId), eq(schema.musicTracks.active, true)) });
  if (!t) return null;
  if (t.builtin) return { kind: "builtin", preset: t.builtin };
  return t.assetId ? { kind: "file", url: mediaUrl(t.assetId) } : null;
}

export const sourceOfTrack = (t: { builtin: string | null; assetId: string | null }): MusicSource =>
  t.builtin ? { kind: "builtin", preset: t.builtin } : t.assetId ? { kind: "file", url: mediaUrl(t.assetId) } : null;
