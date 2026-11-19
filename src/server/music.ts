import "server-only";
import { and, eq } from "drizzle-orm";
import type { MusicSource } from "@/components/invitation/music";
import { getDb, schema } from "./db";
import { mediaUrl } from "./storage";
import { LIBRARY_PREFIX, libraryUrl } from "@/lib/music-library";

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
  return sourceOfTrack(t);
}

/** library:<slug> → bundled licensed file; other builtin → synthesised preset; else uploaded asset. */
export const sourceOfTrack = (t: { builtin: string | null; assetId: string | null }): MusicSource =>
  t.builtin?.startsWith(LIBRARY_PREFIX) ? { kind: "file", url: libraryUrl(t.builtin.slice(LIBRARY_PREFIX.length)) }
    : t.builtin ? { kind: "builtin", preset: t.builtin }
      : t.assetId ? { kind: "file", url: mediaUrl(t.assetId) } : null;
