import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sum } from "drizzle-orm";
import { UserError } from "@/lib/errors";
import { getDb, schema } from "./db";
import { env } from "./env";

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_AUDIO = 10 * 1024 * 1024;

/** Identify a file by its first bytes, never by its name or the browser's claim. */
function sniff(buf: Buffer): { kind: "IMAGE" | "AUDIO"; mime: string; ext: string } | null {
  const h = buf.subarray(0, 12);
  if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return { kind: "IMAGE", mime: "image/jpeg", ext: "jpg" };
  if (h.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: "IMAGE", mime: "image/png", ext: "png" };
  if (h.subarray(0, 4).toString() === "RIFF" && h.subarray(8, 12).toString() === "WEBP") return { kind: "IMAGE", mime: "image/webp", ext: "webp" };
  if (h.subarray(4, 8).toString() === "ftyp") {
    const brand = h.subarray(8, 12).toString();
    if (/heic|heix|mif1/.test(brand)) return { kind: "IMAGE", mime: "image/heic", ext: "heic" };
    return { kind: "AUDIO", mime: "audio/mp4", ext: "m4a" };
  }
  if (h.subarray(0, 3).toString() === "ID3" || (h[0] === 0xff && ((h[1] ?? 0) & 0xe0) === 0xe0)) return { kind: "AUDIO", mime: "audio/mpeg", ext: "mp3" };
  return null;
}

const root = () => path.resolve(env().UPLOAD_DIR);

/** Bytes used by an account's uploads. */
export async function storageUsed(accountId: string) {
  const db = await getDb();
  const [r] = await db.select({ n: sum(schema.mediaAssets.sizeBytes) }).from(schema.mediaAssets).where(eq(schema.mediaAssets.accountId, accountId));
  return Number(r?.n ?? 0);
}

/**
 * Validates, sanitises and stores an upload.
 *  - images are decoded and re-encoded to WebP (strips EXIF/GPS, defeats polyglot files)
 *  - audio must be real MP3/M4A
 */
export async function saveUpload(file: File, expect: "IMAGE" | "AUDIO", accountId: string | null, quotaMb?: number) {
  if (!(file instanceof File) || file.size === 0) throw new UserError("Choose a file to upload");
  const limit = expect === "IMAGE" ? MAX_IMAGE : MAX_AUDIO;
  if (file.size > limit) throw new UserError(`The file is too large (max ${limit / 1024 / 1024} MB)`);
  if (accountId && quotaMb !== undefined && (await storageUsed(accountId)) + file.size > quotaMb * 1024 * 1024) {
    throw new UserError("Your storage is full. Remove a file or ask Nawat for more space.");
  }
  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || type.kind !== expect) throw new UserError(expect === "IMAGE" ? "Please upload a JPG, PNG, WebP or HEIC photo" : "Please upload an MP3 or M4A audio file");

  let mime = type.mime, ext = type.ext, width: number | null = null, height: number | null = null;
  if (expect === "IMAGE") {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf, { limitInputPixels: 50_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    buf = out.data; mime = "image/webp"; ext = "webp"; width = out.info.width; height = out.info.height;
  }
  const id = crypto.randomUUID();
  const key = `${accountId ?? "platform"}/${id}.${ext}`;
  const full = path.join(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Invalid storage path");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o640 });
  const db = await getDb();
  const [asset] = await db.insert(schema.mediaAssets).values({
    id, accountId, kind: expect, storageKey: key, mime, sizeBytes: buf.length, width, height, originalName: file.name.slice(0, 120),
  }).returning();
  return asset!;
}

export async function readAsset(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const asset = await db.query.mediaAssets.findFirst({ where: eq(schema.mediaAssets.id, id) });
  if (!asset) return null;
  const full = path.join(root(), asset.storageKey);
  if (!full.startsWith(root() + path.sep)) return null;
  try { return { asset, data: await readFile(full) }; } catch { return null; }
}

export async function deleteAsset(id: string, accountId: string | null) {
  const db = await getDb();
  const where = accountId ? and(eq(schema.mediaAssets.id, id), eq(schema.mediaAssets.accountId, accountId)) : and(eq(schema.mediaAssets.id, id), isNull(schema.mediaAssets.accountId));
  const [a] = await db.delete(schema.mediaAssets).where(where).returning();
  if (a) await unlink(path.join(root(), a.storageKey)).catch(() => undefined);
}

export const mediaUrl = (id: string) => `/media/${id}`;
