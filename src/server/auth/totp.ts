import "server-only";
import { Secret, TOTP } from "otpauth";
import { encrypt, randomKey, sha256 } from "../crypto";

const make = (secretBase32: string, label = "account") =>
  new TOTP({ issuer: "Nawat Invites", label, algorithm: "SHA1", digits: 6, period: 30, secret: Secret.fromBase32(secretBase32) });

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export const totpUri = (secretBase32: string, label: string) => make(secretBase32, label).toString();

/**
 * Validates a 6-digit code (±1 step for clock drift).
 * Returns the time counter that matched so callers can refuse replays.
 */
export function checkTotp(secretBase32: string, code: string, lastCounter: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = make(secretBase32).validate({ token: code, window: 1 });
  if (delta === null) return null;
  const counter = Math.floor(Date.now() / 30_000) + delta;
  if (lastCounter !== null && counter <= lastCounter) return null; // replayed code
  return counter;
}

export function newRecoveryCodes(): { plain: string[]; hashes: string[] } {
  const plain = Array.from({ length: 10 }, () => `${randomKey(5)}-${randomKey(5)}`.toLowerCase());
  return { plain, hashes: plain.map((c) => sha256(c)) };
}

/** The pending secret travels in an encrypted, user-bound, 10-minute token (never via a server action). */
export const sealSetupToken = (userId: string, secret: string) => encrypt(JSON.stringify({ u: userId, s: secret, t: Date.now() }));
