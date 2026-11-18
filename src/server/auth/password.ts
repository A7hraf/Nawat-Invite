import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

// OWASP-recommended argon2id parameters.
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export const hashPassword = (plain: string) => hash(plain, OPTS);

export async function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  try { return await verify(hashValue, plain); } catch { return false; }
}

const COMMON = new Set(["password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "iloveyou", "admin123", "welcome1", "muscat123", "oman1234", "nawat123"]);

export const NewPasswordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Use at most 128 characters")
  .refine((p) => !COMMON.has(p.toLowerCase()), "This password is too common")
  .refine((p) => /[A-Za-z]/.test(p) && /[0-9]/.test(p), "Mix letters and numbers");

/** A constant hash used to keep login timing equal for unknown usernames. */
let dummy: string | null = null;
export async function dummyVerify(plain: string) {
  dummy ??= await hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(dummy, plain);
}
