import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * Key material is derived from APP_SECRET with HKDF so that encryption and
 * lookup-hashing never share a key.
 */
let keys: { enc: Buffer; mac: Buffer } | null = null;
function k() {
  if (keys) return keys;
  const secret = Buffer.from(env().APP_SECRET, "utf8");
  keys = {
    enc: Buffer.from(hkdfSync("sha256", secret, "nawat-invites", "enc-v1", 32)),
    mac: Buffer.from(hkdfSync("sha256", secret, "nawat-invites", "mac-v1", 32)),
  };
  return keys;
}

/** AES-256-GCM. Output: "v1." + base64url(iv | tag | ciphertext). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k().enc, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1." + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url");
}

export function decrypt(token: string): string {
  if (!token.startsWith("v1.")) throw new Error("Unsupported ciphertext version");
  const raw = Buffer.from(token.slice(3), "base64url");
  const d = createDecipheriv("aes-256-gcm", k().enc, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

export const decryptOrNull = (t: string | null | undefined) => {
  if (!t) return null;
  try { return decrypt(t); } catch { return null; }
};

/** Keyed hash for looking up secrets (guest keys) without storing them in clear. */
export const lookupHash = (value: string) => createHmac("sha256", k().mac).update(value).digest("hex");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Hash of an IP for abuse prevention: we never store raw IPs. */
export const ipHash = (ip: string | null | undefined) => (ip ? lookupHash("ip:" + ip).slice(0, 32) : null);

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const BASE62 = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no 0/O/1/l/I
export function randomKey(length = 22, alphabet = BASE62): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

/** Human-friendly one-time password, e.g. "Kq7m-Vx2P-e9wR". ~70 bits of entropy. */
export function oneTimePassword(): string {
  const p = randomKey(12);
  return `${p.slice(0, 4)}-${p.slice(4, 8)}-${p.slice(8, 12)}`;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
